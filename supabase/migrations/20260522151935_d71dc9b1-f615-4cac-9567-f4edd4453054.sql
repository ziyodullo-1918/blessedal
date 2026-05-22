-- 1) Replace default-stages trigger to drop delivery
CREATE OR REPLACE FUNCTION public.factory_create_default_stages()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.factory_stages (order_id, department, sequence_no, planned_quantity, status) VALUES
    (NEW.id, 'laser',       1, NEW.total_quantity, 'pending'),
    (NEW.id, 'sewing',      2, NEW.total_quantity, 'pending'),
    (NEW.id, 'stretching',  3, NEW.total_quantity, 'pending'),
    (NEW.id, 'packaging',   4, NEW.total_quantity, 'pending'),
    (NEW.id, 'warehouse',   5, NEW.total_quantity, 'pending');
  RETURN NEW;
END; $function$;

-- 2) Remove any existing delivery stages (and related events) from current orders
DELETE FROM public.factory_stage_events
  WHERE stage_id IN (SELECT id FROM public.factory_stages WHERE department = 'delivery');
DELETE FROM public.factory_stages WHERE department = 'delivery';