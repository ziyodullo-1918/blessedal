CREATE OR REPLACE FUNCTION public.pullers_get_my_periods(_token uuid)
RETURNS TABLE(id uuid, name text, start_date date, end_date date, status text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _wid uuid := public.pullers_worker_session_check(_token);
BEGIN
  RETURN QUERY
    SELECT p.id, p.name, p.start_date, p.end_date, p.status
    FROM public.pullers_periods p ORDER BY p.start_date DESC;
END; $$;

GRANT EXECUTE ON FUNCTION public.pullers_get_my_periods(uuid) TO anon, authenticated;