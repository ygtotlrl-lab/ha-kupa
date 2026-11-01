// sw.js — service worker של האפליקציה
importScripts('./app.config.js');
// מכאן נגזרת גרסת האפליקציה שבבאנר.
var CACHE_NAME = self.APP.id + '-v138';

var CORE = [
  './',
  './index.html',
  './app.config.js',
  './core/boot.js',
  './core/sw.js',
  './core/ui.css',
  './core/chart.css',
  './app/style.css',
  './core/util.js',
  './core/icons.js',
  './core/sync.js',
  './core/storage.js',
  './core/mirror.js',
  './core/backup.js',
  './core/boot-run.js',
  './core/ui.js',
  './core/chart.js',
  './core/hebrew.js',
  './app/constants.js',
  './app/icons.js',
  './app/state.js',
  './app/domain.js',
  './app/screens/archive.js',
  './app/screens/done.js',
  './app/screens/month.js',
  './app/screens/settings.js',
  './app/screens/slide.js',
  './app/main.js',
  './manifest.json',
  './icons/icon-192.d0797c7a.png',
  './icons/icon-512.70f11a54.png',
];

// גרסאות נעוצות במדויק — major צף נשבר בשחרור של הספק בלי שינוי קוד.
var CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.111.0/dist/umd/supabase.js'
];

importScripts('./core/sw.js');
