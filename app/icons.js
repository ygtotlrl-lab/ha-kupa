// app/icons.js — סט האייקונים של הממשק: קו אחד, פינות מעוגלות, בצבע הטקסט
// כולם באותה רשת (24) ובאותו עובי קו — אמוג׳י מתחלף בין מערכות ההפעלה ואינו נשמע לצבע.
import { iconSet, shellIcon } from '../core/icons.js';
var PATHS = {
  // אייקוני המצב — טוסט · כותרת · כפתור עסוק · סרגל הסנכרון (stIcon בליבה)
  good:     '<circle cx="12" cy="12" r="9"/><path d="M8 12.4l2.8 2.8L16.2 9.6"/>',
  bad:      '<circle cx="12" cy="12" r="9"/><path d="M9.2 9.2l5.6 5.6M14.8 9.2l-5.6 5.6"/>',
  warn:     '<path d="M10.3 4.4L2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.4a2 2 0 0 0-3.4 0z"/><path d="M12 9.5v4.5M12 17.4v.1"/>',
  off:      '<path d="M3 3l18 18"/><path d="M8.6 16.3a5 5 0 0 1 6.8 0"/><path d="M5.2 12.8a10 10 0 0 1 4-2.3M18.8 12.8a10 10 0 0 0-2.4-1.7"/><path d="M2 9.2a15 15 0 0 1 4.3-2.6M22 9.2a15 15 0 0 0-10.6-4"/><path d="M12 19.8v.1"/>',
  wait:     '<path d="M7 3h10M7 21h10"/><path d="M8 3v3.2a4 4 0 0 0 1.4 3L12 12l2.6-2.8A4 4 0 0 0 16 6.2V3"/><path d="M8 21v-3.2a4 4 0 0 1 1.4-3L12 12l2.6 2.8a4 4 0 0 1 1.4 3V21"/>',
  refresh:  '<path d="M20 12a8 8 0 1 1-2.34-5.66L20 8.5"/><path d="M20 3.5v5h-5"/>',
  close:    '<path d="M6 6l12 12M18 6L6 18"/>',
  home:     '<path d="M4 11l8-7 8 7"/><path d="M7 10v10h10V10"/>',
  archive:  '<path d="M4 8h16v12H4z"/><path d="M3 4h18v4H3z"/><path d="M10 12h4"/>',
  settings: '<path d="M4 6h8.5M16.5 6H20M4 12h2.5M10.5 12H20M4 18h6.5M14.5 18H20"/><circle cx="14.5" cy="6" r="2"/><circle cx="8.5" cy="12" r="2"/><circle cx="12.5" cy="18" r="2"/>',
  plus:     '<path d="M12 5v14M5 12h14"/>',
  other:    '<path d="M12 4v16M4 12h16"/>',
  standing: '<path d="M12 7v5l3 2"/><circle cx="12" cy="12" r="9"/>',
  amount:   '<path d="M12 3v18"/><path d="M7 8h7a3 3 0 0 1 0 6H7"/>',
  desc:     '<path d="M5 6h14M5 11h14M5 16h9"/>',
  method:   '<path d="M3 7h18v10H3z"/><path d="M3 11h18"/>',
  date:     '<path d="M4 6h16v14H4z"/><path d="M4 10h16M8 3v4M16 3v4"/>',
  category: '<path d="M4 5h7l2 3h7v11H4z"/>',
  prev:     '<path d="M9 6l6 6-6 6"/>',
  next:     '<path d="M15 6l-6 6 6 6"/>',
  up:       '<path d="M6 15l6-6 6 6"/>',
  down:     '<path d="M6 9l6 6 6-6"/>'
};

// הצייר — core/icons.js, גוף אחד בכולן; כאן רק הסט.
var icon = iconSet(PATHS);
shellIcon('close', icon('close')); // ✕ של המעטפת והליבה — מהסט של האפליקציה
shellIcon('refresh', icon('refresh')); // באנר העדכון
['good', 'bad', 'warn', 'off', 'wait'].forEach(function (n) { shellIcon(n, icon(n)); }); // אייקוני המצב

export { icon };
