-- ============================================================
-- CENTRALIZED FACTORY PRODUCTION SYSTEM
-- Order-centric flow: Laser → Sewing → Stretching → Packaging → Warehouse → Delivery
-- ============================================================

-- Enums
CREATE TYPE public.factory_department AS ENUM (
  'laser', 'sewing', 'stretching', 'packaging', 'warehouse', 'delivery', 'admin'
);

CREATE TYPE public.factory_stage_status AS ENUM (
  'pending', 'in_progress', 'partial', 'completed', 'waiting_material', 'rejected'
);

CREATE TYPE public.factory_order_status AS ENUM (
  'pending', 'in_progress', 'partial', 'completed', 'waiting_material', 'rejected'
);

-- ============================================================
-- factory_workers: unified workers table with department role
-- ============================================================
CREATE TABLE public.factory_workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  worker_code text NOT NULL UNIQUE,
  pin_hash text NOT NULL,
  department public.factory_department NOT NULL,
  phone text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.factory_workers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "factory_workers_admin_all" ON public.factory_workers
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- factory_orders: customer orders (the single source of truth)
-- ============================================================
CREATE TABLE public.factory_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  customer_name text NOT NULL,
  product_name text NOT NULL,
  color text,
  size text,
  total_quantity integer NOT NULL CHECK (total_quantity > 0),
  status public.factory_order_status NOT NULL DEFAULT 'pending',
  priority integer NOT NULL DEFAULT 0,
  due_date date,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.factory_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "factory_orders_admin_all" ON public.factory_orders
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX idx_factory_orders_status ON public.factory_orders(status);
CREATE INDEX idx_factory_orders_created ON public.factory_orders(created_at DESC);

-- ============================================================
-- factory_stages: each stage of each order
-- ============================================================
CREATE TABLE public.factory_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.factory_orders(id) ON DELETE CASCADE,
  department public.factory_department NOT NULL,
  sequence_no integer NOT NULL,
  planned_quantity integer NOT NULL DEFAULT 0,
  completed_quantity integer NOT NULL DEFAULT 0,
  rejected_quantity integer NOT NULL DEFAULT 0,
  status public.factory_stage_status NOT NULL DEFAULT 'pending',
  assigned_worker_id uuid REFERENCES public.factory_workers(id) ON DELETE SET NULL,
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id, department)
);
ALTER TABLE public.factory_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "factory_stages_admin_all" ON public.factory_stages
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX idx_factory_stages_order ON public.factory_stages(order_id);
CREATE INDEX idx_factory_stages_dept_status ON public.factory_stages(department, status);

-- ============================================================
-- factory_stage_events: audit log for every quantity change
-- ============================================================
CREATE TABLE public.factory_stage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id uuid NOT NULL REFERENCES public.factory_stages(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.factory_orders(id) ON DELETE CASCADE,
  worker_id uuid REFERENCES public.factory_workers(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  rejected integer NOT NULL DEFAULT 0,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.factory_stage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "factory_stage_events_admin_all" ON public.factory_stage_events
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX idx_stage_events_stage ON public.factory_stage_events(stage_id);
CREATE INDEX idx_stage_events_order ON public.factory_stage_events(order_id);

-- ============================================================
-- updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.factory_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_factory_orders_touch BEFORE UPDATE ON public.factory_orders
  FOR EACH ROW EXECUTE FUNCTION public.factory_touch_updated_at();
CREATE TRIGGER trg_factory_stages_touch BEFORE UPDATE ON public.factory_stages
  FOR EACH ROW EXECUTE FUNCTION public.factory_touch_updated_at();

-- ============================================================
-- Auto-create 6 production stages when an order is created
-- ============================================================
CREATE OR REPLACE FUNCTION public.factory_create_default_stages()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.factory_stages (order_id, department, sequence_no, planned_quantity, status) VALUES
    (NEW.id, 'laser',       1, NEW.total_quantity, 'pending'),
    (NEW.id, 'sewing',      2, NEW.total_quantity, 'pending'),
    (NEW.id, 'stretching',  3, NEW.total_quantity, 'pending'),
    (NEW.id, 'packaging',   4, NEW.total_quantity, 'pending'),
    (NEW.id, 'warehouse',   5, NEW.total_quantity, 'pending'),
    (NEW.id, 'delivery',    6, NEW.total_quantity, 'pending');
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_factory_orders_default_stages
  AFTER INSERT ON public.factory_orders
  FOR EACH ROW EXECUTE FUNCTION public.factory_create_default_stages();

-- ============================================================
-- Recompute order status from stage statuses
-- ============================================================
CREATE OR REPLACE FUNCTION public.factory_recompute_order_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _order_id uuid := COALESCE(NEW.order_id, OLD.order_id);
  _total int; _completed int; _in_progress int; _rejected int; _waiting int;
  _new_status public.factory_order_status;
BEGIN
  SELECT COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'in_progress' OR status = 'partial'),
    COUNT(*) FILTER (WHERE status = 'rejected'),
    COUNT(*) FILTER (WHERE status = 'waiting_material')
  INTO _total, _completed, _in_progress, _rejected, _waiting
  FROM public.factory_stages WHERE order_id = _order_id;

  IF _completed = _total THEN _new_status := 'completed';
  ELSIF _rejected > 0 AND _in_progress = 0 AND _completed = 0 THEN _new_status := 'rejected';
  ELSIF _waiting > 0 THEN _new_status := 'waiting_material';
  ELSIF _in_progress > 0 OR _completed > 0 THEN
    IF _completed > 0 THEN _new_status := 'partial'; ELSE _new_status := 'in_progress'; END IF;
  ELSE _new_status := 'pending';
  END IF;

  UPDATE public.factory_orders SET status = _new_status WHERE id = _order_id;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_factory_stages_recompute_order
  AFTER INSERT OR UPDATE OR DELETE ON public.factory_stages
  FOR EACH ROW EXECUTE FUNCTION public.factory_recompute_order_status();

-- ============================================================
-- RPC: report progress on a stage (auto-derives status)
-- ============================================================
CREATE OR REPLACE FUNCTION public.factory_report_stage_progress(
  _stage_id uuid,
  _completed_delta integer,
  _rejected_delta integer DEFAULT 0,
  _worker_id uuid DEFAULT NULL,
  _note text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _planned int; _completed int; _rejected int; _order_id uuid;
  _new_status public.factory_stage_status;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'forbidden'; END IF;

  UPDATE public.factory_stages
    SET completed_quantity = completed_quantity + COALESCE(_completed_delta, 0),
        rejected_quantity = rejected_quantity + COALESCE(_rejected_delta, 0),
        started_at = COALESCE(started_at, now()),
        assigned_worker_id = COALESCE(_worker_id, assigned_worker_id)
    WHERE id = _stage_id
    RETURNING planned_quantity, completed_quantity, rejected_quantity, order_id
      INTO _planned, _completed, _rejected, _order_id;

  IF _order_id IS NULL THEN RAISE EXCEPTION 'stage_not_found'; END IF;

  IF _completed + _rejected >= _planned AND _completed > 0 THEN
    _new_status := 'completed';
  ELSIF _completed > 0 THEN _new_status := 'partial';
  ELSE _new_status := 'in_progress';
  END IF;

  UPDATE public.factory_stages
    SET status = _new_status,
        completed_at = CASE WHEN _new_status = 'completed' THEN now() ELSE NULL END
    WHERE id = _stage_id;

  INSERT INTO public.factory_stage_events (stage_id, order_id, worker_id, event_type, quantity, rejected, note)
    VALUES (_stage_id, _order_id, _worker_id, 'progress', COALESCE(_completed_delta, 0), COALESCE(_rejected_delta, 0), _note);
END; $$;

-- ============================================================
-- RPC: set stage status directly (e.g. waiting_material, rejected)
-- ============================================================
CREATE OR REPLACE FUNCTION public.factory_set_stage_status(
  _stage_id uuid,
  _status public.factory_stage_status,
  _note text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _order_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.factory_stages
    SET status = _status,
        completed_at = CASE WHEN _status = 'completed' THEN now() ELSE completed_at END,
        started_at = COALESCE(started_at, CASE WHEN _status IN ('in_progress','partial') THEN now() END)
    WHERE id = _stage_id RETURNING order_id INTO _order_id;
  IF _order_id IS NULL THEN RAISE EXCEPTION 'stage_not_found'; END IF;
  INSERT INTO public.factory_stage_events (stage_id, order_id, event_type, note)
    VALUES (_stage_id, _order_id, 'status_change:' || _status::text, _note);
END; $$;

-- ============================================================
-- Generate next order number
-- ============================================================
CREATE OR REPLACE FUNCTION public.factory_next_order_number()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n int;
BEGIN
  SELECT COALESCE(MAX(NULLIF(regexp_replace(order_number, '^ORD-', ''), '')::int), 0) + 1
    INTO _n FROM public.factory_orders WHERE order_number ~ '^ORD-\d+$';
  RETURN 'ORD-' || lpad(_n::text, 5, '0');
END; $$;

-- ============================================================
-- Enable realtime
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.factory_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.factory_stages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.factory_stage_events;
ALTER TABLE public.factory_orders REPLICA IDENTITY FULL;
ALTER TABLE public.factory_stages REPLICA IDENTITY FULL;