CREATE OR REPLACE FUNCTION public.current_record_account() RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $fn$
DECLARE headers jsonb; tok uuid; owner_id uuid;
BEGIN
  IF auth.uid() IS NOT NULL THEN RETURN auth.uid(); END IF;
  BEGIN
    headers:=NULLIF(current_setting('request.headers',true),'')::jsonb;
    tok:=NULLIF(headers->>'x-worker-session','')::uuid;
  EXCEPTION WHEN OTHERS THEN RETURN NULL; END;
  SELECT w.account_id INTO owner_id FROM public.pullers_worker_sessions s JOIN public.pullers_workers w ON w.id=s.worker_id WHERE s.token=tok AND s.expires_at>now();
  RETURN owner_id;
END $fn$;
REVOKE ALL ON FUNCTION public.current_record_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_record_account() TO anon,authenticated,service_role;
DO $migration$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['pullers_products','pullers_categories','pullers_periods'] LOOP
    EXECUTE format('CREATE POLICY worker_catalog_read ON public.%I FOR SELECT TO anon USING(account_id=public.current_record_account())',t);
  END LOOP;
END $migration$;
-- Validate the token's owning account before entering worker routines; all inner reads use RLS.
CREATE OR REPLACE FUNCTION public.pullers_worker_session_check(_token uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $fn$
DECLARE wid uuid; owner_id uuid;
BEGIN
 SELECT s.worker_id,w.account_id INTO wid,owner_id FROM public.pullers_worker_sessions s JOIN public.pullers_workers w ON w.id=s.worker_id WHERE s.token=_token AND s.expires_at>now();
 IF wid IS NULL OR owner_id IS NULL OR (auth.uid() IS NOT NULL AND auth.uid()<>owner_id) THEN RAISE EXCEPTION 'invalid_session'; END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
 RETURN wid;
END $fn$;
CREATE OR REPLACE FUNCTION public.packaging_worker_session_check(_token uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $fn$
DECLARE wid uuid; owner_id uuid;
BEGIN
 SELECT s.worker_id,w.account_id INTO wid,owner_id FROM public.packaging_worker_sessions s JOIN public.factory_workers w ON w.id=s.worker_id WHERE s.token=_token AND s.expires_at>now();
 IF wid IS NULL OR owner_id IS NULL OR (auth.uid() IS NOT NULL AND auth.uid()<>owner_id) THEN RAISE EXCEPTION 'invalid_session'; END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
 RETURN wid;
END $fn$;
DO $migration$
DECLARE f record;
BEGIN
 FOR f IN SELECT proc.oid::regprocedure AS signature FROM pg_proc proc JOIN pg_namespace n ON n.oid=proc.pronamespace WHERE n.nspname='public' AND proc.proname IN ('pullers_get_my_entries','pullers_get_my_periods','pullers_delete_my_entry','pullers_update_my_entry','pullers_submit_work_entry','packaging_worker_tasks','packaging_worker_today','packaging_worker_pack') LOOP
   EXECUTE format('ALTER FUNCTION %s SECURITY INVOKER',f.signature);
 END LOOP;
END $migration$;
-- Anonymous token routines receive only the rows from their validated session account.
DO $migration$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['pullers_products','pullers_categories','pullers_periods','pullers_work_entries','factory_orders','factory_stages','factory_stage_events','factory_workers','finished_inventory','packaging_piece_rates'] LOOP
   EXECUTE format('CREATE POLICY token_account_read ON public.%I FOR SELECT TO anon USING(account_id=auth.uid())',t);
   EXECUTE format('GRANT SELECT ON public.%I TO anon',t);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['pullers_work_entries','factory_stages','factory_stage_events','finished_inventory'] LOOP
   EXECUTE format('CREATE POLICY token_account_write ON public.%I FOR ALL TO anon USING(account_id=auth.uid()) WITH CHECK(account_id=auth.uid())',t);
   EXECUTE format('GRANT INSERT,UPDATE,DELETE ON public.%I TO anon',t);
 END LOOP;
END $migration$;