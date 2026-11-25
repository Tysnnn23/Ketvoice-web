/* /u/<handle>, Windows 2.0 social: the public profile for everyone, signed in or not.
   Reads only what the profile's owner made public, through two doors that answer nothing else:
   - ketvoice_public_profile_card(handle) (anon RPC, supabase …120500_social_public_card.sql): name, bio, accent, public
     modules (artists of the month, pinned playlists, the title playing) — null for a private or unknown handle;
   - the ketvoice-profile edge function for the photo and the banner (served only while the profile is public).
   Loaded after js/share-render.js and js/share.js on the profile page (api/og-page.js renders it). When the card is null,
   the page stays as share.js draws it (a signed-in listener of /player still sees what 6.3 lets them see).
   Everything is set with textContent / attributes, never innerHTML with data; images only from known hosts. */
(function () {
  'use strict';
  var R = window.ShareRender;
  var ROOT = 'https://xodklrunqlzyeiqtovgx.supabase.co';
  var ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvZGtscnVucWx6eWVpcXRvdmd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1ODgzNjgsImV4cCI6MjEwODE2NDM2OH0.V-F8ZhM21Ht1yRV5FXOuZcddufvY8aIW5kclb-F2zao';
  var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  var main = document.getElementById('share-main');
  if (!R || !main) return;

  function handleFromPath() {
    var m = location.pathname.match(/^\/u\/([^/]+)\/?$/);
    var raw = m && !/\.html$/.test(m[1]) ? m[1] : new URLSearchParams(location.search).get('handle') || '';
    try { raw = decodeURIComponent(raw); } catch (e) { return ''; }
    var h = R.normHandle(raw);
    return R.validId('profile', h) ? h : '';
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function picture(handle, kind) {
    return ROOT + '/functions/v1/ketvoice-profile/image?handle=' + encodeURIComponent(handle) + '&kind=' + kind;
  }
  /** #RRGGBB → the page's accent, with readable text on it. */
  function accent(hex) {
    if (typeof hex !== 'string' || !/^#[0-9A-F]{6}$/.test(hex)) return;
    var n = parseInt(hex.slice(1), 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
    var lum = function (c) { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    var l = 0.2126 * lum(r) + 0.7152 * lum(g) + 0.0722 * lum(b);
    var s = document.documentElement.style;
    s.setProperty('--accent', hex); s.setProperty('--accent-hover', hex);
    s.setProperty('--on-accent', l > 0.4 ? '#0e0820' : '#ffffff');
    s.setProperty('--profile-accent', hex);
  }

  /** « Ouvrir dans Ketvoice »: the app's own link — an intent on Android, ketvoice:// on Windows, else the download. */
  function openButton(handle) {
    var a = el('a', 'sh-btn sh-btn-accent', 'Ouvrir dans Ketvoice');
    var ua = navigator.userAgent;
    if (/Android/i.test(ua)) a.href = 'intent://u/' + handle + '#Intent;scheme=ketvoice;package=com.ketvoice.app;S.browser_fallback_url=' +
      encodeURIComponent(location.href) + ';end';
    else if (/Windows/i.test(ua)) a.href = 'ketvoice://u/' + handle;
    else { a.href = '/#download'; a.textContent = 'Télécharger Ketvoice'; }
    return a;
  }

  function hero(card) {
    var box = el('section', 'up-hero');
    var banner = el('div', 'up-banner');
    if (card.has_banner) {
      var b = el('img'); b.alt = ''; b.src = picture(card.handle, 'banner'); b.decoding = 'async';
      b.addEventListener('error', function () { b.remove(); });
      banner.appendChild(b);
    }
    box.appendChild(banner);
    var row = el('div', 'up-id');
    var name = R.clean(card.display_name, 60) || '@' + card.handle;
    if (card.has_avatar) {
      var img = el('img', 'up-avatar'); img.alt = name; img.src = picture(card.handle, 'avatar'); img.decoding = 'async';
      img.addEventListener('error', function () { img.replaceWith(el('span', 'up-avatar up-initial', name.charAt(0).toUpperCase())); });
      row.appendChild(img);
    } else row.appendChild(el('span', 'up-avatar up-initial', name.replace('@', '').charAt(0).toUpperCase()));
    var head = el('div', 'up-head');
    head.appendChild(el('h1', null, name));
    head.appendChild(el('p', 'sh-lead', '@' + card.handle));
    row.appendChild(head);
    box.appendChild(row);
    var bio = R.clean(card.bio, 160);
    if (bio) box.appendChild(el('p', 'up-bio', bio));
    var actions = el('div', 'sh-actions');
    actions.appendChild(openButton(card.handle));
    box.appendChild(actions);
    return box;
  }

  function listening(l) {
    if (!l || typeof l !== 'object' || !l.title) return null;
    var s = el('section', 'sh-block'); s.setAttribute('aria-labelledby', 'up-now');
    var h = el('h2', null, l.playing ? 'En train d’écouter' : 'Écouté il y a peu'); h.id = 'up-now'; s.appendChild(h);
    var row = el('div', 'up-now');
    var cover = R.safeImage(l.coverUrl);
    if (cover) { var im = el('img', 'sh-thumb'); im.src = cover; im.alt = ''; im.referrerPolicy = 'no-referrer'; row.appendChild(im); }
    else row.appendChild(el('span', 'sh-thumb sh-blank'));
    var t = el('span', 'sh-t'); t.appendChild(el('span', 'sh-title', R.clean(l.title, 200))); t.appendChild(el('span', 'sh-sub2', R.clean(l.artist, 200)));
    row.appendChild(t);
    if (typeof l.id === 'string' && l.id && !/^local:/.test(l.id)) {
      var go = el('a', 'sh-btn sh-btn-line', 'Écouter');
      go.href = '/listen?track=' + encodeURIComponent(l.id) + '&title=' + encodeURIComponent(l.title) + '&artist=' + encodeURIComponent(l.artist || '');
      row.appendChild(go);
    }
    s.appendChild(row);
    return s;
  }

  function top(data) {
    var items = data && Array.isArray(data.items) ? data.items.slice(0, 5) : [];
    if (!items.length) return null;
    var s = el('section', 'sh-block'); s.setAttribute('aria-labelledby', 'up-top');
    var h = el('h2', null, 'Artistes du mois'); h.id = 'up-top'; s.appendChild(h);
    var ul = el('ul', 'sh-people');
    items.forEach(function (a, i) {
      var name = R.clean(a && a.name, 120); if (!name) return;
      var li = el('li'), link = el(R.validId('artist', a.id) ? 'a' : 'div');
      if (link.tagName === 'A') link.href = '/artist/' + a.id;
      var photo = R.safeImage(a.cover);
      if (photo) { var im = el('img', 'sh-face'); im.src = photo; im.alt = ''; im.loading = 'lazy'; im.referrerPolicy = 'no-referrer'; link.appendChild(im); }
      else link.appendChild(el('span', 'sh-face sh-initial', name.charAt(0).toUpperCase()));
      link.appendChild(el('span', 'sh-title', name));
      link.appendChild(el('span', 'sh-sub2 up-rank', '#' + (i + 1)));
      li.appendChild(link); ul.appendChild(li);
    });
    s.appendChild(ul);
    return s;
  }

  function pinned(data) {
    var lists = data && Array.isArray(data.lists) ? data.lists.slice(0, 6) : [];
    if (!lists.length) return null;
    var s = el('section', 'sh-block'); s.setAttribute('aria-labelledby', 'up-pinned');
    var h = el('h2', null, 'Playlists épinglées'); h.id = 'up-pinned'; s.appendChild(h);
    var ul = el('ul', 'sh-grid');
    lists.forEach(function (p) {
      var name = R.clean(p && p.name, 80); if (!name) return;
      var li = el('li'), link = el(UUID.test(p.link || '') ? 'a' : 'div', 'sh-card');
      if (link.tagName === 'A') link.href = '/listen?playlist=' + p.link + '&name=' + encodeURIComponent(name);
      var cover = R.safeImage(p.cover);
      if (cover) { var im = el('img', 'sh-cover'); im.src = cover; im.alt = ''; im.loading = 'lazy'; im.referrerPolicy = 'no-referrer'; link.appendChild(im); }
      else link.appendChild(el('span', 'sh-cover sh-blank'));
      var n = Math.max(0, Math.min(Number(p.count) || 0, 10000));
      link.appendChild(el('span', 'sh-title', name));
      link.appendChild(el('span', 'sh-sub2', n + (n > 1 ? ' titres' : ' titre')));
      li.appendChild(link); ul.appendChild(li);
    });
    s.appendChild(ul);
    return s;
  }

  function draw(card) {
    accent(card.accent);
    var modules = card.modules && typeof card.modules === 'object' ? card.modules : {};
    var parts = [hero(card), listening(card.listening), top(modules.top && modules.top.data), pinned(modules.pinned && modules.pinned.data)]
      .filter(Boolean);
    if (parts.length === 1) {
      var note = el('div', 'sh-note up-empty');
      note.appendChild(el('h2', null, 'Rien de public pour l’instant'));
      note.appendChild(el('p', null, 'Ce profil ne montre encore aucun module à tout le monde.'));
      parts.push(note);
    }
    main.replaceChildren.apply(main, parts);
    main.dataset.kind = 'profile-card';
    document.title = R.clean(card.display_name, 60) ? R.clean(card.display_name, 60) + ' (@' + card.handle + ') sur Ketvoice' : '@' + card.handle + ' sur Ketvoice';
  }

  var handle = handleFromPath();
  if (!handle) return;
  fetch(ROOT + '/rest/v1/rpc/ketvoice_public_profile_card', {
    method: 'POST', credentials: 'omit',
    headers: { apikey: ANON, Authorization: 'Bearer ' + ANON, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ handle: handle })
  }).then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); }).then(function (card) {
    if (!card || typeof card !== 'object' || R.normHandle(card.handle) !== handle) return; // private, unknown: share.js keeps the page
    draw(card);
  }).catch(function () { /* the page as share.js drew it */ });
})();
