/* Public pages, in the browser (api/og-page.js renders them on the server; js/share-render.js is shared).
   - « Ouvrir dans Ketvoice »: the app's intent on Android (back here when the app is missing), the download elsewhere.
   - When the server had no answer from the catalogue (or the page is the static share.html), the catalogue is asked
     from here and the page drawn with the same renderer.
   - A profile is only shown to a signed-in listener (6.3: ketvoice_public_profile is granted to authenticated only):
     the web player's session in this browser (kv-player-session) is used as it is, never renewed here. */
(function () {
  'use strict';
  var R = window.ShareRender;
  var ROOT = 'https://xodklrunqlzyeiqtovgx.supabase.co';
  var ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvZGtscnVucWx6eWVpcXRvdmd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1ODgzNjgsImV4cCI6MjEwODE2NDM2OH0.V-F8ZhM21Ht1yRV5FXOuZcddufvY8aIW5kclb-F2zao';
  var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  var main = document.getElementById('share-main');
  var node = document.getElementById('kv-share-data');
  if (!R || !main || !node) return;
  var data = {};
  try { data = JSON.parse(node.textContent) || {}; } catch (e) { data = {}; }

  function fromPath() {
    var m = location.pathname.match(/^\/(artist|album|u)\/([^/]+)\/?$/);
    if (!m) return null;
    var id = ''; try { id = decodeURIComponent(m[2]); } catch (e) { return null; }
    return { kind: m[1] === 'u' ? 'profile' : m[1], id: m[1] === 'u' ? R.normHandle(id) : id };
  }

  function openButtons(kind, id, page) {
    var title = '', artist = '';
    if (kind === 'artist' && page) artist = page.artist.name;
    else if (kind === 'album' && page) { title = page.album.title; artist = page.album.artist; }
    else if (kind === 'profile') title = '@' + id;
    var android = /Android/i.test(navigator.userAgent);
    Array.prototype.forEach.call(document.querySelectorAll('[data-open-app]'), function (a) {
      if (android && id) a.href = R.appLinks(kind, id, title, artist, location.href).intent;
      else { a.href = '/#download'; a.textContent = 'Télécharger Ketvoice'; }
    });
  }

  function draw(kind, id, page) {
    main.innerHTML = R.renderMain(kind, id, page);
    main.dataset.kind = kind;
    document.title = R.meta(kind, id, page).title;
    openButtons(kind, id, page);
  }

  /* ---------- the catalogue, from here ---------- */
  function fromCatalogue(kind, id, tries) {
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 8000);
    fetch(ROOT + '/functions/v1/ketvoice-catalog/catalog/' + kind + '?id=' + encodeURIComponent(id), {
      credentials: 'omit', headers: { apikey: ANON, Authorization: 'Bearer ' + ANON, Accept: 'application/json' }, signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) {
      clearTimeout(timer);
      if (r.status === 400 || r.status === 404) return { missing: true };
      if (!r.ok) throw new Error(String(r.status));
      return r.json().then(function (body) {
        var page = kind === 'artist' ? R.normalizeArtist(body, id) : R.normalizeAlbum(body, id);
        return page ? { page: page } : { missing: true };
      });
    }).then(function (res) {
      if (res.missing) draw('missing', '', null); else draw(kind, id, res.page);
    }).catch(function () {
      clearTimeout(timer);
      if (tries > 0) setTimeout(function () { fromCatalogue(kind, id, tries - 1); }, 6000);
    });
  }

  /* ---------- a profile, for a signed-in listener ---------- */
  function session() {
    try {
      var s = JSON.parse(localStorage.getItem('kv-player-session') || 'null');
      return s && typeof s.access === 'string' ? s : null;
    } catch (e) { return null; }
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function note(title, text, link, label) {
    var box = el('div', 'sh-note');
    box.appendChild(el('h2', null, title)); box.appendChild(el('p', null, text));
    if (link) { var a = el('a', 'sh-btn sh-btn-line', label); a.href = link; box.appendChild(a); }
    return box;
  }
  function profile(handle) {
    var body = main.querySelector('[data-profile-body]');
    var s = session();
    if (!body || !s) return;
    if (!(Number(s.expiresAt) > Date.now() + 30000)) {
      body.replaceChildren(note('Session à renouveler', 'Ouvrez le lecteur web une fois pour renouveler votre session, puis revenez ici.', '/player', 'Ouvrir le lecteur'));
      return;
    }
    var auth = { apikey: ANON, Authorization: 'Bearer ' + s.access };
    fetch(ROOT + '/rest/v1/rpc/ketvoice_public_profile', {
      method: 'POST', credentials: 'omit', headers: Object.assign({ 'Content-Type': 'application/json', Accept: 'application/json' }, auth),
      body: JSON.stringify({ handle: handle })
    }).then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); }).then(function (p) {
      if (!p || typeof p !== 'object' || R.normHandle(p.handle) !== handle) {
        body.replaceChildren(note('Profil introuvable', 'Ce profil n’existe pas, ou son auteur ne l’a pas rendu public.', '/', 'Découvrir Ketvoice'));
        return;
      }
      var name = R.clean(p.display_name, 60);
      var h1 = main.querySelector('[data-profile-name]');
      if (h1 && name) {
        h1.textContent = name;
        if (!h1.nextElementSibling || !h1.nextElementSibling.classList.contains('sh-lead')) h1.insertAdjacentElement('afterend', el('p', 'sh-lead', '@' + handle));
        document.title = name + ' (@' + handle + ') sur Ketvoice';
      }
      var parts = [];
      var l = p.listening;
      if (l && typeof l === 'object' && l.title) {
        var now = el('p', 'sh-listening');
        now.appendChild(el('span', 'sh-sub2', l.playing ? 'En train d’écouter' : 'Écouté il y a peu'));
        now.appendChild(el('span', 'sh-title', R.clean(l.title, 200) + (l.artist ? ' de ' + R.clean(l.artist, 200) : '')));
        parts.push(now);
      }
      var lists = Array.isArray(p.playlists) ? p.playlists.slice(0, 20) : [];
      if (lists.length) {
        var h = el('h2', null, 'Playlists publiques'); parts.push(h);
        var ul = el('ul', 'sh-grid');
        lists.forEach(function (pl) {
          var li = el('li'), card = el('div', 'sh-card'), cover = R.safeImage(pl.cover_url);
          if (cover) { var im = el('img', 'sh-cover'); im.src = cover; im.alt = ''; im.loading = 'lazy'; im.referrerPolicy = 'no-referrer'; card.appendChild(im); }
          else card.appendChild(el('span', 'sh-cover sh-blank'));
          var n = Array.isArray(pl.tracks) ? pl.tracks.length : 0;
          card.appendChild(el('span', 'sh-title', R.clean(pl.name, 80)));
          card.appendChild(el('span', 'sh-sub2', n + (n > 1 ? ' titres' : ' titre')));
          li.appendChild(card); ul.appendChild(li);
        });
        parts.push(ul);
      }
      if (!parts.length) parts.push(note('Rien de public pour l’instant', 'Ce profil n’a pas encore de playlist publique.', null));
      body.replaceChildren.apply(body, parts);
      if (typeof p.avatar_ref === 'string' && UUID.test(p.avatar_ref)) {
        fetch(ROOT + '/storage/v1/object/authenticated/ketvoice-public-avatars/' + p.avatar_ref + '.jpg', { credentials: 'omit', headers: auth })
          .then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.blob(); })
          .then(function (b) {
            var spot = main.querySelector('[data-profile-photo]');
            if (!spot || !/^image\//.test(b.type)) return;
            var im = el('img', 'sh-art sh-round'); im.alt = name || '@' + handle; im.src = URL.createObjectURL(b);
            spot.replaceWith(im);
          }).catch(function () { /* the initial stays */ });
      }
    }).catch(function () {
      body.replaceChildren(note('Profil indisponible', 'Le profil n’a pas pu être lu. Réessayez dans un moment.', null));
    });
  }

  var kind = data.kind, id = data.id || '';
  if (kind === 'unavailable' || !kind) {
    var want = data.wanted && data.id ? { kind: data.wanted, id: data.id } : fromPath();
    if (want && want.kind === 'profile' && R.validId('profile', want.id)) { draw('profile', want.id, null); profile(want.id); }
    else if (want && R.validId(want.kind, want.id)) { openButtons(want.kind, want.id, null); fromCatalogue(want.kind, want.id, 2); }
    else if (want) draw('missing', '', null);
  } else {
    openButtons(kind, id, data.page);
    if (kind === 'profile') profile(id);
  }
})();
