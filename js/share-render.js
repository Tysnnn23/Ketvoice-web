/* Public pages of Ketvoice (7.0): an artist (/artist/UC…), an album (/album/MPRE…), a listener's profile (/u/handle),
   and the preview tags of the song share page (/listen). One renderer for both sides: api/og-page.js builds the
   whole HTML on Vercel (link-preview robots and Discord do not run JavaScript, so og:title, og:description and
   og:image must be in the answer), js/share.js renders the same markup in the browser when the server had no data.
   Everything that comes from the catalogue or a link is cleaned, cut and escaped here; images only from the hosts
   the catalogue uses; links only from ids that passed the same patterns as the ketvoice-catalog Edge Function. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ShareRender = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SITE = 'https://ketvoice-web.vercel.app';
  var DEFAULT_IMAGE = 'https://raw.githubusercontent.com/Tysnnn23/Ketvoice/main/ketvoice-banner.png';
  var ID = {
    artist: /^UC[A-Za-z0-9_-]{10,40}$/,
    album: /^MPRE[A-Za-z0-9_-]{5,80}$/,
    profile: /^[a-z0-9_.]{3,24}$/
  };
  // Where covers and photos come from (YouTube Music, Ketvoice's storage, the usual cover hosts).
  var IMAGE_HOSTS = ['googleusercontent.com', 'ggpht.com', 'ytimg.com', 'xodklrunqlzyeiqtovgx.supabase.co', 'mzstatic.com',
    'dzcdn.net', 'scdn.co', 'raw.githubusercontent.com', 'coverartarchive.org', 'archive.org'];
  var HOSTS = ['ketvoice-web.vercel.app', 'ketvoice.vercel.app'];

  /** A string from outside: no control or direction-override characters, spaces collapsed, at most max characters. */
  function clean(value, max) {
    if (value == null) return '';
    var s = String(value).replace(/[\u0000-\u001f\u007f-\u009f\u200b\u202a-\u202e\u2066-\u2069\ufeff]/g, ' ').replace(/\s+/g, ' ').trim();
    var chars = Array.from(s);
    return chars.length > max ? chars.slice(0, max - 1).join('').trim() + '…' : s;
  }
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function safeImage(value) {
    if (typeof value !== 'string' || value.length > 1000) return '';
    var u;
    try { u = new URL(value); } catch (e) { return ''; }
    if (u.protocol !== 'https:' || u.username || u.password || u.port) return '';
    var host = u.hostname.toLowerCase();
    var ok = IMAGE_HOSTS.some(function (h) { return host === h || host.slice(-h.length - 1) === '.' + h; });
    return ok ? u.href : '';
  }
  function validId(kind, id) { return typeof id === 'string' && !!ID[kind] && ID[kind].test(id); }
  function normHandle(value) { return clean(value, 40).toLowerCase().replace(/^@/, ''); }
  function origin(host) { host = String(host || '').toLowerCase(); return HOSTS.indexOf(host) >= 0 ? 'https://' + host : SITE; }
  function list(v) { return Array.isArray(v) ? v : []; }
  function clock(ms) {
    var s = Math.round((Number(ms) || 0) / 1000);
    if (s <= 0) return '';
    var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), r = s % 60;
    return (h ? h + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (r < 10 ? '0' : '') + r;
  }

  /* ---------- the catalogue's answers, kept to what a public page shows ---------- */
  function track(t) {
    if (!t || typeof t !== 'object') return null;
    var title = clean(t.title, 200);
    if (!title) return null;
    var out = { title: title, artist: clean(t.artist, 200), album: clean(t.album, 200), durationMs: Math.max(0, Math.min(Number(t.durationMs) || 0, 36e6)) };
    var cover = safeImage(t.coverUrl); if (cover) out.cover = cover;
    if (validId('artist', t.artistId)) out.artistId = t.artistId;
    if (validId('album', t.albumId)) out.albumId = t.albumId;
    if (t.explicit === true) out.explicit = true;
    return out;
  }
  function release(a) {
    if (!a || !validId('album', a.id)) return null;
    var title = clean(a.title, 200);
    if (!title) return null;
    var out = { id: a.id, title: title, type: clean(a.type, 30) };
    var year = /^(19|20)\d{2}$/.test(String(a.year || '')) ? String(a.year) : ''; if (year) out.year = year;
    var cover = safeImage(a.cover); if (cover) out.cover = cover;
    return out;
  }
  function person(a) {
    if (!a || !validId('artist', a.id)) return null;
    var name = clean(a.name, 120);
    if (!name) return null;
    var out = { id: a.id, name: name };
    var photo = safeImage(a.photo); if (photo) out.photo = photo;
    return out;
  }
  function compact(arr, fn, max) { return list(arr).map(fn).filter(Boolean).slice(0, max); }

  function normalizeArtist(raw, id) {
    var a = raw && raw.artist;
    if (!a || a.id !== id) return null;
    var name = clean(a.name, 120);
    if (!name) return null;
    var out = {
      artist: { id: id, name: name, listeners: clean(a.listeners, 80) },
      description: clean(raw.description, 1200),
      tracks: compact(raw.tracks, track, 10),
      albums: compact(raw.albums, release, 24),
      singles: compact(raw.singles, release, 24),
      related: compact(raw.related, person, 12)
    };
    var photo = safeImage(a.photo); if (photo) out.artist.photo = photo;
    return out;
  }
  function normalizeAlbum(raw, id) {
    var a = raw && raw.album;
    if (!a || a.id !== id) return null;
    var title = clean(a.title, 200);
    if (!title) return null;
    var out = { album: { id: id, title: title, artist: clean(a.artist, 200), type: clean(a.type, 30) }, tracks: compact(raw.tracks, track, 200) };
    if (!out.tracks.length) return null;
    if (validId('artist', a.artistId)) out.album.artistId = a.artistId;
    if (/^(19|20)\d{2}$/.test(String(a.year || ''))) out.album.year = String(a.year);
    var cover = safeImage(a.cover); if (cover) out.album.cover = cover;
    return out;
  }
  /** What the proposed anon RPC ketvoice_public_profile_card answers (no photo, no id, no e-mail). */
  function normalizeCard(raw, handle) {
    if (!raw || typeof raw !== 'object' || normHandle(raw.handle) !== handle) return null;
    return { handle: handle, name: clean(raw.display_name, 60), playlists: Math.max(0, Math.min(Number(raw.playlists) || 0, 99)) };
  }

  /* ---------- the app's link ---------- */
  /** ketvoice://listen as the app reads it (MainActivity.openSharedTrack), and the Android intent with a way back. */
  function appLinks(kind, id, title, artist, pageUrl) {
    var params = 'track=' + encodeURIComponent(id) + '&title=' + encodeURIComponent(title || '') +
      '&artist=' + encodeURIComponent(artist || '') + '&kind=' + encodeURIComponent(kind);
    return {
      app: 'ketvoice://listen?' + params,
      intent: 'intent://listen?' + params + '#Intent;scheme=ketvoice;package=com.ketvoice.app;S.browser_fallback_url=' +
        encodeURIComponent(pageUrl) + ';end'
    };
  }

  /* ---------- what a preview shows ---------- */
  function meta(kind, id, page, site) {
    site = site || SITE;
    var m = { title: 'Ketvoice', description: 'Le lecteur de musique gratuit pour Android : Ketmix, paroles mot à mot, Ketogether.',
      image: DEFAULT_IMAGE, imageAlt: 'Ketvoice', url: site + '/', type: 'website', square: false, index: true };
    if (kind === 'artist' && page) {
      var a = page.artist, top = page.tracks.slice(0, 3).map(function (t) { return t.title; });
      m.title = a.name + ' sur Ketvoice';
      m.description = clean((a.listeners ? a.listeners + '. ' : '') + (top.length ? 'Titres populaires : ' + top.join(', ') + '. ' : '') + 'Écoutez dans Ketvoice.', 200);
      if (a.photo) { m.image = a.photo; m.square = true; m.imageAlt = a.name; }
      m.url = site + '/artist/' + id; m.type = 'profile';
    } else if (kind === 'album' && page) {
      var al = page.album, n = page.tracks.length;
      m.title = al.title + ' de ' + (al.artist || 'Ketvoice');
      m.description = clean((al.type || 'Album') + (al.artist ? ' de ' + al.artist : '') + (al.year ? ', ' + al.year : '') + '. ' + n + (n > 1 ? ' titres' : ' titre') + '. Écoutez-le dans Ketvoice.', 200);
      if (al.cover) { m.image = al.cover; m.square = true; m.imageAlt = al.title; }
      m.url = site + '/album/' + id; m.type = 'music.album';
    } else if (kind === 'profile' && id) {
      m.title = (page && page.name ? page.name + ' (@' + id + ')' : '@' + id) + ' sur Ketvoice';
      m.description = page ? 'Profil public sur Ketvoice' + (page.playlists ? ', ' + page.playlists + (page.playlists > 1 ? ' playlists publiques.' : ' playlist publique.') : '.')
        : 'Un profil d’auditeur sur Ketvoice. Il se voit avec un compte Ketvoice.';
      m.url = site + '/u/' + id; m.type = 'profile'; m.index = false;
    } else if (kind === 'missing') {
      m.title = 'Introuvable sur Ketvoice'; m.index = false;
    }
    return m;
  }

  /* ---------- the page ---------- */
  function img(src, alt, cls, size, eager) {
    return src ? '<img class="' + cls + '" src="' + esc(src) + '" alt="' + esc(alt) + '" width="' + size + '" height="' + size + '"' +
      (eager ? ' fetchpriority="high"' : ' loading="lazy"') + ' referrerpolicy="no-referrer">' : '<span class="' + cls + ' sh-blank" aria-hidden="true"></span>';
  }
  function initial(name) { var c = Array.from(String(name || '?').replace(/^@/, ''))[0] || '?'; return esc(c.toUpperCase()); }
  function actions(kind, id, webHref) {
    return '<div class="sh-actions"><a class="sh-btn sh-btn-accent" data-open-app="" href="/#download">Ouvrir dans Ketvoice</a>' +
      (webHref ? '<a class="sh-btn sh-btn-line" href="' + esc(webHref) + '">Écouter sur le web</a>' : '') + '</div>';
  }
  function trackRows(tracks, showArtist, numbered) {
    return '<ol class="sh-tracks">' + tracks.map(function (t, i) {
      var sub = showArtist ? t.artist : t.album;
      return '<li>' + (numbered ? '<span class="sh-n">' + (i + 1) + '</span>' : img(t.cover, '', 'sh-thumb', 44)) +
        '<span class="sh-t"><span class="sh-title">' + esc(t.title) + (t.explicit ? ' <abbr class="sh-e" title="Explicite">E</abbr>' : '') + '</span>' +
        (sub ? '<span class="sh-sub2">' + esc(sub) + '</span>' : '') + '</span>' +
        '<span class="sh-d">' + esc(clock(t.durationMs)) + '</span></li>';
    }).join('') + '</ol>';
  }
  function shelf(title, idAttr, items) {
    if (!items.length) return '';
    return '<section class="sh-block" aria-labelledby="' + idAttr + '"><h2 id="' + idAttr + '">' + esc(title) + '</h2><ul class="sh-grid">' +
      items.map(function (r) {
        return '<li><a href="/album/' + esc(r.id) + '">' + img(r.cover, '', 'sh-cover', 240) + '<span class="sh-title">' + esc(r.title) + '</span>' +
          '<span class="sh-sub2">' + esc([r.type, r.year].filter(Boolean).join(', ')) + '</span></a></li>';
      }).join('') + '</ul></section>';
  }

  function renderMain(kind, id, page) {
    if (kind === 'artist' && page) {
      var a = page.artist;
      return '<section class="sh-hero">' + (a.photo ? img(a.photo, a.name, 'sh-art sh-round', 480, true) : '<span class="sh-art sh-round sh-initial" aria-hidden="true">' + initial(a.name) + '</span>') +
        '<div class="sh-head"><h1>' + esc(a.name) + '</h1>' + (a.listeners ? '<p class="sh-lead">' + esc(a.listeners) + '</p>' : '') +
        actions('artist', id, '/player#/a/' + id) + '</div></section>' +
        (page.tracks.length ? '<section class="sh-block" aria-labelledby="sh-popular"><h2 id="sh-popular">Titres populaires</h2>' + trackRows(page.tracks, false, false) + '</section>' : '') +
        shelf('Albums', 'sh-albums', page.albums) + shelf('Singles et EP', 'sh-singles', page.singles) +
        (page.related.length ? '<section class="sh-block" aria-labelledby="sh-related"><h2 id="sh-related">Artistes proches</h2><ul class="sh-people">' +
          page.related.map(function (r) {
            return '<li><a href="/artist/' + esc(r.id) + '">' + (r.photo ? img(r.photo, '', 'sh-face', 120) : '<span class="sh-face sh-initial" aria-hidden="true">' + initial(r.name) + '</span>') +
              '<span class="sh-title">' + esc(r.name) + '</span></a></li>';
          }).join('') + '</ul></section>' : '') +
        (page.description ? '<section class="sh-block sh-about" aria-labelledby="sh-about"><h2 id="sh-about">À propos</h2><p>' + esc(page.description) + '</p></section>' : '');
    }
    if (kind === 'album' && page) {
      var al = page.album, total = page.tracks.reduce(function (s, t) { return s + t.durationMs; }, 0), n = page.tracks.length;
      var by = al.artist ? (al.artistId ? '<a href="/artist/' + esc(al.artistId) + '">' + esc(al.artist) + '</a>' : esc(al.artist)) : '';
      var facts = [al.type || 'Album', al.year, n + (n > 1 ? ' titres' : ' titre'), total >= 60000 ? Math.round(total / 60000) + ' min' : ''].filter(Boolean).join(', ');
      return '<section class="sh-hero">' + img(al.cover, al.title, 'sh-art', 480, true) +
        '<div class="sh-head"><h1>' + esc(al.title) + '</h1>' + (by ? '<p class="sh-by">' + by + '</p>' : '') + '<p class="sh-lead">' + esc(facts) + '</p>' +
        actions('album', id, '/player#/album/' + id) + '</div></section>' +
        '<section class="sh-block" aria-labelledby="sh-list"><h2 id="sh-list" class="sh-vh">Titres</h2>' +
        trackRows(page.tracks, page.tracks.some(function (t) { return t.artist && t.artist !== al.artist; }), true) + '</section>';
    }
    if (kind === 'profile' && id) {
      var name = page && page.name;
      return '<section class="sh-hero sh-hero-profile"><span class="sh-art sh-round sh-initial" data-profile-photo="" aria-hidden="true">' + initial(name || id) + '</span>' +
        '<div class="sh-head"><h1 data-profile-name="">' + esc(name || '@' + id) + '</h1>' + (name ? '<p class="sh-lead">@' + esc(id) + '</p>' : '') +
        actions('profile', id, '') + '</div></section>' +
        '<section class="sh-block" data-profile-body="" aria-live="polite"><div class="sh-note"><h2>Visible avec un compte</h2>' +
        '<p>Un profil Ketvoice ne se voit qu’en étant connecté. Connectez-vous sur le lecteur web, puis rouvrez ce lien.</p>' +
        '<a class="sh-btn sh-btn-line" href="/player">Se connecter</a></div></section>';
    }
    if (kind === 'unavailable') {
      return '<section class="sh-hero sh-hero-plain"><div class="sh-head"><h1>Un instant.</h1><p class="sh-lead">Le catalogue ne répond pas pour l’instant. Cette page réessaie toute seule.</p>' +
        actions(kind, id, '') + '</div></section>';
    }
    return '<section class="sh-hero sh-hero-plain"><div class="sh-head"><h1>Introuvable.</h1><p class="sh-lead">Ce lien ne mène à rien sur Ketvoice, ou plus rien.</p>' +
      '<div class="sh-actions"><a class="sh-btn sh-btn-accent" href="/">Découvrir Ketvoice</a></div></div></section>';
  }

  function json(data) { return JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029'); }

  function headTags(m) {
    var t = [
      '<title>' + esc(m.title) + '</title>',
      '<meta name="description" content="' + esc(m.description) + '">',
      m.index ? '' : '<meta name="robots" content="noindex">',
      '<link rel="canonical" href="' + esc(m.url) + '">',
      '<meta property="og:type" content="' + esc(m.type) + '">',
      '<meta property="og:site_name" content="Ketvoice">',
      '<meta property="og:locale" content="fr_FR">',
      '<meta property="og:title" content="' + esc(m.title) + '">',
      '<meta property="og:description" content="' + esc(m.description) + '">',
      '<meta property="og:url" content="' + esc(m.url) + '">',
      '<meta property="og:image" content="' + esc(m.image) + '">',
      '<meta property="og:image:alt" content="' + esc(m.imageAlt) + '">',
      m.image === DEFAULT_IMAGE ? '<meta property="og:image:width" content="1448"><meta property="og:image:height" content="1086">' : '',
      '<meta name="twitter:card" content="' + (m.square ? 'summary' : 'summary_large_image') + '">',
      '<meta name="twitter:title" content="' + esc(m.title) + '">',
      '<meta name="twitter:description" content="' + esc(m.description) + '">',
      '<meta name="twitter:image" content="' + esc(m.image) + '">',
      '<meta name="theme-color" content="#0c0913">'
    ];
    return t.filter(Boolean).join('\n');
  }

  /** The whole document. kind: artist | album | profile | unavailable | missing. */
  function buildPage(o) {
    o = o || {};
    var kind = o.kind, id = o.id || '', page = o.page || null, site = o.site || SITE;
    var m = meta(kind, id, page, site);
    if (kind === 'unavailable') { m.title = 'Ketvoice'; m.index = false; }
    var data = { kind: kind, id: id, page: page, wanted: o.wanted || '' };
    return '<!DOCTYPE html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
      '<meta name="color-scheme" content="light dark">\n' + headTags(m) + '\n' +
      '<link rel="icon" href="/favicon-32.png" sizes="32x32">\n<link rel="apple-touch-icon" href="/apple-touch-icon.png">\n' +
      '<script>(function(){var d=document.documentElement,t=null;d.classList.add(\'js\');try{t=localStorage.getItem(\'ketvoice-theme\')}catch(e){}if(t===\'dark\'||(t!==\'light\'&&matchMedia(\'(prefers-color-scheme: dark)\').matches))d.classList.add(\'dark\')})();</script>\n' +
      '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
      '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400..600&amp;display=swap">\n' +
      '<link rel="stylesheet" href="/css/share.css?v=202611191200">\n</head>\n<body>\n' +
      '<a class="sh-skip" href="#share-main">Aller au contenu</a>\n' +
      '<header class="sh-top"><a class="sh-brand" href="/"><img src="/assets/ketvoice-logo-vc-96.png" width="28" height="28" alt=""><span>Ketvoice</span></a>' +
      '<a class="sh-btn sh-btn-line" href="/#download">Télécharger</a></header>\n' +
      '<main class="sh-main" id="share-main" data-kind="' + esc(kind || '') + '">' + renderMain(kind, id, page) + '</main>\n' +
      '<footer class="sh-foot"><p>' + (kind === 'artist' || kind === 'album' ? 'Catalogue de YouTube Music, tel que Ketvoice le lit. ' : '') +
      '<a href="/">Ketvoice</a>, le lecteur de musique gratuit pour Android et Meta Quest.</p></footer>\n' +
      '<script type="application/json" id="kv-share-data">' + json(data) + '</script>\n' +
      '<script src="/js/share-render.js?v=202611191200"></script>\n<script src="/js/share.js?v=202611191200"></script>\n</body>\n</html>\n';
  }

  /* ---------- /listen: the same page, with the title's own preview ---------- */
  function listenMeta(q, site) {
    var get = function (k) { return q && typeof q.get === 'function' ? q.get(k) : q && q[k]; };
    var title = clean(get('title'), 120), artist = clean(get('artist'), 120), kind = clean(get('kind'), 20);
    var name = clean(get('name'), 80), cover = safeImage(get('cover') || '');
    var m = null;
    if (kind === 'together') m = { title: 'Rejoindre une écoute Ketogether', description: 'Écoutez ensemble, en même temps, dans Ketvoice.' };
    else if ((get('playlist') || get('collection')) && name) m = { title: 'Playlist « ' + name + ' » sur Ketvoice', description: 'Ouvrez cette playlist dans Ketvoice.' };
    else if (title) m = {
      title: kind === 'album' ? 'Album « ' + title + ' »' + (artist ? ' de ' + artist : '') : title + (artist ? ' de ' + artist : ''),
      description: (kind === 'album' ? 'Un album' : 'Un titre') + ' partagé depuis Ketvoice : ouvrez-le dans l’app, paroles mot à mot comprises.'
    };
    if (!m) return null;
    m.title = clean(m.title, 160);
    m.image = cover || DEFAULT_IMAGE;
    m.square = !!cover;
    return m;
  }
  /** Replaces the values of listen.html's fixed preview tags; the rest of the file is left as it is. */
  function injectListen(html, q, site) {
    var m = listenMeta(q, site);
    if (!m) return html;
    var set = function (re, value) { html = html.replace(re, function (all, a, b) { return a + esc(value) + b; }); };
    set(/(<title>)[^<]*(<\/title>)/, 'Ketvoice — ' + m.title);
    set(/(<meta property="og:title" content=")[^"]*(">)/, m.title);
    set(/(<meta property="og:description" content=")[^"]*(">)/, m.description);
    set(/(<meta property="og:image" content=")[^"]*(">)/, m.image);
    set(/(<meta name="twitter:title" content=")[^"]*(">)/, m.title);
    set(/(<meta name="twitter:description" content=")[^"]*(">)/, m.description);
    set(/(<meta name="twitter:image" content=")[^"]*(">)/, m.image);
    if (m.square) {
      html = html.replace(/<meta property="og:image:width" content="\d+">\s*<meta property="og:image:height" content="\d+">\s*/, '')
        .replace(/(<meta name="twitter:card" content=")summary_large_image(">)/, '$1summary$2');
      set(/(<meta property="og:image:alt" content=")[^"]*(">)/, m.title);
    }
    return html;
  }

  return {
    SITE: SITE, DEFAULT_IMAGE: DEFAULT_IMAGE, ID: ID, clean: clean, esc: esc, safeImage: safeImage, validId: validId,
    normHandle: normHandle, origin: origin, clock: clock, normalizeArtist: normalizeArtist, normalizeAlbum: normalizeAlbum,
    normalizeCard: normalizeCard, appLinks: appLinks, meta: meta, renderMain: renderMain, buildPage: buildPage,
    listenMeta: listenMeta, injectListen: injectListen
  };
});
