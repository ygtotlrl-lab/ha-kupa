-- migrations/000_schema.sql — הקופה: הסכימה החיה

-- ── הקופה ──

create table if not exists public.k_entries (
  client_id text not null,
  type text not null,
  amount numeric not null,
  description text,
  entry_date date not null,
  method text,
  category text,
  source text default 'manual'::text,
  verified boolean default false,
  so_instance_client_id text,
  created_at timestamp with time zone default now(),
  updated_at bigint not null,
  deleted boolean default false,
  deleted_at timestamp with time zone,
  deleted_by text,
  constraint k_entries_pkey PRIMARY KEY (client_id)
);

create table if not exists public.k_lookups (
  client_id text not null,
  kind text not null,
  label text not null,
  sort integer default 0,
  created_at timestamp with time zone default now(),
  updated_at bigint not null,
  deleted boolean default false,
  deleted_at timestamp with time zone,
  deleted_by text,
  constraint k_lookups_pkey PRIMARY KEY (client_id)
);

create table if not exists public.k_pledges (
  client_id text not null,
  pledge_heb_year integer not null,
  pledge numeric not null,
  chumash_opening_balance numeric,
  created_at timestamp with time zone default now(),
  updated_at bigint not null,
  deleted boolean default false,
  deleted_at timestamp with time zone,
  deleted_by text,
  constraint k_pledges_pkey PRIMARY KEY (client_id),
  constraint k_pledges_pledge_heb_year_key UNIQUE (pledge_heb_year)
);

create table if not exists public.k_settings (
  key text not null,
  value text,
  updated_at bigint not null,
  client_id text,
  deleted boolean not null default false,
  deleted_at timestamp with time zone,
  deleted_by text,
  constraint k_settings_pkey PRIMARY KEY (key),
  constraint k_settings_value_json CHECK (((value IS NULL) OR ((value)::jsonb IS NOT NULL)))
);

create table if not exists public.k_so_instances (
  client_id text not null,
  standing_order_client_id text not null,
  due_heb_month text not null,
  amount numeric not null,
  created_at timestamp with time zone default now(),
  updated_at bigint not null,
  deleted boolean default false,
  deleted_at timestamp with time zone,
  deleted_by text,
  constraint k_so_instances_pkey PRIMARY KEY (client_id),
  constraint k_so_instances_due_heb_month_check CHECK ((due_heb_month ~ '^[0-9]{4}-(0[1-9]|1[0-3])$'::text))
);

create table if not exists public.k_standing_orders (
  client_id text not null,
  name text not null,
  amount numeric not null,
  day_of_month integer not null,
  method text,
  category text,
  active boolean default true,
  valid_from_heb_month text,
  valid_to_heb_month text,
  supersedes_client_id text,
  created_at timestamp with time zone default now(),
  updated_at bigint not null,
  deleted boolean default false,
  deleted_at timestamp with time zone,
  deleted_by text,
  sort integer,
  constraint k_standing_orders_pkey PRIMARY KEY (client_id),
  constraint k_standing_orders_valid_from_heb_month_check CHECK (((valid_from_heb_month IS NULL) OR (valid_from_heb_month ~ '^[0-9]{4}-(0[1-9]|1[0-3])$'::text))),
  constraint k_standing_orders_valid_to_heb_month_check CHECK (((valid_to_heb_month IS NULL) OR (valid_to_heb_month ~ '^[0-9]{4}-(0[1-9]|1[0-3])$'::text)))
);

create table if not exists public.k_users (
  client_id text not null,
  login text not null,
  full_name text not null,
  role text not null,
  active boolean not null default true,
  notify boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at bigint not null,
  constraint k_users_pkey PRIMARY KEY (client_id),
  constraint k_users_login_key UNIQUE (login),
  constraint k_users_login_check CHECK ((login = lower(login))),
  constraint k_users_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'manager'::text, 'junior'::text])))
);

create index if not exists k_entries_date_idx ON public.k_entries USING btree (entry_date);
create index if not exists k_entries_type_idx ON public.k_entries USING btree (type, deleted);
create index if not exists k_lookups_kind_idx ON public.k_lookups USING btree (kind, sort);
create index if not exists k_so_instances_due_heb_month_idx ON public.k_so_instances USING btree (due_heb_month);
create index if not exists k_so_instances_order_idx ON public.k_so_instances USING btree (standing_order_client_id);

CREATE OR REPLACE FUNCTION public.k_entries_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  if coalesce(new.deleted, false) = false then
    perform net.http_post(
      url := 'https://zrftjkghhjhqzopvdzou.supabase.co/functions/v1/sh-gate',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('action', 'hook', 'app', 'ha-kupa', 'kind', 'k_entry',
        'hook', (select value #>> '{}' from public.sh_keys where key = 'hook'),
        'type', new.type, 'amount', new.amount, 'description', new.description),
      timeout_milliseconds := 20000);
  end if;
  return new;
end $function$;
revoke all on function public.k_entries_notify() from public, anon, authenticated, service_role;
grant execute on function public.k_entries_notify() to service_role;

CREATE OR REPLACE FUNCTION public.k_is_user()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ select exists (select 1 from public.k_users u where u.login = lower(auth.jwt() ->> 'email') and u.active) $function$;
revoke all on function public.k_is_user() from public, anon, authenticated, service_role;
grant execute on function public.k_is_user() to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.k_so_instances_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  if coalesce(new.deleted, false) = false then
    perform net.http_post(
      url := 'https://zrftjkghhjhqzopvdzou.supabase.co/functions/v1/sh-gate',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('action', 'hook', 'app', 'ha-kupa', 'kind', 'k_entry',
        'hook', (select value #>> '{}' from public.sh_keys where key = 'hook'),
        'type', 'so', 'amount', new.amount,
        'description', coalesce((select name from public.k_standing_orders where client_id = new.standing_order_client_id), '')),
      timeout_milliseconds := 20000);
  end if;
  return new;
end $function$;
revoke all on function public.k_so_instances_notify() from public, anon, authenticated, service_role;
grant execute on function public.k_so_instances_notify() to service_role;

-- revoke לפני grant — GRANT מוסיף ואינו מחליף, וטבלה חדשה ב-Supabase נולדת עם DELETE ו-TRUNCATE ל-anon.
revoke all on table public.k_entries from anon, authenticated;
grant select, insert, update on table public.k_entries to anon, authenticated;
grant all on table public.k_entries to service_role;
revoke all on table public.k_lookups from anon, authenticated;
grant select, insert, update on table public.k_lookups to anon, authenticated;
grant all on table public.k_lookups to service_role;
revoke all on table public.k_pledges from anon, authenticated;
grant select, insert, update on table public.k_pledges to anon, authenticated;
grant all on table public.k_pledges to service_role;
revoke all on table public.k_settings from anon, authenticated;
grant select, insert, update on table public.k_settings to anon, authenticated;
grant all on table public.k_settings to service_role;
revoke all on table public.k_so_instances from anon, authenticated;
grant select, insert, update on table public.k_so_instances to anon, authenticated;
grant all on table public.k_so_instances to service_role;
revoke all on table public.k_standing_orders from anon, authenticated;
grant select, insert, update on table public.k_standing_orders to anon, authenticated;
grant all on table public.k_standing_orders to service_role;
revoke all on table public.k_users from anon, authenticated;
grant select on table public.k_users to authenticated;
grant all on table public.k_users to service_role;

alter table public.k_entries enable row level security;
drop policy if exists k_entries_users on public.k_entries;
create policy k_entries_users on public.k_entries as permissive for all to authenticated using (k_is_user()) with check (k_is_user());
alter table public.k_lookups enable row level security;
drop policy if exists k_lookups_users on public.k_lookups;
create policy k_lookups_users on public.k_lookups as permissive for all to authenticated using (k_is_user()) with check (k_is_user());
alter table public.k_pledges enable row level security;
drop policy if exists k_pledges_users on public.k_pledges;
create policy k_pledges_users on public.k_pledges as permissive for all to authenticated using (k_is_user()) with check (k_is_user());
alter table public.k_settings enable row level security;
drop policy if exists k_settings_users on public.k_settings;
create policy k_settings_users on public.k_settings as permissive for all to authenticated using (k_is_user()) with check (k_is_user());
alter table public.k_so_instances enable row level security;
drop policy if exists k_so_instances_users on public.k_so_instances;
create policy k_so_instances_users on public.k_so_instances as permissive for all to authenticated using (k_is_user()) with check (k_is_user());
alter table public.k_standing_orders enable row level security;
drop policy if exists k_standing_orders_users on public.k_standing_orders;
create policy k_standing_orders_users on public.k_standing_orders as permissive for all to authenticated using (k_is_user()) with check (k_is_user());
alter table public.k_users enable row level security;
drop policy if exists k_users_select on public.k_users;
create policy k_users_select on public.k_users as permissive for select to authenticated using (k_is_user());

drop trigger if exists k_entries_notify on public.k_entries;
create trigger k_entries_notify AFTER INSERT ON public.k_entries FOR EACH ROW EXECUTE FUNCTION k_entries_notify();
drop trigger if exists k_so_instances_notify on public.k_so_instances;
create trigger k_so_instances_notify AFTER INSERT ON public.k_so_instances FOR EACH ROW EXECUTE FUNCTION k_so_instances_notify();
