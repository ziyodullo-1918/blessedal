DO $migration$
DECLARE t text; pol record; f record;
BEGIN
  FOREACH t IN ARRAY ARRAY['app_settings','factory_department_heads','factory_orders','factory_payroll_periods','factory_payroll_snapshots','factory_products','factory_stage_events','factory_stages','factory_workers','finished_inventory','inventory_materials','inventory_movements','laser_daily_attendance','laser_daily_rates','packaging_box_entries','packaging_piece_rates','product_formulas','pullers_app_settings','pullers_categories','pullers_periods','pullers_products','pullers_work_entries','pullers_workers','salary_rates'] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN account_id uuid DEFAULT auth.uid()',t);
    EXECUTE format('CREATE INDEX %I ON public.%I(account_id)',t||'_account_idx',t);
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I',pol.policyname,t);
    END LOOP;
    EXECUTE format('CREATE POLICY account_owned ON public.%I FOR ALL TO authenticated USING(account_id=auth.uid()) WITH CHECK(account_id=auth.uid())',t);
    EXECUTE format('COMMENT ON COLUMN public.%I.account_id IS %L',t,'NULL legacy ownership is intentionally quarantined until its account is verified.');
  END LOOP;
  UPDATE public.factory_orders SET account_id=created_by WHERE created_by IS NOT NULL;
  UPDATE public.factory_stages s SET account_id=o.account_id FROM public.factory_orders o WHERE o.id=s.order_id;
  UPDATE public.factory_stage_events e SET account_id=o.account_id FROM public.factory_orders o WHERE o.id=e.order_id;
  FOR f IN SELECT proc.oid::regprocedure AS signature FROM pg_proc proc JOIN pg_namespace n ON n.oid=proc.pronamespace
    WHERE n.nspname='public' AND proc.prosecdef AND proc.prorettype<>'trigger'::regtype
      AND proc.proname NOT IN ('has_role','pullers_worker_login','pullers_worker_logout','pullers_worker_session_check','pullers_get_my_entries','pullers_get_my_periods','pullers_delete_my_entry','pullers_update_my_entry','pullers_submit_work_entry','packaging_worker_login','packaging_worker_logout','packaging_worker_session_check','packaging_worker_tasks','packaging_worker_today','packaging_worker_pack') LOOP
    EXECUTE format('ALTER FUNCTION %s SECURITY INVOKER',f.signature);
  END LOOP;
END $migration$;
DROP POLICY IF EXISTS user_roles_auth_all ON public.user_roles;
CREATE POLICY own_role_read ON public.user_roles FOR SELECT TO authenticated USING(user_id=auth.uid());
REVOKE INSERT,UPDATE,DELETE ON public.user_roles FROM authenticated,anon;
GRANT SELECT ON public.user_roles TO authenticated;
CREATE OR REPLACE FUNCTION public.enforce_record_account_links() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $fn$
DECLARE owner_id uuid; parent_owner uuid; link record; value_id text; parent_column text; row_data jsonb:=to_jsonb(NEW);
BEGIN
  owner_id:=COALESCE((row_data->>'account_id')::uuid,(row_data->>'user_id')::uuid);
  IF TG_TABLE_NAME='factory_department_heads' THEN owner_id:=(row_data->>'account_id')::uuid; END IF;
  IF owner_id IS NULL THEN RAISE EXCEPTION 'account_owner_required'; END IF;
  FOR link IN SELECT c.confrelid,c.confkey[1] AS parent_att,a.attname AS child_column,cl.relname AS parent_table
    FROM pg_constraint c JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=c.conkey[1]
    JOIN pg_class cl ON cl.oid=c.confrelid JOIN pg_namespace n ON n.oid=cl.relnamespace
    WHERE c.contype='f' AND c.conrelid=TG_RELID AND n.nspname='public' AND array_length(c.conkey,1)=1 LOOP
    value_id:=row_data->>link.child_column;
    IF value_id IS NULL THEN CONTINUE; END IF;
    SELECT attname INTO parent_column FROM pg_attribute WHERE attrelid=link.confrelid AND attnum=link.parent_att;
    IF EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=link.confrelid AND attname='account_id' AND NOT attisdropped) THEN
      EXECUTE format('SELECT account_id FROM public.%I WHERE %I::text=$1',link.parent_table,parent_column) INTO parent_owner USING value_id;
    ELSIF EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=link.confrelid AND attname='user_id' AND NOT attisdropped) THEN
      EXECUTE format('SELECT user_id FROM public.%I WHERE %I::text=$1',link.parent_table,parent_column) INTO parent_owner USING value_id;
    ELSE CONTINUE; END IF;
    IF parent_owner IS DISTINCT FROM owner_id THEN RAISE EXCEPTION 'cross_account_reference_denied'; END IF;
  END LOOP;
  RETURN NEW;
END $fn$;
DO $migration$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['assignments','attendance','fines','products','factory_department_heads','factory_orders','factory_payroll_periods','factory_payroll_snapshots','factory_products','factory_stage_events','factory_stages','factory_workers','finished_inventory','inventory_materials','inventory_movements','laser_daily_attendance','laser_daily_rates','packaging_box_entries','packaging_piece_rates','product_formulas','pullers_app_settings','pullers_categories','pullers_periods','pullers_products','pullers_work_entries','pullers_workers','salary_rates','app_settings'] LOOP
    EXECUTE format('CREATE TRIGGER enforce_account_links BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.enforce_record_account_links()',t);
  END LOOP;
END $migration$;