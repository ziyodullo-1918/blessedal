-- Tortuvchilar (pullers) module — prefixed tables to avoid conflict with existing Tikuvchilar tables
create extension if not exists pgcrypto;

-- =========================================
-- WORKERS
-- =========================================
create table if not exists public.pullers_workers (
  id uuid primary key default gen_random_uuid(),
  worker_code text not null unique,
  name text not null,
  pin_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.pullers_workers enable row level security;

-- Hide pin_hash from direct column access
revoke select (pin_hash) on public.pullers_workers from anon, authenticated, public;
grant select (id, worker_code, name, active, created_at) on public.pullers_workers to authenticated;

create policy "pullers_workers_select" on public.pullers_workers
  for select to authenticated using (auth.uid() is not null);
create policy "pullers_workers_insert" on public.pullers_workers
  for insert to authenticated with check (auth.uid() is not null);
create policy "pullers_workers_update" on public.pullers_workers
  for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "pullers_workers_delete" on public.pullers_workers
  for delete to authenticated using (auth.uid() is not null);

create or replace view public.pullers_workers_safe with (security_invoker=on) as
  select id, worker_code, name, active, created_at from public.pullers_workers;
grant select on public.pullers_workers_safe to authenticated;

-- =========================================
-- CATEGORIES
-- =========================================
create table if not exists public.pullers_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);
alter table public.pullers_categories enable row level security;
create policy "pullers_cats_read" on public.pullers_categories for select using (true);
create policy "pullers_cats_manage" on public.pullers_categories for all to authenticated
  using (auth.uid() is not null) with check (auth.uid() is not null);

-- =========================================
-- PRODUCTS
-- =========================================
create table if not exists public.pullers_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid references public.pullers_categories(id) on delete set null,
  price numeric(12,2) not null check (price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.pullers_products enable row level security;
create policy "pullers_prods_read" on public.pullers_products for select using (true);
create policy "pullers_prods_manage" on public.pullers_products for all to authenticated
  using (auth.uid() is not null) with check (auth.uid() is not null);

-- =========================================
-- PERIODS
-- =========================================
create table if not exists public.pullers_periods (
  id uuid primary key default gen_random_uuid(),
  start_date date not null,
  end_date date,
  status text not null default 'open',
  name text,
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  constraint pullers_periods_status_chk check (status in ('open','closed'))
);
create unique index if not exists pullers_periods_one_open_idx
  on public.pullers_periods (status) where status = 'open';
alter table public.pullers_periods enable row level security;
create policy "pullers_periods_read" on public.pullers_periods for select using (true);
create policy "pullers_periods_manage" on public.pullers_periods for all to authenticated
  using (auth.uid() is not null) with check (auth.uid() is not null);

create or replace function public.pullers_period_auto_name(_d date)
returns text language plpgsql immutable set search_path = public as $$
declare
  _months text[] := ARRAY['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentyabr','Oktyabr','Noyabr','Dekabr'];
  _m int := EXTRACT(MONTH FROM _d)::int;
  _day int := EXTRACT(DAY FROM _d)::int;
  _part text;
begin
  if _day <= 10 then _part := 'boshi';
  elsif _day <= 20 then _part := 'o''rtasi';
  else _part := 'oxiri';
  end if;
  return _months[_m] || ' ' || _part;
end; $$;

create or replace function public.pullers_periods_set_name()
returns trigger language plpgsql set search_path = public as $$
begin
  if NEW.name is null or NEW.name = '' then
    NEW.name := public.pullers_period_auto_name(NEW.start_date);
  end if;
  return NEW;
end; $$;

drop trigger if exists trg_pullers_periods_set_name on public.pullers_periods;
create trigger trg_pullers_periods_set_name
  before insert on public.pullers_periods
  for each row execute function public.pullers_periods_set_name();

-- Seed first open period
insert into public.pullers_periods (start_date, status)
  select current_date, 'open'
  where not exists (select 1 from public.pullers_periods where status='open');

-- =========================================
-- WORKER SESSIONS
-- =========================================
create table if not exists public.pullers_worker_sessions (
  token uuid primary key default gen_random_uuid(),
  worker_id uuid not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '12 hours')
);
alter table public.pullers_worker_sessions enable row level security;
create policy "pullers_sessions_no_select" on public.pullers_worker_sessions
  for select to authenticated, anon using (false);
create policy "pullers_sessions_no_insert" on public.pullers_worker_sessions
  for insert to authenticated, anon with check (false);
create policy "pullers_sessions_no_update" on public.pullers_worker_sessions
  for update to authenticated, anon using (false) with check (false);
create policy "pullers_sessions_no_delete" on public.pullers_worker_sessions
  for delete to authenticated, anon using (false);
create index if not exists idx_pullers_ws_worker on public.pullers_worker_sessions(worker_id);
create index if not exists idx_pullers_ws_exp on public.pullers_worker_sessions(expires_at);

-- =========================================
-- WORK ENTRIES
-- =========================================
create table if not exists public.pullers_work_entries (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.pullers_workers(id) on delete cascade,
  product_id uuid not null references public.pullers_products(id) on delete restrict,
  quantity numeric(12,2) not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  total numeric(14,2) generated always as (quantity * unit_price) stored,
  work_date date not null default current_date,
  created_at timestamptz not null default now()
);
alter table public.pullers_work_entries enable row level security;
create index if not exists idx_pullers_we_worker_date on public.pullers_work_entries(worker_id, work_date);
create index if not exists idx_pullers_we_date on public.pullers_work_entries(work_date);

create policy "pullers_we_select" on public.pullers_work_entries for select to authenticated
  using (auth.uid() is not null);
create policy "pullers_we_update_admin" on public.pullers_work_entries for update to authenticated
  using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "pullers_we_delete_admin" on public.pullers_work_entries for delete to authenticated
  using (auth.uid() is not null);
create policy "pullers_we_no_direct_insert" on public.pullers_work_entries for insert
  to anon, authenticated with check (false);

-- Realtime
alter table public.pullers_work_entries replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='pullers_work_entries'
  ) then
    execute 'alter publication supabase_realtime add table public.pullers_work_entries';
  end if;
end $$;

-- =========================================
-- APP SETTINGS (admin PIN)
-- =========================================
create table if not exists public.pullers_app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table public.pullers_app_settings enable row level security;
create policy "pullers_settings_manage" on public.pullers_app_settings for all to authenticated
  using (auth.uid() is not null) with check (auth.uid() is not null);

insert into public.pullers_app_settings(key, value)
  values ('admin_pin_hash', extensions.crypt('0000', extensions.gen_salt('bf')))
  on conflict (key) do nothing;

-- =========================================
-- RPCs
-- =========================================
create or replace function public.pullers_worker_login(_code text, _pin text)
returns table(id uuid, worker_code text, name text, session_token uuid, expires_at timestamptz)
language plpgsql security definer set search_path = public, extensions as $$
declare _w_id uuid; _w_code text; _w_name text; _tok uuid; _exp timestamptz;
begin
  select w.id, w.worker_code, w.name into _w_id, _w_code, _w_name
  from public.pullers_workers w
  where w.worker_code = _code and w.active = true
    and w.pin_hash = crypt(_pin, w.pin_hash);
  if _w_id is null then return; end if;

  delete from public.pullers_worker_sessions where expires_at < now();
  insert into public.pullers_worker_sessions(worker_id) values (_w_id)
  returning token, pullers_worker_sessions.expires_at into _tok, _exp;
  return query select _w_id, _w_code, _w_name, _tok, _exp;
end; $$;

create or replace function public.pullers_worker_session_check(_token uuid)
returns uuid language plpgsql stable security definer set search_path = public as $$
declare _wid uuid;
begin
  select worker_id into _wid from public.pullers_worker_sessions
    where token = _token and expires_at > now();
  if _wid is null then raise exception 'invalid_session'; end if;
  return _wid;
end; $$;

create or replace function public.pullers_worker_logout(_token uuid)
returns void language sql security definer set search_path = public as $$
  delete from public.pullers_worker_sessions where token = _token;
$$;

create or replace function public.pullers_submit_work_entry(_token uuid, _product_id uuid, _quantity numeric, _work_date date)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare
  _wid uuid := public.pullers_worker_session_check(_token);
  _price numeric; _id uuid;
  _p_start date; _p_end date;
  _wd date := coalesce(_work_date, current_date);
begin
  select price into _price from public.pullers_products where id = _product_id and active = true;
  if _price is null then raise exception 'invalid_product'; end if;

  select start_date, coalesce(end_date, current_date) into _p_start, _p_end
    from public.pullers_periods where status='open' order by start_date desc limit 1;
  if _p_start is null then raise exception 'no_open_period'; end if;

  if _wd > current_date then raise exception 'date_in_future'; end if;
  if _wd < _p_start then raise exception 'date_before_period_start'; end if;
  if _wd > _p_end then raise exception 'date_after_period_end'; end if;

  insert into public.pullers_work_entries(worker_id, product_id, quantity, unit_price, work_date)
    values (_wid, _product_id, _quantity, _price, _wd)
    returning id into _id;
  return _id;
end; $$;

create or replace function public.pullers_update_my_entry(
  _token uuid, _entry_id uuid, _product_id uuid, _quantity numeric, _work_date date
) returns void language plpgsql security definer set search_path = public, extensions as $$
declare
  _wid uuid := public.pullers_worker_session_check(_token);
  _price numeric;
  _p_start date; _p_end date;
  _wd date := coalesce(_work_date, current_date);
  _entry_worker uuid; _entry_date date;
begin
  select worker_id, work_date into _entry_worker, _entry_date
    from public.pullers_work_entries where id = _entry_id;
  if _entry_worker is null then raise exception 'entry_not_found'; end if;
  if _entry_worker <> _wid then raise exception 'forbidden'; end if;

  select start_date, coalesce(end_date, current_date) into _p_start, _p_end
    from public.pullers_periods where status='open' order by start_date desc limit 1;
  if _p_start is null then raise exception 'no_open_period'; end if;

  if _entry_date < _p_start or _entry_date > _p_end then
    raise exception 'entry_not_in_open_period';
  end if;

  select price into _price from public.pullers_products where id = _product_id and active = true;
  if _price is null then raise exception 'invalid_product'; end if;

  if _wd > current_date then raise exception 'date_in_future'; end if;
  if _wd < _p_start then raise exception 'date_before_period_start'; end if;
  if _wd > _p_end then raise exception 'date_after_period_end'; end if;
  if _quantity is null or _quantity <= 0 then raise exception 'invalid_quantity'; end if;

  update public.pullers_work_entries
    set product_id = _product_id, quantity = _quantity,
        unit_price = _price, work_date = _wd
    where id = _entry_id;
end; $$;

create or replace function public.pullers_delete_my_entry(_token uuid, _entry_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare _wid uuid := public.pullers_worker_session_check(_token);
begin
  delete from public.pullers_work_entries where id = _entry_id and worker_id = _wid;
end; $$;

create or replace function public.pullers_get_my_entries(_token uuid)
returns table(id uuid, work_date date, quantity numeric, unit_price numeric, total numeric,
              product_name text, category_name text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare _wid uuid := public.pullers_worker_session_check(_token);
  _cur_start date;
begin
  select start_date into _cur_start from public.pullers_periods where status='open' order by start_date desc limit 1;
  if _cur_start is null then _cur_start := '1900-01-01'::date; end if;

  return query
    select e.id, e.work_date, e.quantity, e.unit_price, e.total,
           p.name as product_name, c.name as category_name, e.created_at
    from public.pullers_work_entries e
    join public.pullers_products p on p.id = e.product_id
    left join public.pullers_categories c on c.id = p.category_id
    where e.worker_id = _wid and e.work_date >= _cur_start
    order by e.work_date desc, e.created_at desc;
end; $$;

create or replace function public.pullers_get_current_period()
returns table(id uuid, start_date date, name text)
language sql stable security definer set search_path = public as $$
  select id, start_date, name from public.pullers_periods where status='open' order by start_date desc limit 1;
$$;

create or replace function public.pullers_close_current_period(_end_date date default null, _next_start date default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare _cur_id uuid; _cur_start date; _close_date date; _next date; _new_id uuid;
begin
  if auth.uid() is null then raise exception 'forbidden'; end if;
  select id, start_date into _cur_id, _cur_start
    from public.pullers_periods where status='open' order by start_date desc limit 1;
  if _cur_id is null then raise exception 'no_open_period'; end if;

  _close_date := coalesce(_end_date, current_date);
  if _close_date < _cur_start then raise exception 'end_date_before_start'; end if;
  _next := coalesce(_next_start, _close_date + interval '1 day');
  if _next <= _close_date then raise exception 'next_start_must_be_after_end'; end if;

  update public.pullers_periods
    set status='closed', end_date=_close_date, closed_at=now(),
        name = coalesce(name, public.pullers_period_auto_name(start_date))
    where id=_cur_id;

  insert into public.pullers_periods(start_date, status, name)
    values (_next, 'open', public.pullers_period_auto_name(_next))
    returning id into _new_id;
  return _new_id;
end; $$;

create or replace function public.pullers_admin_upsert_worker(
  _id uuid, _code text, _name text, _pin text, _active boolean
) returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare _new_id uuid;
begin
  if auth.uid() is null then raise exception 'forbidden'; end if;
  if _id is null then
    insert into public.pullers_workers(worker_code, name, pin_hash, active)
      values (_code, _name, crypt(_pin, gen_salt('bf')), coalesce(_active, true))
      returning id into _new_id;
    return _new_id;
  else
    update public.pullers_workers set
      worker_code = _code,
      name = _name,
      active = coalesce(_active, active),
      pin_hash = case when _pin is not null and _pin <> '' then crypt(_pin, gen_salt('bf')) else pin_hash end
    where id = _id;
    return _id;
  end if;
end; $$;

create or replace function public.pullers_admin_update_entry(
  _entry_id uuid, _product_id uuid, _quantity numeric, _work_date date
) returns void language plpgsql security definer set search_path = public as $$
declare _price numeric;
begin
  if auth.uid() is null then raise exception 'forbidden'; end if;
  select price into _price from public.pullers_products where id = _product_id;
  if _price is null then raise exception 'invalid_product'; end if;
  update public.pullers_work_entries
    set product_id = _product_id, quantity = _quantity, unit_price = _price,
        work_date = coalesce(_work_date, work_date)
    where id = _entry_id;
end; $$;

create or replace function public.pullers_verify_admin_pin(_pin text)
returns boolean language plpgsql stable security definer set search_path = public, extensions as $$
declare _hash text;
begin
  if auth.uid() is null then raise exception 'forbidden'; end if;
  select value into _hash from public.pullers_app_settings where key='admin_pin_hash';
  if _hash is null then return false; end if;
  return _hash = crypt(_pin, _hash);
end; $$;

create or replace function public.pullers_set_admin_pin(_old_pin text, _new_pin text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare _hash text;
begin
  if auth.uid() is null then raise exception 'forbidden'; end if;
  if _new_pin is null or length(_new_pin) < 4 then raise exception 'pin_too_short'; end if;
  select value into _hash from public.pullers_app_settings where key='admin_pin_hash';
  if _hash is not null and _hash <> crypt(coalesce(_old_pin, ''), _hash) then
    raise exception 'wrong_old_pin';
  end if;
  insert into public.pullers_app_settings(key, value, updated_at)
    values ('admin_pin_hash', crypt(_new_pin, gen_salt('bf')), now())
    on conflict (key) do update set value=excluded.value, updated_at=now();
end; $$;

create or replace function public.pullers_products_propagate_price()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.price is distinct from OLD.price then
    update public.pullers_work_entries set unit_price = NEW.price where product_id = NEW.id;
  end if;
  return NEW;
end; $$;
drop trigger if exists trg_pullers_products_propagate_price on public.pullers_products;
create trigger trg_pullers_products_propagate_price
  after update of price on public.pullers_products
  for each row execute function public.pullers_products_propagate_price();

-- Grants
grant execute on function public.pullers_worker_login(text, text) to anon, authenticated;
grant execute on function public.pullers_worker_logout(uuid) to anon, authenticated;
grant execute on function public.pullers_submit_work_entry(uuid, uuid, numeric, date) to anon, authenticated;
grant execute on function public.pullers_update_my_entry(uuid, uuid, uuid, numeric, date) to anon, authenticated;
grant execute on function public.pullers_delete_my_entry(uuid, uuid) to anon, authenticated;
grant execute on function public.pullers_get_my_entries(uuid) to anon, authenticated;
grant execute on function public.pullers_get_current_period() to anon, authenticated;