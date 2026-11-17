/* Ketvoice — /changelog. Reads every GitHub release of Tysnnn23/Ketvoice (public API, two pages of 100),
 * falls back on data/releases.json when the API is rate limited or offline, and draws one card per
 * version with js/changelog-data.js. Filters (channel, feature, search) live in the URL so a filtered
 * view can be shared: /changelog?channel=beta&tag=ketmix&q=editor#v6.1.0.
 * Entrances follow the site: a rise out of a light blur, nothing with prefers-reduced-motion. */
(function () {
  'use strict';
  var K = window.KVChangelog;
  var REPO = 'Tysnnn23/Ketvoice';
  var PAGE = 12;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var all = function (s, c) { return [].slice.call((c || document).querySelectorAll(s)); };
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var esc = function (v) { return String(v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var rich = function (v) { return esc(v).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').split('**').join(''); };
  var dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  var numFmt = new Intl.NumberFormat('en-US');
  var fmtDate = function (d) { var t = new Date(d); return isNaN(t) ? '' : dateFmt.format(t); };
  var fmtSize = function (b) { return b ? (b / 1048576).toFixed(b > 104857600 ? 0 : 1) + ' MB' : ''; };

  /* ---------- nav: mobile menu, Discord, back to top ---------- */
  var toggle = $('#menu-toggle'), mobile = $('#mobile-menu');
  if (toggle && mobile) {
    toggle.addEventListener('click', function () {
      var open = mobile.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    });
    all('a', mobile).forEach(function (a) { a.addEventListener('click', function () { mobile.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }); });
  }
  all('.discord-action').forEach(function (b) { b.addEventListener('click', function () { window.open('https://discord.gg/FyKjAXHvfY', '_blank', 'noopener,noreferrer'); }); });
  var toTop = $('#to-top');
  if (toTop) {
    toTop.addEventListener('click', function () { scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });
    addEventListener('scroll', function () { toTop.classList.toggle('show', scrollY > 900); }, { passive: true });
  }

  /* ---------- entrances ---------- */
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
  }, { threshold: 0, rootMargin: '0px 0px -40px 0px' }) : null;
  function reveal(el) { if (io && !reduce) io.observe(el); else el.classList.add('visible'); }

  /* ---------- state ---------- */
  var entries = [], shown = PAGE;
  var q0 = new URLSearchParams(location.search);
  var state = { channel: /^(stable|beta)$/.test(q0.get('channel') || '') ? q0.get('channel') : 'all', tag: q0.get('tag') || '', query: q0.get('q') || '' };
  var input = $('#cl-q');
  input.value = state.query;

  function syncUrl() {
    var p = new URLSearchParams();
    if (state.channel !== 'all') p.set('channel', state.channel);
    if (state.tag) p.set('tag', state.tag);
    if (state.query.trim()) p.set('q', state.query.trim());
    var s = p.toString();
    try { history.replaceState(null, '', location.pathname + (s ? '?' + s : '') + location.hash); } catch (e) { /* file:// */ }
  }

  function syncControls() {
    all('.seg button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.channel === state.channel)); });
    all('#cl-tags button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.tag === state.tag)); });
  }

  function renderTags() {
    var counts = {};
    entries.forEach(function (e) { e.tags.forEach(function (t) { counts[t] = (counts[t] || 0) + 1; }); });
    var html = '<button type="button" data-tag="" aria-pressed="false">Every feature</button>' + K.TAGS.filter(function (t) { return counts[t.id]; }).map(function (t) {
      return '<button type="button" data-tag="' + t.id + '" aria-pressed="false">' + esc(t.label) + '<span class="n">' + counts[t.id] + '</span></button>';
    }).join('');
    $('#cl-tags').innerHTML = html;
    if (state.tag && !counts[state.tag]) state.tag = '';
    syncControls();
  }

  /* ---------- a card ---------- */
  var TAG_LABEL = {}; K.TAGS.forEach(function (t) { TAG_LABEL[t.id] = t.label; });

  function bannerHtml(b, version) {
    if (!b) return '';
    var alt = 'Ketvoice ' + esc(version) + ' banner';
    if (b.canonical) {
      // The canonical banner is the one the site already ships in optimised sizes.
      return '<a class="cl-banner" href="' + esc(b.src) + '" target="_blank" rel="noopener noreferrer"><picture><source type="image/avif" srcset="assets/banner-vc-720.avif"/><source type="image/webp" srcset="assets/banner-vc-720.webp"/>' +
        '<img alt="' + alt + '" decoding="async" height="1086" loading="lazy" src="assets/banner-vc-1100.png" width="1448"/></picture></a>';
    }
    return '<a class="cl-banner" href="' + esc(b.src) + '" target="_blank" rel="noopener noreferrer"><img alt="' + alt + '" decoding="async" loading="lazy" referrerpolicy="no-referrer" src="' + esc(b.src) + '"/></a>';
  }

  function sectionHtml(s) {
    return '<section class="cl-sec">' + (s.title ? '<h4>' + rich(s.title) + '</h4>' : '') +
      '<ul>' + s.points.map(function (p) { return '<li>' + rich(p) + '</li>'; }).join('') + '</ul></section>';
  }

  // #v6.1.0 links straight to a version.
  function cardId(e) { var t = String(e.tag).replace(/[^A-Za-z0-9._-]/g, ''); return /^[A-Za-z]/.test(t) ? t : 'v-' + t; }

  function card(e, i, latestTag, showBanner) {
    var id = cardId(e);
    var badge = e.channel === 'beta' ? '<span class="badge beta">Beta</span>' : e.channel === 'other' ? '<span class="badge other">Resource</span>' : '<span class="badge">Stable</span>';
    if (e.tag === latestTag) badge += '<span class="badge latest">Latest</span>';
    var first = e.sections.slice(0, 2), rest = e.sections.slice(2);
    var trimmed = first.map(function (s) { return { title: s.title, points: s.points.slice(0, 4), more: s.points.slice(4) }; });
    var hidden = trimmed.filter(function (s) { return s.more.length; }).length || rest.length;
    var moreHtml = '';
    if (hidden) {
      var extra = trimmed.filter(function (s) { return s.more.length; }).map(function (s) { return { title: s.title ? s.title + ' (more)' : 'More', points: s.more }; }).concat(rest);
      var n = extra.reduce(function (a, s) { return a + s.points.length; }, 0);
      moreHtml = '<div class="cl-rest" id="' + id + '-rest"><div>' + extra.map(sectionHtml).join('') + '</div></div>' +
        '<button aria-controls="' + id + '-rest" aria-expanded="false" class="cl-toggle" type="button"><span>Show all notes</span> <small>+' + n + '</small><svg aria-hidden="true" class="icon"><use href="#i-chev"/></svg></button>';
    }
    var shots = e.media.shots.length ? '<div class="cl-shots" role="list" aria-label="Screenshots of ' + esc(e.version) + '">' + e.media.shots.slice(0, 8).map(function (s) {
      return '<a role="listitem" href="' + esc(s.src) + '" target="_blank" rel="noopener noreferrer"><img alt="' + esc(s.alt || s.name.replace(/\.[a-z]+$/i, '').replace(/[-_]+/g, ' ')) + '" decoding="async" loading="lazy" referrerpolicy="no-referrer" src="' + esc(s.src) + '"/></a>';
    }).join('') + '</div>' : '';
    var dls = e.downloads.length ? '<div class="cl-dl">' + e.downloads.map(function (d, k) {
      return '<a class="' + (k === 0 ? 'btn btn-accent' : 'btn btn-line') + '" href="' + esc(d.url) + '" title="' + esc(d.name) + '"><svg aria-hidden="true" class="icon"><use href="#i-down"/></svg>' + esc(d.label) + (d.size ? '<small>' + fmtSize(d.size) + '</small>' : '') + '</a>';
    }).join('') + '</div>' : '';
    // "Ketvoice 4.7.0 — optical glass redesign" → "Optical glass redesign"; a bare "Ketvoice 6.1.2" adds nothing.
    var title = e.channel === 'other' ? e.name : String(e.name || '').replace(/^Ketvoice\s+/i, '').replace(/^v?\d[\w.\-]*\s*[—–:-]?\s*/, '');
    title = title ? title.charAt(0).toUpperCase() + title.slice(1) : '';
    return '<li class="cl-card reveal" id="' + id + '" style="--i:' + Math.min(i, 6) + '">' +
      '<div class="cl-meta">' +
        '<h3 class="cl-ver"><a href="#' + id + '">' + esc(e.version) + '</a></h3>' +
        '<p class="cl-date"><time datetime="' + esc(e.date) + '">' + fmtDate(e.date) + '</time>' + (e.count ? ' · ' + numFmt.format(e.count) + ' downloads' : '') + '</p>' +
        '<p class="cl-badges">' + badge + '</p>' +
        (showBanner ? bannerHtml(e.media.banner, e.version) : '') + dls +
        '<a class="cl-gh" href="' + esc(e.url) + '" target="_blank" rel="noopener noreferrer">Release on GitHub<svg aria-hidden="true" class="icon"><use href="#i-ext"/></svg></a>' +
      '</div>' +
      '<div class="cl-notes">' +
        (title ? '<p class="cl-title">' + esc(title) + '</p>' : '') +
        (e.intro ? '<p class="cl-intro">' + rich(e.intro) + '</p>' : '') +
        (e.tags.length ? '<p class="cl-ftags">' + e.tags.map(function (t) { return '<button type="button" data-tag="' + t + '">' + esc(TAG_LABEL[t]) + '</button>'; }).join('') + '</p>' : '') +
        trimmed.map(sectionHtml).join('') + moreHtml + shots +
      '</div></li>';
  }

  /* ---------- the list ---------- */
  var latestStable = '';
  function render(animate) {
    var list = K.filter(entries, state), box = $('#cl-list');
    var hashTag = location.hash.replace(/^#/, '');
    if (hashTag) { var at = list.findIndex(function (e) { return cardId(e) === hashTag; }); if (at >= shown) shown = at + 1; }
    var page = list.slice(0, shown);
    // A banner shows on the first card that carries it; the next cards with the very same picture skip it.
    var lastBanner = '';
    box.innerHTML = page.map(function (e, i) {
      var b = e.media.banner, show = !!b && b.key !== lastBanner;
      if (b) lastBanner = b.key;
      return card(e, i, latestStable, show);
    }).join('');
    box.classList.toggle('animate', !!animate && !reduce);
    all('.cl-card', box).forEach(function (el) { if (animate) el.classList.add('visible'); else reveal(el); });
    var filtered = state.channel !== 'all' || state.tag || state.query.trim();
    $('#cl-count').textContent = list.length ? (filtered ? list.length + ' of ' + entries.length + ' releases match' : entries.length + ' releases, newest first') + (page.length < list.length ? ' · showing ' + page.length : '') : '';
    $('#cl-empty').hidden = !!list.length || !entries.length;
    var more = $('#cl-more');
    more.hidden = page.length >= list.length;
    more.textContent = 'Show ' + Math.min(PAGE, list.length - page.length) + ' more versions';
  }

  function setState(patch) {
    for (var k in patch) state[k] = patch[k];
    shown = PAGE;
    if (location.hash) try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { }
    syncControls(); syncUrl(); render(true);
  }

  all('.seg button').forEach(function (b) { b.addEventListener('click', function () { setState({ channel: b.dataset.channel }); }); });
  $('#cl-tags').addEventListener('click', function (ev) { var b = ev.target.closest('button'); if (b) setState({ tag: b.dataset.tag === state.tag ? '' : b.dataset.tag }); });
  var timer = 0;
  input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(function () { setState({ query: input.value }); }, 140); });
  $('#cl-reset').addEventListener('click', function () { input.value = ''; setState({ channel: 'all', tag: '', query: '' }); });
  $('#cl-more').addEventListener('click', function () {
    var before = shown; shown += PAGE; render(false);
    var next = all('.cl-card')[before]; if (next) { var a = next.querySelector('.cl-ver a'); if (a) a.focus({ preventScroll: true }); }
  });
  $('#cl-list').addEventListener('click', function (ev) {
    var t = ev.target.closest('.cl-toggle');
    if (t) {
      var open = t.getAttribute('aria-expanded') !== 'true';
      t.setAttribute('aria-expanded', String(open));
      t.closest('.cl-notes').classList.toggle('open', open);
      t.querySelector('span').textContent = open ? 'Show fewer notes' : 'Show all notes';
      return;
    }
    var f = ev.target.closest('.cl-ftags button');
    if (f) { setState({ tag: f.dataset.tag }); var r = $('#releases'); if (r) r.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); }
  });

  /* ---------- data ---------- */
  function stats() {
    var stable = entries.filter(function (e) { return e.channel === 'stable'; });
    latestStable = stable.length ? stable[0].tag : '';
    var apps = entries.filter(function (e) { return e.channel !== 'other'; });
    $('#st-count').textContent = apps.length;
    $('#st-latest').textContent = stable.length ? stable[0].version : '—';
    $('#st-first').textContent = apps.length ? fmtDate(apps[apps.length - 1].date) : '—';
    var nav = $('#nav-download'), apk = stable.length && stable[0].downloads.find(function (d) { return d.label === 'Android'; });
    if (nav && apk) nav.href = apk.url;
  }

  function use(releases, source) {
    entries = K.normalize(releases);
    stats(); renderTags(); render(false);
    $('#cl-source').textContent = source;
    if (location.hash) { var el = document.getElementById(location.hash.slice(1)); if (el) el.scrollIntoView({ block: 'start' }); }
  }

  var store = {
    get: function (k, ttl) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v && Date.now() - v.t < ttl ? v.d : null; } catch (e) { return null; } },
    set: function (k, d) { try { localStorage.setItem(k, JSON.stringify({ t: Date.now(), d: d })); } catch (e) { /* full or blocked */ } }
  };

  async function fromGitHub() {
    var out = [];
    for (var p = 1; p <= 5; p++) {
      var r = await fetch('https://api.github.com/repos/' + REPO + '/releases?per_page=100&page=' + p, { headers: { Accept: 'application/vnd.github+json' } });
      if (!r.ok) throw new Error('GitHub API ' + r.status);
      var page = await r.json();
      out = out.concat(page);
      if (page.length < 100) break;
    }
    return out;
  }

  async function load() {
    var cached = store.get('kv-releases', 10 * 60 * 1000);
    if (cached) { use(cached, 'Read from GitHub releases a few minutes ago.'); return; }
    try {
      var live = K.slim(await fromGitHub());
      store.set('kv-releases', live);
      use(live, 'Read live from GitHub releases.');
    } catch (err) {
      try {
        var r = await fetch('data/releases.json', { cache: 'no-cache' });
        var saved = await r.json();
        use(saved.releases || [], 'GitHub is not answering right now, so this is the saved copy from ' + fmtDate(saved.fetched_at) + '. Newer versions are on GitHub.');
      } catch (e2) {
        $('#cl-count').textContent = 'The releases could not be loaded. They are all on GitHub.';
      }
    }
  }
  syncControls();
  load();
})();
