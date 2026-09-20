-- ==========================================================================
-- 005_settings_key_no_prefix.sql — מפתח בטבלת ההגדרות בלי תחילית
-- ==========================================================================
--
-- ⛔⛔ **מה הקובץ עושה:** ⚠️ מסב את שורת `k_last_changed` שב-`k_settings`
--    ל-`last_changed` — ⭐ המפתח האחרון בשני הפרויקטים שנשא תחילית.
--
-- ⛔⛔ **הנימוק:** ⚠️ **הטבלה כבר נושאת את התחילית** — ⭐ ומפתח שנושא אותה
--    כופל את הזהות: ⛔ ושינוי תחילית שובר אותו בשקט — ⚠️ הקוד מבקש את
--    החדש, המסד מחזיק את הישן, ⭐ **והקריאה אינה נופלת** — ⛔ היא מחזירה
--    ריק, ⚠️ ומסך ריק נראה כמסך שאין בו נתונים.
--
-- ⚠️ אידמפוטנטי — ⭐ הצעד נבדק לפני שהוא רץ, ⛔ וריצה שנייה אינה משנה דבר.
-- ⛔ ואפס `drop` ואפס `truncate` — ⚠️ שינוי שם מפתח בלבד.
-- ==========================================================================

do $$
begin
  if exists (select 1 from public.k_settings where key = 'k_last_changed')
     and not exists (select 1 from public.k_settings where key = 'last_changed') then
    update public.k_settings set key = 'last_changed' where key = 'k_last_changed';
  elsif exists (select 1 from public.k_settings where key = 'k_last_changed') then
    -- ⛔ שתי השורות קיימות — ⚠️ המאוחרת מנצחת, ⭐ והישנה נגרעת בסימון
    --    ולא במחיקה פיזית: ⛔ אין `delete` בשום מסלול.
    update public.k_settings d
       set value = s.value, updated_at = s.updated_at
      from public.k_settings s
     where d.key = 'last_changed' and s.key = 'k_last_changed'
       and s.updated_at > d.updated_at;
    update public.k_settings set key = 'last_changed_retired' where key = 'k_last_changed';
  end if;
end $$;
