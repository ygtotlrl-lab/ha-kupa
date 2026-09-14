-- ==========================================================================
-- 000_initial_schema.sql — הסכימה המלאה של «הקופה»
-- ==========================================================================
--
-- ⛔ **רצה במסד** — ⚠️ הטבלאות הוקמו בידי המנהל לפני הסבב, ⭐ והקובץ
--    מתאר אותן כפי שהן חיות.
--
-- ⛔ קובץ אחד להתקנה טרייה, אידמפוטנטי — ⚠️ כל `create table` נושא
--    `if not exists`, ⭐ ולכן הרצה שנייה אינה משנה דבר.
-- ⛔ `updated_at` הוא `bigint` — חותמת מכשיר במילישניות — ⚠️ ואין לה
--    ברירת מחדל: ⭐ ברירה בצד השרת היא מקור חותמת שני שמתמלא בשקט כשהקוד
--    שוכח, ⛔ ו-`not null` בלעדיה מפיל כתיבה כזו ברעש.
-- ⛔ ואין מפתח זר פיזי — ⚠️ הקשר אב-ובן נאכף בקוד ובמיזוג: ⭐ מפתח זר
--    פיזי היה מפיל דחיפה של בן שהגיע לפני אביו, ⛔ והתור נחסם.
-- ⛔ וההרשאות `select, insert, update` בלבד — ⚠️ אין `delete` ואין
--    `truncate`: ⭐ `DELETE` ברמת המסד עוקף את המחיקה הרכה.
-- ==========================================================================
-- ==========================================================================

create table if not exists public.kp_settings (
  key         text primary key,
  value       jsonb,
  updated_at  bigint not null,
  client_id   text,
  deleted     boolean default false,
  deleted_at  timestamptz,
  deleted_by  text,
  constraint kp_settings_value_json check (value is null or value::jsonb is not null)
);

create table if not exists public.kp_years (
  client_id               text primary key,
  hebrew_year             text not null unique,
  pleziash                numeric not null,
  chumash_opening_balance numeric,
  created_at              timestamptz default now(),
  updated_at              bigint not null,
  deleted                 boolean default false,
  deleted_at              timestamptz,
  deleted_by              text
);

create table if not exists public.kp_months (
  client_id   text primary key,
  hebrew_year text not null,
  name        text not null,
  ordinal     integer not null,
  start_date  date,
  end_date    date,
  closed_at   timestamptz,
  created_at  timestamptz default now(),
  updated_at  bigint not null,
  deleted     boolean default false,
  deleted_at  timestamptz,
  deleted_by  text
);

create table if not exists public.kp_standing_orders (
  client_id        text primary key,
  name             text not null,
  amount           numeric not null,
  day_of_month     integer not null,
  method           text,
  category         text,
  active           boolean default true,
  valid_from_month text,
  valid_to_month   text,
  supersedes_id    text,
  created_at       timestamptz default now(),
  updated_at       bigint not null,
  deleted          boolean default false,
  deleted_at       timestamptz,
  deleted_by       text
);

create table if not exists public.kp_so_instances (
  client_id                text primary key,
  standing_order_client_id text not null,
  month_client_id          text not null,
  amount                   numeric not null,
  status                   text default 'pending',
  created_at               timestamptz default now(),
  updated_at               bigint not null,
  deleted                  boolean default false,
  deleted_at               timestamptz,
  deleted_by               text
);

create table if not exists public.kp_entries (
  client_id             text primary key,
  month_client_id       text not null,
  type                  text not null,
  amount                numeric not null,
  description           text,
  entry_date            date not null,
  method                text,
  category              text,
  source                text default 'manual',
  verified              boolean default false,
  so_instance_client_id text,
  created_at            timestamptz default now(),
  updated_at            bigint not null,
  deleted               boolean default false,
  deleted_at            timestamptz,
  deleted_by            text
);

create table if not exists public.kp_lookups (
  client_id  text primary key,
  kind       text not null,
  label      text not null,
  sort       integer default 0,
  created_at timestamptz default now(),
  updated_at bigint not null,
  deleted    boolean default false,
  deleted_at timestamptz,
  deleted_by text
);

-- ── אינדקסים ───────────────────────────────────────────────────────────────
create index if not exists kp_months_year_idx    on public.kp_months (hebrew_year, ordinal);
create index if not exists kp_entries_month_idx  on public.kp_entries (month_client_id, entry_date);
create index if not exists kp_entries_type_idx   on public.kp_entries (type, deleted);
create index if not exists kp_so_inst_month_idx  on public.kp_so_instances (month_client_id);
create index if not exists kp_so_inst_order_idx  on public.kp_so_instances (standing_order_client_id);
create index if not exists kp_lookups_kind_idx   on public.kp_lookups (kind, sort);

-- ── RLS והרשאות ────────────────────────────────────────────────────────────
-- ⛔ RLS פתוח — ⚠️ החלטה מודעת, כמו בגיוס: ⭐ ההרשאות נאכפות בשכבת
--    האפליקציה, ⛔ ומי שמחזיק את המפתח הציבורי קורא וכותב הכול.
do $$
declare t text;
begin
  foreach t in array array['kp_settings','kp_years','kp_months',
                           'kp_standing_orders','kp_so_instances',
                           'kp_entries','kp_lookups']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists kp_all on public.%I', t);
    execute format('create policy kp_all on public.%I for all using (true) with check (true)', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update on public.%I to anon, authenticated', t);
  end loop;
end $$;
