UPDATE public.pullers_app_settings SET value = extensions.crypt('1234', extensions.gen_salt('bf')), updated_at = now() WHERE key = 'admin_pin_hash';
INSERT INTO public.pullers_app_settings(key, value, updated_at)
SELECT 'admin_pin_hash', extensions.crypt('1234', extensions.gen_salt('bf')), now()
WHERE NOT EXISTS (SELECT 1 FROM public.pullers_app_settings WHERE key='admin_pin_hash');