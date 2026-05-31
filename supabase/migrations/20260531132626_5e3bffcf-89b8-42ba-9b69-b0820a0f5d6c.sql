
-- Cut work summary for laser department
CREATE OR REPLACE FUNCTION public.laser_cut_summary(_from date, _to date)
RETURNS TABLE(order_id uuid, order_number text, product_name text, color text, total_quantity bigint, total_rejected bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT o.id, o.order_number, o.product_name, o.color,
         COALESCE(SUM(e.quantity),0)::bigint, COALESCE(SUM(e.rejected),0)::bigint
  FROM public.factory_stage_events e
  JOIN public.factory_stages s ON s.id = e.stage_id
  JOIN public.factory_orders o ON o.id = e.order_id
  WHERE s.department = 'laser'
    AND e.event_type = 'progress'
    AND e.created_at::date BETWEEN _from AND _to
  GROUP BY o.id, o.order_number, o.product_name, o.color
  ORDER BY SUM(e.quantity) DESC;
$$;
