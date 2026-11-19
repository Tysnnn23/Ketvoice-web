/* Ketvoice web player — the service worker (scope /player): keeps the app shell so the installed app opens at
 * once and without a network. The page (/player) is asked from the network first (4 s, then the copy kept); the
 * site's own scripts, styles, fonts and images are kept by their full address (their ?v= changes with each
 * release, so a new one is fetched). Never kept: audio and video, ranges, other sites (Supabase, the Ketvoice API,
 * YouTube, covers), anything not GET. Caches are named after VERSION; an older version's are deleted on activate. */
'use strict';

var VERSION = '7.0.0-1';
var PREFIX = 'kv-player-';
var SHELL = PREFIX + 'shell-' + VERSION;
var STATIC = PREFIX + 'static-' + VERSION;
var PAGE = '/player';
var SHELL_URLS = [PAGE, '/player.webmanifest', '/assets/fonts/inter-var.woff2', '/assets/ketvoice-logo-vc-96.png',
  '/favicon-192.png', '/favicon-512.png', '/apple-touch-icon.png', '/favicon.ico'];
var KEEP = { script: 1, style: 1, font: 1, image: 1, manifest: 1 };

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(SHELL).then(function (c) {
    // One address that fails does not stop the others.
    return Promise.all(SHELL_URLS.map(function (u) { return c.add(new Request(u, { cache: 'reload' })).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf(PREFIX) === 0 && k !== SHELL && k !== STATIC; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function pageFromNetwork(req) {
  return new Promise(function (resolve, reject) {
    var timer = setTimeout(function () { reject(new Error('slow')); }, 4000);
    fetch(req).then(function (r) {
      clearTimeout(timer);
      if (r.ok) { var copy = r.clone(); caches.open(SHELL).then(function (c) { c.put(PAGE, copy); }); }
      resolve(r);
    }, function (err) { clearTimeout(timer); reject(err); });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    if (url.pathname !== PAGE && url.pathname !== '/player.html') return;
    e.respondWith(pageFromNetwork(req).catch(function () {
      return caches.match(PAGE).then(function (r) { return r || fetch(req); });
    }));
    return;
  }
  if (!KEEP[req.destination] || /\.(mp3|m4a|flac|ogg|opus|wav|mp4|webm)$/i.test(url.pathname)) return;
  e.respondWith(caches.match(req).then(function (hit) {
    if (hit) return hit;
    return fetch(req).then(function (r) {
      if (r.ok && r.type === 'basic') { var copy = r.clone(); caches.open(STATIC).then(function (c) { c.put(req, copy); }); }
      return r;
    });
  }));
});
