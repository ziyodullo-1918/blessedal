
-- ===== Laser daily-wage tables =====
CREATE TABLE public.laser_daily_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NULL, -- null = default for all
  rate_per_day numeric NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  effective_from date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.laser_daily_rates TO authenticated;
GRANT ALL ON public.laser_daily_rates TO service_role;
ALTER TABLE public.laser_daily_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY laser_rates_auth ON public.laser_daily_rates FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TABLE public.laser_daily_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL,
  work_date date NOT NULL DEFAULT current_date,
  daily_rate numeric NOT NULL DEFAULT 0,
  note text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(worker_id, work_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.laser_daily_attendance TO authenticated;
GRANT ALL ON public.laser_daily_attendance TO service_role;
ALTER TABLE public.laser_daily_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY laser_attend_auth ON public.laser_daily_attendance FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ===== Packaging piece-rate tables =====
CREATE TABLE public.packaging_piece_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name text NULL, -- null = default
  rate_per_unit numeric NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.packaging_piece_rates TO authenticated;
GRANT ALL ON public.packaging_piece_rates TO service_role;
ALTER TABLE public.packaging_piece_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY pack_rates_auth ON public.packaging_piece_rates FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ===== Packaging worker sessions (Tortuv-like) =====
CREATE TABLE public.packaging_worker_sessions (
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '12 hours'),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.packaging_worker_sessions TO service_role;
ALTER TABLE public.packaging_worker_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY pkg_sessions_no_select ON public.packaging_worker_sessions FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY pkg_sessions_no_insert ON public.packaging_worker_sessions FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY pkg_sessions_no_update ON public.packaging_worker_sessions FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY pkg_sessions_no_delete ON public.packaging_worker_sessions FOR DELETE TO anon, authenticated USING (false);

-- ===== RPCs =====
-- Laser attendance upsert
CREATE OR REPLACE FUNCTION public.laser_record_attendance(_worker_id uuid, _work_date date, _rate numeric, _note text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO public.laser_daily_attendance(worker_id, work_date, daily_rate, note)
    VALUES (_worker_id, COALESCE(_work_date, current_date), COALESCE(_rate, 0), _note)
    ON CONFLICT (worker_id, work_date)
    DO UPDATE SET daily_rate = EXCLUDED.daily_rate, note = EXCLUDED.note
    RETURNING id INTO _id;
  RETURN _id;
END $$;

-- Laser salary report
CREATE OR REPLACE FUNCTION public.laser_salary_report(_from date, _to date)
RETURNS TABLE(worker_id uuid, worker_name text, total_days bigint, total_amount numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.worker_id, w.full_name, COUNT(*)::bigint, SUM(a.daily_rate)::numeric
  FROM public.laser_daily_attendance a
  LEFT JOIN public.factory_workers w ON w.id = a.worker_id
  WHERE a.work_date BETWEEN _from AND _to
  GROUP BY a.worker_id, w.full_name
  ORDER BY SUM(a.daily_rate) DESC NULLS LAST;
$$;

-- Packaging salary report (uses packaging_piece_rates instead of salary_rates)
CREATE OR REPLACE FUNCTION public.packaging_salary_report(_from date, _to date)
RETURNS TABLE(worker_id uuid, worker_name text, total_units bigint, total_amount numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH ev AS (
    SELECT e.worker_id, o.product_name, e.quantity
    FROM public.factory_stage_events e
    JOIN public.factory_stages s ON s.id = e.stage_id
    JOIN public.factory_orders o ON o.id = e.order_id
    WHERE e.event_type = 'progress'
      AND s.department = 'packaging'
      AND e.worker_id IS NOT NULL
      AND e.created_at::date BETWEEN _from AND _to
      AND e.quantity > 0
  ),
  rated AS (
    SELECT ev.worker_id, ev.quantity,
      COALESCE(
        (SELECT rate_per_unit FROM public.packaging_piece_rates r WHERE r.product_name = ev.product_name AND r.active LIMIT 1),
        (SELECT rate_per_unit FROM public.packaging_piece_rates r WHERE r.product_name IS NULL AND r.active LIMIT 1),
        0
      ) AS rate
    FROM ev
  )
  SELECT r.worker_id, w.full_name, SUM(r.quantity)::bigint, SUM(r.quantity * r.rate)::numeric
  FROM rated r LEFT JOIN public.factory_workers w ON w.id = r.worker_id
  GROUP BY r.worker_id, w.full_name
  ORDER BY SUM(r.quantity * r.rate) DESC NULLS LAST;
$$;

-- Packaging worker login (uses sha256 hex of pin, matching client-side sha256 in data.ts)
CREATE OR REPLACE FUNCTION public.packaging_worker_login(_code text, _pin_hash text)
RETURNS TABLE(id uuid, worker_code text, full_name text, session_token uuid, expires_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _w_id uuid; _w_code text; _w_name text; _tok uuid; _exp timestamptz;
BEGIN
  SELECT w.id, w.worker_code, w.full_name INTO _w_id, _w_code, _w_name
  FROM public.factory_workers w
  WHERE w.worker_code = _code AND w.active = true AND w.department = 'packaging' AND w.pin_hash = _pin_hash;
  IF _w_id IS NULL THEN RETURN; END IF;
  DELETE FROM public.packaging_worker_sessions WHERE expires_at < now();
  INSERT INTO public.packaging_worker_sessions(worker_id) VALUES (_w_id)
    RETURNING token, packaging_worker_sessions.expires_at INTO _tok, _exp;
  RETURN QUERY SELECT _w_id, _w_code, _w_name, _tok, _exp;
END $$;

CREATE OR REPLACE FUNCTION public.packaging_worker_session_check(_token uuid)
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _wid uuid;
BEGIN
  SELECT worker_id INTO _wid FROM public.packaging_worker_sessions WHERE token = _token AND expires_at > now();
  IF _wid IS NULL THEN RAISE EXCEPTION 'invalid_session'; END IF;
  RETURN _wid;
END $$;

CREATE OR REPLACE FUNCTION public.packaging_worker_logout(_token uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.packaging_worker_sessions WHERE token = _token;
$$;

-- Packaging worker: get assigned tasks
CREATE OR REPLACE FUNCTION public.packaging_worker_tasks(_token uuid)
RETURNS TABLE(stage_id uuid, order_id uuid, order_number text, product_name text, color text, planned int, completed int, rejected int, status factory_stage_status)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _wid uuid := public.packaging_worker_session_check(_token);
BEGIN
  RETURN QUERY
    SELECT s.id, s.order_id, o.order_number, o.product_name, o.color,
           s.planned_quantity, s.completed_quantity, s.rejected_quantity, s.status
    FROM public.factory_stages s
    JOIN public.factory_orders o ON o.id = s.order_id
    WHERE s.department = 'packaging' AND s.status <> 'completed'
    ORDER BY o.priority DESC, s.updated_at DESC;
END $$;

-- Packaging worker: submit packed quantity
CREATE OR REPLACE FUNCTION public.packaging_worker_pack(_token uuid, _stage_id uuid, _quantity int, _damaged int DEFAULT 0, _note text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _wid uuid := public.packaging_worker_session_check(_token); _inv uuid;
BEGIN
  _inv := public.factory_finalize_packaging(_stage_id, _quantity, COALESCE(_damaged,0), _wid, _note);
  RETURN _inv;
END $$;

-- Packaging worker: today's earnings
CREATE OR REPLACE FUNCTION public.packaging_worker_today(_token uuid)
RETURNS TABLE(total_units bigint, total_amount numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _wid uuid := public.packaging_worker_session_check(_token);
BEGIN
  RETURN QUERY
    WITH ev AS (
      SELECT o.product_name, e.quantity
      FROM public.factory_stage_events e
      JOIN public.factory_stages s ON s.id = e.stage_id
      JOIN public.factory_orders o ON o.id = e.order_id
      WHERE e.event_type='progress' AND s.department='packaging'
        AND e.worker_id = _wid AND e.created_at::date = current_date AND e.quantity > 0
    )
    SELECT COALESCE(SUM(ev.quantity),0)::bigint,
           COALESCE(SUM(ev.quantity * COALESCE(
             (SELECT rate_per_unit FROM public.packaging_piece_rates r WHERE r.product_name=ev.product_name AND r.active LIMIT 1),
             (SELECT rate_per_unit FROM public.packaging_piece_rates r WHERE r.product_name IS NULL AND r.active LIMIT 1),
             0)),0)::numeric
    FROM ev;
END $$;
