
CREATE OR REPLACE FUNCTION public.close_period_and_rollover(
  _period_id uuid,
  _new_label text,
  _new_start date DEFAULT NULL,
  _close_date date DEFAULT NULL
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid := auth.uid();
  _exists boolean;
  _new_start_d date;
  _new_end_d date;
  _new_id uuid;
  _close_at timestamptz;
BEGIN
  SELECT TRUE INTO _exists
  FROM public.payroll_periods
  WHERE id = _period_id AND user_id = _user_id;

  IF NOT _exists THEN
    RAISE EXCEPTION 'Period not found or access denied';
  END IF;

  -- Set close date (default: now)
  IF _close_date IS NOT NULL THEN
    _close_at := (_close_date::timestamp + interval '23 hours 59 minutes') AT TIME ZONE 'UTC';
    UPDATE public.payroll_periods
    SET closed_at = _close_at, end_date = _close_date
    WHERE id = _period_id AND user_id = _user_id;
  ELSE
    _close_at := now();
    UPDATE public.payroll_periods
    SET closed_at = _close_at, end_date = CURRENT_DATE
    WHERE id = _period_id AND user_id = _user_id;
  END IF;

  -- New period
  _new_start_d := COALESCE(_new_start, COALESCE(_close_date, CURRENT_DATE) + INTERVAL '1 day');
  _new_end_d := _new_start_d + INTERVAL '29 days';

  INSERT INTO public.payroll_periods (user_id, label, start_date, end_date)
  VALUES (_user_id, _new_label, _new_start_d, _new_end_d)
  RETURNING id INTO _new_id;

  -- Move in-progress assignments to new period
  UPDATE public.assignments
  SET period_id = _new_id
  WHERE user_id = _user_id
    AND period_id = _period_id
    AND status = 'in_progress';

  RETURN _new_id;
END;
$function$;
