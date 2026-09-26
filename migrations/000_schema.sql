-- ═══ 000_schema.sql — הקופה: הסכימה החיה ═══════════════════════════════

-- ─── הקופה ─────────────────────────────────────────────────────────────

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
  hebrew_year text not null,
  pledge numeric not null,
  chumash_opening_balance numeric,
  created_at timestamp with time zone default now(),
  updated_at bigint not null,
  deleted boolean default false,
  deleted_at timestamp with time zone,
  deleted_by text,
  constraint k_pledges_pkey PRIMARY KEY (client_id),
  constraint k_pledges_hebrew_year_key UNIQUE (hebrew_year)
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
  month_key text not null,
  amount numeric not null,
  created_at timestamp with time zone default now(),
  updated_at bigint not null,
  deleted boolean default false,
  deleted_at timestamp with time zone,
  deleted_by text,
  constraint k_so_instances_pkey PRIMARY KEY (client_id)
);

create table if not exists public.k_standing_orders (
  client_id text not null,
  name text not null,
  amount numeric not null,
  day_of_month integer not null,
  method text,
  category text,
  active boolean default true,
  valid_from_month text,
  valid_to_month text,
  supersedes_id text,
  created_at timestamp with time zone default now(),
  updated_at bigint not null,
  deleted boolean default false,
  deleted_at timestamp with time zone,
  deleted_by text,
  constraint k_standing_orders_pkey PRIMARY KEY (client_id)
);

create index if not exists k_entries_date_idx ON public.k_entries USING btree (entry_date);
create index if not exists k_entries_type_idx ON public.k_entries USING btree (type, deleted);
create index if not exists k_lookups_kind_idx ON public.k_lookups USING btree (kind, sort);
create index if not exists k_so_instances_month_idx ON public.k_so_instances USING btree (month_key);
create index if not exists k_so_instances_order_idx ON public.k_so_instances USING btree (standing_order_client_id);

-- ⛔ revoke לפני grant — GRANT מוסיף ואינו מחליף, וטבלה חדשה ב-Supabase נולדת
--    עם DELETE ו-TRUNCATE ל-anon: המחיקה היא deleted=true, ולא DELETE.
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

alter table public.k_entries enable row level security;
drop policy if exists k_entries_all on public.k_entries;
create policy k_entries_all on public.k_entries as permissive for all to anon, authenticated using (true) with check (true);
alter table public.k_lookups enable row level security;
drop policy if exists k_lookups_all on public.k_lookups;
create policy k_lookups_all on public.k_lookups as permissive for all to anon, authenticated using (true) with check (true);
alter table public.k_pledges enable row level security;
drop policy if exists k_pledges_all on public.k_pledges;
create policy k_pledges_all on public.k_pledges as permissive for all to anon, authenticated using (true) with check (true);
alter table public.k_settings enable row level security;
drop policy if exists k_settings_all on public.k_settings;
create policy k_settings_all on public.k_settings as permissive for all to anon, authenticated using (true) with check (true);
alter table public.k_so_instances enable row level security;
drop policy if exists k_so_instances_all on public.k_so_instances;
create policy k_so_instances_all on public.k_so_instances as permissive for all to anon, authenticated using (true) with check (true);
alter table public.k_standing_orders enable row level security;
drop policy if exists k_standing_orders_all on public.k_standing_orders;
create policy k_standing_orders_all on public.k_standing_orders as permissive for all to anon, authenticated using (true) with check (true);
