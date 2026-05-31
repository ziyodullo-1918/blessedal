
-- Category enum for factory products
CREATE TYPE public.factory_product_category AS ENUM ('qish', 'bahor', 'kuz_yoz');

-- Central products catalog (shared across all departments)
CREATE TABLE public.factory_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  category public.factory_product_category NOT NULL,
  colors text[] NOT NULL DEFAULT '{}',
  image_url text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.factory_products TO authenticated;
GRANT ALL ON public.factory_products TO service_role;

ALTER TABLE public.factory_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "factory_products_auth_all" ON public.factory_products
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE TRIGGER factory_products_touch
  BEFORE UPDATE ON public.factory_products
  FOR EACH ROW EXECUTE FUNCTION public.factory_touch_updated_at();

-- Storage bucket for product images (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "product_images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "product_images_auth_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "product_images_auth_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images');

CREATE POLICY "product_images_auth_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'product-images');
