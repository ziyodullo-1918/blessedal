ALTER TABLE public.products DROP COLUMN IF EXISTS color;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS colors text[] NOT NULL DEFAULT '{}';