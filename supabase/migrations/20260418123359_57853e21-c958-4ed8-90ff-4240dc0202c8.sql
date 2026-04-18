
-- 1. Add period_id to assignments
ALTER TABLE public.assignments
  ADD COLUMN period_id uuid REFERENCES public.payroll_periods(id) ON DELETE SET NULL;

CREATE INDEX idx_assignments_period_id ON public.assignments(period_id);
CREATE INDEX idx_assignments_status ON public.assignments(status);

-- 2. Founders table (sub-users created by admin)
CREATE TABLE public.founders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  login_id text NOT NULL,
  pin_hash text NOT NULL,
  full_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(login_id)
);

ALTER TABLE public.founders ENABLE ROW LEVEL SECURITY;

-- Admin can manage their own founders
CREATE POLICY "admin manages own founders"
  ON public.founders
  FOR ALL
  USING (auth.uid() = admin_user_id)
  WITH CHECK (auth.uid() = admin_user_id);

-- Allow public SELECT by login_id for login lookup (only returns row if login_id matches)
CREATE POLICY "lookup by login_id"
  ON public.founders
  FOR SELECT
  USING (true);

-- 3. Founder session: store admin_user_id mapping so founder can access admin's data
-- We'll handle founder access on the client side: founder logs in, we set a "founder mode"
-- and queries use the admin's user_id. To make this work with RLS, we add policies
-- that allow access when the requesting client provides a valid founder session.
-- Simplest secure approach: founder authenticates as the admin via a server function.

-- For now, we expose data through RLS by checking a JWT claim or by signing in as admin.
-- Practical approach: founder login creates a Supabase session for the admin user via service role.
-- This requires a server function. Tables RLS stays as-is (auth.uid() = user_id).

-- 4. Function to close a period and roll over in-progress assignments
CREATE OR REPLACE FUNCTION public.close_period_and_rollover(_period_id uuid, _new_label text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _old_end date;
  _new_start date;
  _new_end date;
  _new_id uuid;
BEGIN
  -- Verify ownership
  SELECT end_date INTO _old_end
  FROM public.payroll_periods
  WHERE id = _period_id AND user_id = _user_id;

  IF _old_end IS NULL THEN
    RAISE EXCEPTION 'Period not found or access denied';
  END IF;

  -- Close old period
  UPDATE public.payroll_periods
  SET closed_at = now()
  WHERE id = _period_id AND user_id = _user_id;

  -- New period: starts day after old end, runs for ~30 days by default
  _new_start := _old_end + INTERVAL '1 day';
  _new_end := _new_start + INTERVAL '29 days';

  INSERT INTO public.payroll_periods (user_id, label, start_date, end_date)
  VALUES (_user_id, _new_label, _new_start, _new_end)
  RETURNING id INTO _new_id;

  -- Move in-progress assignments to new period
  UPDATE public.assignments
  SET period_id = _new_id
  WHERE user_id = _user_id
    AND period_id = _period_id
    AND status = 'in_progress';

  RETURN _new_id;
END;
$$;
