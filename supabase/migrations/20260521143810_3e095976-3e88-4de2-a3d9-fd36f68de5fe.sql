
-- Materials
CREATE TABLE public.inventory_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  material_type text NOT NULL DEFAULT 'other',
  unit text NOT NULL DEFAULT 'm',
  stock_quantity numeric NOT NULL DEFAULT 0,
  min_stock numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.product_formulas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name text NOT NULL,
  material_id uuid NOT NULL REFERENCES public.inventory_materials(id) ON DELETE CASCADE,
  quantity_per_unit numeric NOT NULL CHECK (quantity_per_unit > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_name, material_id)
);

CREATE INDEX product_formulas_product_idx ON public.product_formulas(product_name);

CREATE TABLE public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES public.inventory_materials(id) ON DELETE CASCADE,
  delta numeric NOT NULL,
  reason text NOT NULL,
  order_id uuid REFERENCES public.factory_orders(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX inv_mov_mat_idx ON public.inventory_movements(material_id, created_at DESC);

ALTER TABLE public.inventory_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_formulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY inv_mat_auth ON public.inventory_materials FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY inv_form_auth ON public.product_formulas FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY inv_mov_auth ON public.inventory_movements FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TRIGGER inv_mat_touch BEFORE UPDATE ON public.inventory_materials
  FOR EACH ROW EXECUTE FUNCTION public.factory_touch_updated_at();

-- Compute required materials for an order
CREATE OR REPLACE FUNCTION public.factory_order_material_requirements(_order_id uuid)
RETURNS TABLE(
  material_id uuid, material_name text, unit text,
  required_qty numeric, available_qty numeric, shortage numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.id, m.name, m.unit,
         (f.quantity_per_unit * o.total_quantity)::numeric AS required_qty,
         m.stock_quantity AS available_qty,
         GREATEST(0, (f.quantity_per_unit * o.total_quantity) - m.stock_quantity) AS shortage
  FROM public.factory_orders o
  JOIN public.product_formulas f ON f.product_name = o.product_name
  JOIN public.inventory_materials m ON m.id = f.material_id
  WHERE o.id = _order_id;
$$;

-- Consume materials for an order (atomic)
CREATE OR REPLACE FUNCTION public.factory_consume_order_materials(_order_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'forbidden'; END IF;
  FOR r IN SELECT * FROM public.factory_order_material_requirements(_order_id) LOOP
    IF r.shortage > 0 THEN
      RAISE EXCEPTION 'insufficient_material:%:%:%', r.material_name, r.required_qty, r.available_qty;
    END IF;
  END LOOP;
  FOR r IN SELECT * FROM public.factory_order_material_requirements(_order_id) LOOP
    UPDATE public.inventory_materials
      SET stock_quantity = stock_quantity - r.required_qty
      WHERE id = r.material_id;
    INSERT INTO public.inventory_movements(material_id, delta, reason, order_id)
      VALUES (r.material_id, -r.required_qty, 'order_consumption', _order_id);
  END LOOP;
END; $$;

-- Adjust stock (manual receive / write-off)
CREATE OR REPLACE FUNCTION public.inventory_adjust_stock(
  _material_id uuid, _delta numeric, _reason text, _note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.inventory_materials
    SET stock_quantity = stock_quantity + _delta
    WHERE id = _material_id;
  INSERT INTO public.inventory_movements(material_id, delta, reason, note)
    VALUES (_material_id, _delta, _reason, _note);
END; $$;

-- After order insert: if any shortage, mark laser stage as waiting_material
CREATE OR REPLACE FUNCTION public.factory_check_materials_on_order()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _short int;
BEGIN
  SELECT COUNT(*) INTO _short
    FROM public.factory_order_material_requirements(NEW.id)
    WHERE shortage > 0;
  IF _short > 0 THEN
    UPDATE public.factory_stages
      SET status = 'waiting_material'
      WHERE order_id = NEW.id AND department = 'laser';
  END IF;
  RETURN NEW;
END; $$;

-- Use a name that sorts AFTER the default-stage creation trigger
CREATE TRIGGER z_factory_orders_check_materials
  AFTER INSERT ON public.factory_orders
  FOR EACH ROW EXECUTE FUNCTION public.factory_check_materials_on_order();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_materials;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_movements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.product_formulas;
