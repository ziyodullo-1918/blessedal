-- Change factory_products.category from enum to text with new values
ALTER TABLE public.factory_products
  ALTER COLUMN category TYPE text USING category::text;

UPDATE public.factory_products SET category = 'bahor_kuz' WHERE category IN ('bahor','kuz_yoz');
UPDATE public.factory_products SET category = 'yoz' WHERE category NOT IN ('qish','bahor_kuz','yoz');

ALTER TABLE public.factory_products
  ADD CONSTRAINT factory_products_category_check
  CHECK (category IN ('qish','bahor_kuz','yoz'));

ALTER TABLE public.factory_products
  ALTER COLUMN category SET DEFAULT 'yoz';