
-- ============== 1) Laser: aux parts ==============
ALTER TABLE public.factory_stages
  ADD COLUMN IF NOT EXISTS aux_completed jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.laser_report_aux(_stage_id uuid, _part text, _delta integer, _worker_id uuid DEFAULT NULL, _note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _order_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _part NOT IN ('astar','hakandoz') THEN RAISE EXCEPTION 'invalid_part'; END IF;
  UPDATE public.factory_stages
    SET aux_completed = jsonb_set(
          COALESCE(aux_completed,'{}'::jsonb),
          ARRAY[_part],
          to_jsonb(COALESCE((aux_completed->>_part)::int,0) + COALESCE(_delta,0))
        ),
        started_at = COALESCE(started_at, now())
    WHERE id = _stage_id AND department = 'laser'
    RETURNING order_id INTO _order_id;
  IF _order_id IS NULL THEN RAISE EXCEPTION 'stage_not_found'; END IF;
  INSERT INTO public.factory_stage_events(stage_id, order_id, worker_id, event_type, quantity, note)
    VALUES (_stage_id, _order_id, _worker_id, 'aux:' || _part, COALESCE(_delta,0), _note);
END $$;

-- ============== 2) Products: pack box size ==============
ALTER TABLE public.factory_products
  ADD COLUMN IF NOT EXISTS pack_box_size integer NOT NULL DEFAULT 5;

-- ============== 3) Packaging: box entries (new flow) ==============
CREATE TABLE IF NOT EXISTS public.packaging_box_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL,
  product_id uuid,
  product_name text NOT NULL,
  color text,
  pairs_per_box integer NOT NULL DEFAULT 5,
  boxes integer NOT NULL CHECK (boxes > 0),
  units integer NOT NULL,
  unit_price numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  work_date date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.packaging_box_entries TO authenticated;
GRANT ALL ON public.packaging_box_entries TO service_role;
ALTER TABLE public.packaging_box_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY pkg_box_auth_all ON public.packaging_box_entries
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS pkg_box_entries_date ON public.packaging_box_entries(work_date);
CREATE INDEX IF NOT EXISTS pkg_box_entries_worker ON public.packaging_box_entries(worker_id);

-- Record a packaging entry: writes box entry + finished_inventory in one go
CREATE OR REPLACE FUNCTION public.packaging_record_box(
  _worker_id uuid,
  _product_id uuid,
  _color text,
  _boxes integer,
  _work_date date DEFAULT NULL,
  _note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _p record; _rate numeric; _units int; _id uuid; _wd date := COALESCE(_work_date, CURRENT_DATE);
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _boxes IS NULL OR _boxes <= 0 THEN RAISE EXCEPTION 'invalid_boxes'; END IF;

  SELECT id, name, pack_box_size INTO _p FROM public.factory_products WHERE id = _product_id;
  IF _p.id IS NULL THEN RAISE EXCEPTION 'product_not_found'; END IF;

  SELECT rate_per_unit INTO _rate
    FROM public.packaging_piece_rates
    WHERE product_name = _p.name AND active = true LIMIT 1;
  IF _rate IS NULL THEN
    SELECT rate_per_unit INTO _rate
      FROM public.packaging_piece_rates
      WHERE product_name IS NULL AND active = true LIMIT 1;
  END IF;
  _rate := COALESCE(_rate, 0);
  _units := _boxes * _p.pack_box_size;

  INSERT INTO public.packaging_box_entries(
    worker_id, product_id, product_name, color, pairs_per_box,
    boxes, units, unit_price, total, work_date, note
  ) VALUES (
    _worker_id, _p.id, _p.name, _color, _p.pack_box_size,
    _boxes, _units, _rate, _units * _rate, _wd, _note
  ) RETURNING id INTO _id;

  -- auto-add to finished inventory
  INSERT INTO public.finished_inventory(order_id, product_name, color, size, quantity, damaged_quantity, packaged_by, note)
    VALUES (NULL, _p.name, _color, NULL, _units, 0, _worker_id,
            COALESCE(_note, _boxes::text || ' karobka × ' || _p.pack_box_size::text));

  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.packaging_delete_box_entry(_entry_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM public.packaging_box_entries WHERE id = _entry_id;
END $$;

-- Replace salary report to use new box entries
CREATE OR REPLACE FUNCTION public.packaging_salary_report(_from date, _to date)
RETURNS TABLE(worker_id uuid, worker_name text, total_units bigint, total_amount numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT e.worker_id, w.full_name,
         COALESCE(SUM(e.units),0)::bigint,
         COALESCE(SUM(e.total),0)::numeric
  FROM public.packaging_box_entries e
  LEFT JOIN public.factory_workers w ON w.id = e.worker_id
  WHERE e.work_date BETWEEN _from AND _to
  GROUP BY e.worker_id, w.full_name
  ORDER BY SUM(e.total) DESC NULLS LAST;
$$;

-- ============== 4) App settings (single key/value store) ==============
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_settings_auth_all ON public.app_settings
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ============== 5) Department heads ==============
CREATE TABLE IF NOT EXISTS public.factory_department_heads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department factory_department NOT NULL UNIQUE,
  full_name text NOT NULL,
  email text,
  phone text,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.factory_department_heads TO authenticated;
GRANT ALL ON public.factory_department_heads TO service_role;
ALTER TABLE public.factory_department_heads ENABLE ROW LEVEL SECURITY;
CREATE POLICY dept_heads_auth_all ON public.factory_department_heads
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ============== 6) User roles ==============
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','head','worker');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  department public.factory_department,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_roles_auth_all ON public.user_roles
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;
