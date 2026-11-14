CREATE OR REPLACE FUNCTION public.pullers_worker_login(_code text,_pin text) RETURNS TABLE(id uuid,worker_code text,name text,session_token uuid,expires_at timestamptz) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $fn$
DECLARE wid uuid; code text; worker_name text; tok uuid; exp timestamptz;
BEGIN
 SELECT w.id,w.worker_code,w.name INTO wid,code,worker_name FROM public.pullers_workers w WHERE w.worker_code=_code AND w.active AND w.account_id IS NOT NULL AND (auth.uid() IS NULL OR auth.uid()=w.account_id) AND w.pin_hash=crypt(_pin,w.pin_hash);
 IF wid IS NULL THEN RETURN; END IF;
 INSERT INTO public.pullers_worker_sessions(worker_id) VALUES(wid) RETURNING token,pullers_worker_sessions.expires_at INTO tok,exp;
 RETURN QUERY SELECT wid,code,worker_name,tok,exp;
END $fn$;
CREATE OR REPLACE FUNCTION public.packaging_worker_login(_code text,_pin_hash text) RETURNS TABLE(id uuid,worker_code text,full_name text,session_token uuid,expires_at timestamptz) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $fn$
DECLARE wid uuid; code text; worker_name text; tok uuid; exp timestamptz;
BEGIN
 SELECT w.id,w.worker_code,w.full_name INTO wid,code,worker_name FROM public.factory_workers w WHERE w.worker_code=_code AND w.active AND w.department='packaging' AND w.account_id IS NOT NULL AND (auth.uid() IS NULL OR auth.uid()=w.account_id) AND w.pin_hash=_pin_hash;
 IF wid IS NULL THEN RETURN; END IF;
 INSERT INTO public.packaging_worker_sessions(worker_id) VALUES(wid) RETURNING token,packaging_worker_sessions.expires_at INTO tok,exp;
 RETURN QUERY SELECT wid,code,worker_name,tok,exp;
END $fn$;
-- A worker token may execute production reporting, but these routines still obey account RLS.
GRANT EXECUTE ON FUNCTION public.factory_finalize_packaging(uuid,integer,integer,uuid,text) TO anon;
GRANT EXECUTE ON FUNCTION public.factory_report_stage_progress(uuid,integer,integer,uuid,text) TO anon;
GRANT EXECUTE ON FUNCTION public.enforce_record_account_links() TO service_role;