// app/icons.js — סט האייקונים של הממשק: קו אחד, פינות מעוגלות, בצבע הטקסט
// כולם באותה רשת (24) ובאותו עובי קו — אמוג׳י מתחלף בין מערכות ההפעלה ואינו נשמע לצבע.
var PATHS = {
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

function icon(name) {
  return '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round" stroke-linejoin="round">' + (PATHS[name] || '') + '</svg>';
}

export { icon };
