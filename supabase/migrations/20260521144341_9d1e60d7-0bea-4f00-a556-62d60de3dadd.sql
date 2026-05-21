
-- Finished product warehouse
CREATE TABLE public.finished_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.factory_orders(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  color text,
  size text,
  quantity integer NOT NULL DEFAULT 0,
  damaged_quantity integer NOT NULL DEFAULT 0,
  packaged_at timestamptz NOT NULL DEFAULT now(),
  packaged_by uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX finished_inventory_order_idx ON public.finished_inventory(order_id);
ALTER TABLE public.finished_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY finished_inv_auth ON public.finished_inventory
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Salary rates (piece-rate per department, optionally per product)
CREATE TABLE public.salary_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department factory_department NOT NULL,
  product_name text,
  rate_per_unit numeric NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX salary_rates_dept_product_uidx
  ON public.salary_rates(department, COALESCE(product_name, ''));
ALTER TABLE public.salary_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY salary_rates_auth ON public.salary_rates
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE TRIGGER salary_rates_touch BEFORE UPDATE ON public.salary_rates
  FOR EACH ROW EXECUTE FUNCTION public.factory_touch_updated_at();

-- Factory-wide payroll periods
CREATE TABLE public.factory_payroll_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.factory_payroll_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY payroll_periods_auth ON public.factory_payroll_periods
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Frozen per-worker snapshot at period close
CREATE TABLE public.factory_payroll_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id uuid NOT NULL REFERENCES public.factory_payroll_periods(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL,
  worker_name text NOT NULL,
  department factory_department NOT NULL,
  total_units integer NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payroll_snap_period_idx ON public.factory_payroll_snapshots(period_id);
ALTER TABLE public.factory_payroll_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY payroll_snap_auth ON public.factory_payroll_snapshots
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Move packaged units into finished warehouse and progress packaging stage
CREATE OR REPLACE FUNCTION public.factory_finalize_packaging(
  _stage_id uuid,
  _quantity integer,
  _damaged integer DEFAULT 0,
  _worker_id uuid DEFAULT NULL,
  _note text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _order_id uuid; _dept factory_department; _o record; _inv_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT order_id, department INTO _order_id, _dept FROM public.factory_stages WHERE id = _stage_id;
  IF _order_id IS NULL THEN RAISE EXCEPTION 'stage_not_found'; END IF;
  IF _dept <> 'packaging' THEN RAISE EXCEPTION 'not_packaging_stage'; END IF;

  PERFORM public.factory_report_stage_progress(_stage_id, _quantity, _damaged, _worker_id, _note);

  SELECT product_name, color, size INTO _o FROM public.factory_orders WHERE id = _order_id;
  INSERT INTO public.finished_inventory(order_id, product_name, color, size, quantity, damaged_quantity, packaged_by, note)
    VALUES (_order_id, _o.product_name, _o.color, _o.size, _quantity, _damaged, _worker_id, _note)
    RETURNING id INTO _inv_id;
  RETURN _inv_id;
END $$;

-- Worker salary breakdown over a date range
CREATE OR REPLACE FUNCTION public.factory_worker_salary(_from date, _to date)
RETURNS TABLE(
  worker_id uuid, worker_name text, department factory_department,
  total_units bigint, total_amount numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH ev AS (
    SELECT e.worker_id, s.department, o.product_name, e.quantity
    FROM public.factory_stage_events e
    JOIN public.factory_stages s ON s.id = e.stage_id
    JOIN public.factory_orders o ON o.id = e.order_id
    WHERE e.event_type = 'progress'
      AND e.worker_id IS NOT NULL
      AND e.created_at::date BETWEEN _from AND _to
      AND e.quantity > 0
  ),
  rated AS (
    SELECT ev.worker_id, ev.department, ev.quantity,
      COALESCE(
        (SELECT rate_per_unit FROM public.salary_rates r
          WHERE r.department = ev.department AND r.product_name = ev.product_name AND r.active LIMIT 1),
        (SELECT rate_per_unit FROM public.salary_rates r
          WHERE r.department = ev.department AND r.product_name IS NULL AND r.active LIMIT 1),
        0
      ) AS rate
    FROM ev
  )
  SELECT r.worker_id, w.full_name, r.department,
    SUM(r.quantity)::bigint, SUM(r.quantity * r.rate)::numeric
  FROM rated r
  LEFT JOIN public.factory_workers w ON w.id = r.worker_id
  GROUP BY r.worker_id, w.full_name, r.department
  ORDER BY SUM(r.quantity * r.rate) DESC;
$$;

-- Close a payroll period: freeze snapshot
CREATE OR REPLACE FUNCTION public.factory_close_payroll_period(_period_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _p record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO _p FROM public.factory_payroll_periods WHERE id = _period_id;
  IF _p.id IS NULL THEN RAISE EXCEPTION 'period_not_found'; END IF;
  IF _p.closed_at IS NOT NULL THEN RAISE EXCEPTION 'already_closed'; END IF;

  INSERT INTO public.factory_payroll_snapshots(period_id, worker_id, worker_name, department, total_units, total_amount)
  SELECT _period_id, s.worker_id, COALESCE(s.worker_name, '—'), s.department, s.total_units::int, s.total_amount
  FROM public.factory_worker_salary(_p.start_date, _p.end_date) s
  WHERE s.worker_id IS NOT NULL;

  UPDATE public.factory_payroll_periods SET closed_at = now() WHERE id = _period_id;
END $$;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.finished_inventory;
ALTER PUBLICATION supabase_realtime ADD TABLE public.factory_payroll_periods;
