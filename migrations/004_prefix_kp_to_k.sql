-- ==========================================================================
-- 004_prefix_kp_to_k.sql — תחילית הטבלאות והאחסון מוסבת לראשי התיבות
-- ==========================================================================
--
-- ⛔ **רצה במסד** — ⚠️ הוחלה בסבב 148 בעסקה אחת עם רשימת-ההיתר שבריפו
--    הבעלים: ⭐ שש הטבלאות היו ריקות באפס שורות, ⛔ ואין מה להמיר ואין
--    מה לאבד.
--
-- ⛔⛔ **מה הקובץ עושה:** ⚠️ מסב את שמות שש הטבלאות של הקופה, ואיתם שמונת
--    האילוצים, שישה אינדקסים ושש המדיניות — ⭐ ומעדכן את 33 שורות הגיבוי
--    שנוקבות בשם הישן.
--
-- ⛔⛔ **הנימוק:** ⚠️ התחילית היא ראשי התיבות של השם העברי בלי ה״א הידיעה,
--    ⭐ ו«הקופה» הוא שם חד-מילי — ⛔ ולכן `k_`: ⚠️ **ו-`kp_` אינו עקבי עם
--    `ha-kupa`** — ⭐ אין בשם מילה שמתחילה ב-`p`.
--
-- ⛔⛔ **ולמה בעסקה אחת עם רשימת-ההיתר:** ⚠️ הפינוי גורע **בהתאמה מדויקת**
--    לשם — ⭐ ושם ישן ברשימה, לרגע אחד, הוא פינוי מושהה: ⛔ הגיבוי היה
--    נצבר בלי תקרה עד שהרשימה תיכתב מחדש.
--
-- ⚠️ **ואילוצי `kp_years`** — ⛔ הם שריד מהסבב שהסב את הטבלה ל-`kp_pledges`
--    ⚠️ ו-`alter table rename` אינו נוגע בשם האילוץ: ⭐ הם מקבלים כאן את
--    שם הטבלה שהם יושבים עליה.
-- ⚠️ אידמפוטנטי — ⭐ כל צעד נבדק לפני שהוא רץ, ⛔ וריצה שנייה אינה משנה דבר.
-- ⛔ ואפס `delete` ואפס `drop` — ⚠️ שינוי שם בלבד, ⭐ ועדכון מפתח בגיבוי.
-- ==========================================================================

-- ── 1 · שש הטבלאות ─────────────────────────────────────────────────────────
-- ⛔ ההסבה נכתבת בשמות מפורשים ⛔ ולא ב-`format('%I')` — ⚠️ שם שנבנה בזמן
--    ריצה אינו נגזר מהטקסט, ⭐ ושער שמצליב הצהרה מול הסכימה שבמיגרציות
--    היה קורא את העמודה תחת שמה הישן לנצח.
do $$
begin
  if to_regclass('public.kp_settings') is not null
     and to_regclass('public.k_settings') is null then
    alter table public.kp_settings rename to k_settings;
  end if;
  if to_regclass('public.kp_pledges') is not null
     and to_regclass('public.k_pledges') is null then
    alter table public.kp_pledges rename to k_pledges;
  end if;
  if to_regclass('public.kp_standing_orders') is not null
     and to_regclass('public.k_standing_orders') is null then
    alter table public.kp_standing_orders rename to k_standing_orders;
  end if;
  if to_regclass('public.kp_so_instances') is not null
     and to_regclass('public.k_so_instances') is null then
    alter table public.kp_so_instances rename to k_so_instances;
  end if;
  if to_regclass('public.kp_entries') is not null
     and to_regclass('public.k_entries') is null then
    alter table public.kp_entries rename to k_entries;
  end if;
  if to_regclass('public.kp_lookups') is not null
     and to_regclass('public.k_lookups') is null then
    alter table public.kp_lookups rename to k_lookups;
  end if;
end $$;

-- ── 2 · שמונת האילוצים ─────────────────────────────────────────────────────
do $$
declare r record;
begin
  for r in
    select t.tbl, t.old, t.new from (values
      ('k_settings',        'kp_settings_pkey',             'k_settings_pkey'),
      ('k_settings',        'kp_settings_value_json',       'k_settings_value_json'),
      ('k_pledges',         'kp_years_pkey',                'k_pledges_pkey'),
      ('k_pledges',         'kp_years_hebrew_year_key',     'k_pledges_hebrew_year_key'),
      ('k_standing_orders', 'kp_standing_orders_pkey',      'k_standing_orders_pkey'),
      ('k_so_instances',    'kp_so_instances_pkey',         'k_so_instances_pkey'),
      ('k_entries',         'kp_entries_pkey',              'k_entries_pkey'),
      ('k_lookups',         'kp_lookups_pkey',              'k_lookups_pkey')
    ) as t(tbl, old, new)
  loop
    if exists (select 1 from pg_constraint c
                join pg_class cl on cl.oid = c.conrelid
                join pg_namespace ns on ns.oid = cl.relnamespace
               where ns.nspname = 'public' and cl.relname = r.tbl and c.conname = r.old) then
      execute format('alter table public.%I rename constraint %I to %I', r.tbl, r.old, r.new);
    end if;
  end loop;
end $$;

-- ── 3 · ששת האינדקסים שאינם אילוץ ──────────────────────────────────────────
do $$
declare r record;
begin
  for r in
    select t.old, t.new from (values
      ('kp_entries_date_idx',    'k_entries_date_idx'),
      ('kp_entries_type_idx',    'k_entries_type_idx'),
      ('kp_lookups_kind_idx',    'k_lookups_kind_idx'),
      ('kp_so_inst_mkey_idx',    'k_so_inst_mkey_idx'),
      ('kp_so_inst_month_idx',   'k_so_inst_month_idx'),
      ('kp_so_inst_order_idx',   'k_so_inst_order_idx')
    ) as t(old, new)
  loop
    if to_regclass('public.' || r.old) is not null
       and to_regclass('public.' || r.new) is null then
      execute format('alter index public.%I rename to %I', r.old, r.new);
    end if;
  end loop;
end $$;

-- ── 4 · שש המדיניות ────────────────────────────────────────────────────────
do $$
declare r record;
begin
  for r in
    select tablename from pg_policies
     where schemaname = 'public' and policyname = 'kp_all'
  loop
    execute format('alter policy %I on public.%I rename to %I', 'kp_all', r.tablename, 'k_all');
  end loop;
end $$;

-- ── 5 · 33 מפתחות הגיבוי ───────────────────────────────────────────────────
-- ⛔ `replace` ⛔ ולא חיתוך הפותח — ⚠️ המפתח נושא שכבה לפניו (`ANCHOR:`),
--    ⭐ והשם היושב אחריה הוא מה שמוסב.
update public.sh_backup
   set key = replace(key, 'kp_', 'k_')
 where key like '%kp\_%';
