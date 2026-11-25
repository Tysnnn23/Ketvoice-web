/* /listen?playlist=<id>&name=… (Windows 2.0 « Partager la playlist »): the playlist's snapshot behind its link, for
   everyone. listen.html already shows the name and « Ouvrir dans Ketvoice »; this adds the cover and the titles, read
   through the anon RPC ketvoice_link_playlist(p_id) (supabase …120600_social_link_playlists.sql), which answers only
   that snapshot (no owner, no other playlist). Loaded at the end of listen.html; it does nothing for any other link.
   Text goes in with textContent; images only from the cover hosts js/share-render.js knows. */
(function () {
  'use strict';
  var ROOT = 'https://xodklrunqlzyeiqtovgx.supabase.co';
  var ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvZGtscnVucWx6eWVpcXRvdmd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1ODgzNjgsImV4cCI6MjEwODE2NDM2OH0.V-F8ZhM21Ht1yRV5FXOuZcddufvY8aIW5kclb-F2zao';
  var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  var HOSTS = ['googleusercontent.com', 'ggpht.com', 'ytimg.com', 'xodklrunqlzyeiqtovgx.supabase.co', 'mzstatic.com', 'scdn.co', 'dzcdn.net'];
  var id = new URLSearchParams(location.search).get('playlist') || '';
  if (!UUID.test(id)) return;

  function clean(v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f‪-‮⁦-⁩]/g, '').trim().slice(0, max); }
  function safeImage(v) {
    try {
      var u = new URL(String(v || ''));
      if (u.protocol !== 'https:' || u.username || u.password) return '';
      var h = u.hostname.toLowerCase();
      return HOSTS.some(function (s) { return h === s || h.slice(-s.length - 1) === '.' + s; }) ? u.href : '';
    } catch (e) { return ''; }
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function clock(ms) { var s = Math.round((Number(ms) || 0) / 1000); return s > 0 ? Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2) : ''; }

  fetch(ROOT + '/rest/v1/rpc/ketvoice_link_playlist', {
    method: 'POST', credentials: 'omit',
    headers: { apikey: ANON, Authorization: 'Bearer ' + ANON, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ p_id: id })
  }).then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); }).then(function (p) {
    if (!p || typeof p !== 'object' || !Array.isArray(p.tracks)) return;
    var tracks = p.tracks.slice(0, 100).filter(function (t) { return t && typeof t.title === 'string'; });
    var cover = safeImage(p.cover_url) || (tracks[0] && safeImage(tracks[0].coverUrl));
    var img = document.getElementById('cover');
    if (cover && img) { img.addEventListener('load', function () { img.hidden = false; }); img.src = cover; }
    var title = document.getElementById('title');
    if (title && clean(p.name, 80)) title.textContent = clean(p.name, 80);
    var host = document.getElementById('status');
    if (!host || !tracks.length) return;
    var list = el('ol', 'kv-link-tracks');
    tracks.forEach(function (t, i) {
      var li = el('li');
      li.appendChild(el('span', 'kv-n', String(i + 1)));
      var words = el('span', 'kv-t');
      words.appendChild(el('span', 'kv-title', clean(t.title, 200)));
      words.appendChild(el('span', 'kv-sub', clean(t.artist, 200)));
      li.appendChild(words);
      li.appendChild(el('span', 'kv-d', clock(t.durationMs)));
      list.appendChild(li);
    });
    var style = el('style', null, '.kv-link-tracks{list-style:none;margin:18px 0 0;padding:0;text-align:left;max-height:360px;overflow:auto}' +
      '.kv-link-tracks li{display:grid;grid-template-columns:28px minmax(0,1fr) auto;gap:12px;align-items:center;padding:8px 0;border-bottom:1px solid rgba(127,127,127,.18)}' +
      '.kv-n,.kv-d,.kv-sub{opacity:.7;font-size:14px}.kv-t{display:grid;min-width:0}.kv-title,.kv-sub{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}');
    document.head.appendChild(style);
    host.insertAdjacentElement('afterend', list);
  }).catch(function () { /* the page as listen.html drew it */ });
})();
