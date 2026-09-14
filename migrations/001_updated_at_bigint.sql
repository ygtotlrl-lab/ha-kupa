-- ==========================================================================
-- 001_updated_at_bigint.sql — החותמת הופכת ל-bigint, וברירת המחדל יורדת
-- ==========================================================================
--
-- ⛔ **רצה במסד** — ⚠️ הוחלה בסבב 145 ואומתה: כל עמודות החותמת `bigint`,
--    בלי ברירת מחדל, ו-`not null`.
--
-- ⛔ הטבלאות הוקמו עם `updated_at timestamptz default now()` — ⚠️ וזו
--    חותמת **שרת**: ⭐ היא אומרת מתי הרשומה **הגיעה** ולא מתי **נערכה**,
--    ⛔ ולכן מכשיר שערך אופליין ודחף מאוחר נראה חדש יותר מעריכה שקדמה לו
--    ודורס אותה.
-- ⛔ וברירת המחדל יורדת — ⚠️ היא מקור חותמת שני שמתמלא בשקט כשהקוד שוכח,
--    ⭐ ו-`not null` בלעדיה מפיל כתיבה כזו ברעש.
-- ⛔ וההמרה משמרת את החותמת המקורית — ⚠️ `extract(epoch)` במילישניות,
--    ⛔ ואינה חותמת ב-`now()`: ⭐ אפס אינו «לא ידוע» אלא **הישן ביותר**.
-- ⚠️ אידמפוטנטי — ⭐ עמודה שכבר `bigint` אינה מומרת שוב.
-- ==========================================================================
-- ==========================================================================

do $$
declare
  t text;
  v text;
begin
  foreach t in array array['kp_settings','kp_years','kp_months',
                           'kp_standing_orders','kp_so_instances',
                           'kp_entries','kp_lookups']
  loop
    select data_type into v
      from information_schema.columns
     where table_schema = 'public' and table_name = t and column_name = 'updated_at';
    if v is null then
      raise exception '001: %.updated_at חסרה — מסרב לרוץ', t;
    end if;
    execute format('alter table public.%I alter column updated_at drop default', t);
    if v <> 'bigint' then
      execute format(
        'alter table public.%I alter column updated_at type bigint '
        'using (case when updated_at is null then 0 '
        '            else (extract(epoch from updated_at) * 1000)::bigint end)', t);
    end if;
    execute format('update public.%I set updated_at = 0 where updated_at is null', t);
    execute format('alter table public.%I alter column updated_at set not null', t);
  end loop;
end $$;
