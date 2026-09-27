// sw.js — service worker של האפליקציה
importScripts('./app.config.js');
// מכאן נגזרת גרסת האפליקציה שבבאנר.
var CACHE_NAME = self.APP.id + '-v98';

var CORE = [
  './',
  './index.html',
  './app.config.js',
  './core/boot.js',
  './core/sw.js',
  './core/ui.css',
  './core/chart.css',
  './app.css',
  './core/util.js',
  './core/sync.js',
  './core/storage.js',
  './core/mirror.js',
  './core/backup.js',
  './core/ui.js',
  './core/chart.js',
  './core/hebrew.js',
  './app/state.js',
  './app/config.js',
  './app/domain.js',
  './app/screens/archive.js',
  './app/screens/done.js',
  './app/screens/month.js',
  './app/screens/settings.js',
  './app/screens/slide.js',
  './app/main.js',
  './manifest.json',
  './icons/icon-192.b77bc564.png',
  './icons/icon-512.0340804e.png',
];

// גרסאות נעוצות במדויק — major צף נשבר בשחרור של הספק בלי שינוי קוד.
var CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.111.0/dist/umd/supabase.js'
];

importScripts('./core/sw.js');
