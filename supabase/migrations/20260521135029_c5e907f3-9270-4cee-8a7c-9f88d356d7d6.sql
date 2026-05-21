
-- 1) Consolidate duplicate open "May o'rtasi 2026-05-16" periods into 82ff2eea
UPDATE assignments SET period_id = '82ff2eea-b0bc-44cb-9190-a73d46336f94'
WHERE period_id IN ('995600e8-0f28-4c89-92dc-300ab9a3cc74','d6474447-47a0-4174-a295-78921ae1375d');

DELETE FROM payroll_periods WHERE id IN ('995600e8-0f28-4c89-92dc-300ab9a3cc74','d6474447-47a0-4174-a295-78921ae1375d');

-- 2) Consolidate duplicate "May boshi/o'rtasi 2026-05-03" open periods into the closed canonical 17226eb4
UPDATE assignments SET period_id = '17226eb4-c689-4f74-9255-443131dd384d'
WHERE period_id IN ('2361f9ac-03c1-473d-ba5f-e8be1d2ecd54','7c0a500f-28b4-468d-9e2f-1159c2975c95','913e8b4b-6bad-4b56-931b-32b7b17a7f09');

DELETE FROM payroll_periods WHERE id IN ('2361f9ac-03c1-473d-ba5f-e8be1d2ecd54','7c0a500f-28b4-468d-9e2f-1159c2975c95','913e8b4b-6bad-4b56-931b-32b7b17a7f09');

-- 3) Fix the broken end_date on the closed 2026-05-18 period
UPDATE payroll_periods
SET end_date = '2026-05-15'
WHERE id = '0aa13685-6c83-4e2a-aa14-138a9d841b91' AND end_date < start_date;

-- 4) Prevent future duplicates: ensure only ONE open period at a time
CREATE UNIQUE INDEX IF NOT EXISTS payroll_periods_one_open_per_user
  ON payroll_periods (user_id) WHERE closed_at IS NULL;
