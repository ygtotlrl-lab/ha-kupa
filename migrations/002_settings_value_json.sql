-- ═══════════════════════════════════════════════════════════════════════════
-- 002_settings_value_json.sql — האילוץ שמבטיח JSON בעמודת הערך
-- מצב ההרצה: רץ במסד
-- ═══════════════════════════════════════════════════════════════════════════
-- ⛔ עמודת `value` נושאת JSON תקין — ⚠️ גם למחרוזת: ⭐ `"טקסט"` ולא `טקסט`.
-- ⛔ והאילוץ הוא מה שמונע את הכתיבה הבאה — ⚠️ הטבלה נוצרה בלעדיו,
--    ⭐ והקורא שעושה `JSON.parse` היה זורק על הערך החשוף.
-- ⚠️ אידמפוטנטי — ⭐ אילוץ שכבר קיים אינו נוסף שוב.
-- ═══════════════════════════════════════════════════════════════════════════
do $$
begin
  if not exists (
    select 1 from pg_constraint c
      join pg_class r on r.oid = c.conrelid
      join pg_namespace n on n.oid = r.relnamespace
     where n.nspname = 'public' and r.relname = 'kp_settings'
       and c.conname = 'kp_settings_value_json')
  then
    alter table public.kp_settings
      add constraint kp_settings_value_json
      check (value is null or value::jsonb is not null);
  end if;
end $$;
