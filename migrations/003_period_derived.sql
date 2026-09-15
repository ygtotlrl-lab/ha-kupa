-- ==========================================================================
-- 003_period_derived.sql — התקופה נגזרת, והפלעדזש נושא את שמו
-- ==========================================================================
--
-- ⛔ **רצה במסד** — ⚠️ הוחלה בסבב 148, ⭐ ושבע הטבלאות היו ריקות.
--
-- ⛔ `kp_months` יורדת — ⚠️ החודש והשנה מחושבים מתאריך הרשומה: ⭐ טבלת
--    תקופות היא תחליף למנוע שחסר, ⛔ והיא נשברת בהתקנה טרייה ובכל תקופה
--    שלא הוזנה.
-- ⛔ ו-`kp_years` ⟵ `kp_pledges` — ⚠️ היא אינה טבלת תקופה: ⭐ היא נושאת
--    את הפלעדזש לשנה, ⛔ ושמה יאמר את הערך ולא את התקופה.
-- ⛔ והעמודה `pleziash` ⟵ `pledge` — ⚠️ האיות היה משובש בשתי השפות,
--    ⭐ והמונח הוא התעתיק של `pledge`.
-- ⛔ ו-`month_client_id` של המופע ⟵ `month_key` — ⚠️ הוא כבר אינו מפנה
--    לשורה: ⭐ הוא מפתח מחושב, ⛔ ושם שמסתיר תפקיד הוא מה שכמעט הפיל אותנו.
-- ⛔ ושל הרישום יורדת כליל — ⚠️ החודש נגזר מ-`entry_date`: ⭐ ערך נגזר
--    שנשמר ברשומה מתיישן ביום שהתאריך נערך.
-- ⚠️ אידמפוטנטי — ⭐ כל צעד נבדק לפני שהוא רץ, ⛔ וריצה שנייה אינה משנה דבר.
-- ⛔ ואין מפתח זר פיזי — ⚠️ הקשר אב-ובן נאכף בקוד ובמיזוג.
-- ⛔ וההרשאות `select, insert, update` בלבד — ⚠️ אין `delete` ואין `truncate`.
-- ==========================================================================
-- ==========================================================================

do $$
begin
  -- ── א · הטבלה מקבלת את שמה ───────────────────────────────────────────────
  if to_regclass('public.kp_years') is not null
     and to_regclass('public.kp_pledges') is null then
    execute 'alter table public.kp_years rename to kp_pledges';
  end if;

  -- ── ב · והעמודה את איותה ─────────────────────────────────────────────────
  if to_regclass('public.kp_pledges') is not null
     and exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'kp_pledges'
                    and column_name = 'pleziash') then
    execute 'alter table public.kp_pledges rename column pleziash to pledge';
  end if;

  -- ── ג · המופע נושא מפתח מחושב ולא הפניה לשורה ────────────────────────────
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'kp_so_instances'
                and column_name = 'month_client_id') then
    execute 'alter table public.kp_so_instances rename column month_client_id to month_key';
  end if;

  -- ── ד · והרישום גוזר את חודשו מתאריכו ────────────────────────────────────
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'kp_entries'
                and column_name = 'month_client_id') then
    execute 'drop index if exists public.kp_entries_month_idx';
    execute 'alter table public.kp_entries drop column month_client_id';
  end if;

  -- ── ה · וטבלת התקופה יורדת ───────────────────────────────────────────────
  if to_regclass('public.kp_months') is not null then
    execute 'drop table public.kp_months';
  end if;
end $$;

create index if not exists kp_entries_date_idx    on public.kp_entries (entry_date);
create index if not exists kp_so_inst_mkey_idx    on public.kp_so_instances (month_key);

-- ⛔ ההרשאות נכתבות מחדש לטבלה ששמה השתנה — ⚠️ שם חדש הוא אובייקט חדש
--    בעיני ה-`grant`, ⭐ והשם הישן אינו קיים עוד.
do $$
declare t text;
begin
  foreach t in array array['kp_pledges']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists kp_all on public.%I', t);
    execute format('create policy kp_all on public.%I for all using (true) with check (true)', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update on public.%I to anon, authenticated', t);
  end loop;
end $$;
