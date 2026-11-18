/* Ketvoice — motion (rounds 5 and 6). Vanilla, no dependencies.
 * The language: things arrive quietly (a fade on cubic-bezier(.22,1,.36,1), a few
 * pixels of rise out of a light blur), small UI answers fast with a hint of
 * overshoot (.14–.25 s), the nav pill shrinks with a spring while you scroll down,
 * a soft spotlight follows the cursor in the hero, and two scenes are tied to the
 * scroll: the Vice City chips gather onto the banner, the screenshots drift.
 * Entrances and loops are CSS (html.motion + .visible from main.js); this file
 * only toggles states and writes a few custom properties.
 * Round 6 adds: the hero title's letters settle and its last words light up like a sung
 * line; the hero's sun sets and the sky darkens with the scroll; the photo drifts; one
 * pinned phone is scrubbed through the screenshots; headings rise word by word; counters;
 * magnetic buttons and an eased spotlight on fine pointers. Every scroll scene reads its
 * own progress in one requestAnimationFrame per scroll, only while it is on screen
 * (IntersectionObserver), and writes transforms, opacities or custom properties.
 * prefers-reduced-motion: the interactive bits (menus, FAQ) still work, nothing moves. */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var all = function (s, c) { return [].slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  /* ---------- split download button ---------- */
  var more = $('#split-more'), menu = $('#split-menu');
  function setMenu(open) {
    if (!more || !menu) return;
    more.setAttribute('aria-expanded', String(open));
    menu.classList.toggle('open', open);
    if (open) setTimeout(function () { var first = menu.querySelector('a:not([hidden])'); if (first) first.focus(); }, 60);
  }
  if (more && menu) {
    more.addEventListener('click', function (e) { e.stopPropagation(); setMenu(more.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('click', function (e) { if (!menu.contains(e.target)) setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('open')) { setMenu(false); more.focus(); } });
    menu.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      var items = all('a:not([hidden])', menu), i = items.indexOf(document.activeElement);
      items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length].focus();
    });
  }

  /* ---------- FAQ: one region opens at a time ---------- */
  all('.qa button').forEach(function (b) {
    b.addEventListener('click', function () {
      var open = b.getAttribute('aria-expanded') !== 'true';
      all('.qa button').forEach(function (o) { o.setAttribute('aria-expanded', 'false'); o.closest('.qa').classList.remove('open'); });
      b.setAttribute('aria-expanded', String(open));
      b.closest('.qa').classList.toggle('open', open);
    });
  });

  /* ---------- the song ticker can be held still ---------- */
  var ticker = $('#ticker'), tkb = $('#tk-pause');
  if (ticker && tkb) tkb.addEventListener('click', function () {
    var held = tkb.getAttribute('aria-pressed') !== 'true';
    tkb.setAttribute('aria-pressed', String(held));
    tkb.setAttribute('aria-label', held ? 'Play the song ticker' : 'Pause the song ticker');
    ticker.classList.toggle('held', held);
  });

  if (reduce) return;

  var make = function (tag, cls, text) { var el = document.createElement(tag); if (cls) el.className = cls; if (text != null) el.textContent = text; return el; };

  /* ---------- kinetic title: letters settle once, the last words light up ---------- */
  all('[data-kinetic]').forEach(function (h) {
    var label = h.textContent.replace(/\s+/g, ' ').trim(), kt = make('span', 'kt'), i = 0, j = 0;
    kt.setAttribute('aria-hidden', 'true');
    function words(text, lit) {
      text.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { kt.appendChild(document.createTextNode(' ')); return; }
        var w = make('span', lit ? 'kw lw' : 'kw');
        if (lit) {
          w.setAttribute('data-t', part); w.style.setProperty('--i', i++); w.style.setProperty('--j', j++);
          w.appendChild(make('span', 'ink', part));
        } else Array.from(part).forEach(function (ch) { var l = make('span', 'kl', ch); l.style.setProperty('--i', i++); w.appendChild(l); });
        kt.appendChild(w);
      });
    }
    [].slice.call(h.childNodes).forEach(function (n) {
      if (n.nodeType === 3) words(n.nodeValue, false);
      else if (n.nodeType === 1) words(n.textContent, n.classList.contains('sung'));
    });
    h.textContent = ''; h.appendChild(kt);
    h.setAttribute('aria-label', label);
    h.classList.add('split');
  });

  /* ---------- section headings rise word by word when they enter ---------- */
  all('.sec-head h2, .cta h2').forEach(function (h) {
    var w = 0;
    [].slice.call(h.childNodes).forEach(function (n) {
      if (n.nodeType !== 3) return;
      var frag = document.createDocumentFragment();
      n.nodeValue.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        var o = make('span', 'ww'); o.style.setProperty('--w', w++); o.appendChild(make('span', '', part)); frag.appendChild(o);
      });
      h.replaceChild(frag, n);
    });
  });

  /* ---------- the pinned phone: the scroll scrubs through the screenshots ---------- */
  var scrub = $('#scrub'), strip = scrub && $('.strip', scrub), figs = scrub ? all('.shot', scrub) : [];
  var pics = figs.map(function (f) { return $('picture', f); }), meta = null, active = -1;
  if (scrub && figs.length > 1) {
    scrub.style.setProperty('--n', figs.length);
    meta = make('div', 'scrub-meta'); meta.setAttribute('aria-hidden', 'true');
    var mNow = make('b', '', '01'), mBar = make('span', 'sm-bar'); mBar.appendChild(make('i'));
    meta.appendChild(mNow); meta.appendChild(mBar); meta.appendChild(make('span', '', String(figs.length).padStart(2, '0')));
    strip.appendChild(meta);
    strip.removeAttribute('tabindex'); // nothing to scroll sideways any more
    scrub.classList.add('ready');
  } else scrub = null;

  /* ---------- counters count up once, when they are seen ---------- */
  var counts = all('.count[data-count]');
  counts.forEach(function (c) { c.style.setProperty('--d', String(c.dataset.count).length); c.textContent = '0'; });
  function countUp() {
    var t0 = performance.now();
    (function tick(now) {
      var done = true;
      counts.forEach(function (c, k) {
        var p = clamp((now - t0 - k * 140) / 1500, 0, 1), e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p), n = Number(c.dataset.count) || 0;
        c.textContent = String(Math.round(n * e));
        if (p < 1) done = false; else c.dataset.counted = '1';
      });
      if (!done) requestAnimationFrame(tick);
    })(t0);
  }

  /* ---------- scroll-linked scenes (one rAF per scroll, offscreen scenes skipped) ---------- */
  var bar = $('#topbar'), lastY = scrollY;
  var stage = $('#vc-stage'), phone = $('.showcase-phone'), hero = $('.hero');
  var sun = $('.vc-sun'), show = $('.showcase'), photo = $('.showcase-art img');
  var live = { hero: true, scrub: false, stage: true }, showTop = 0, stickH = 0;
  function measure() {
    if (show) showTop = show.getBoundingClientRect().top + scrollY;
    if (strip) stickH = strip.offsetHeight;
  }
  var smooth = function (t) { return t * t * t * (t * (t * 6 - 15) + 10); };
  var queued = false;
  function frame() {
    queued = false;
    var y = scrollY, vh = innerHeight;
    if (bar) { var d = y - lastY; if (Math.abs(d) > 2) { bar.classList.toggle('compact', d > 0 && y > 8); lastY = y; } }
    // read everything first, then write
    var vr = stage && live.stage ? stage.getBoundingClientRect() : null;
    var sr = scrub && live.scrub ? scrub.getBoundingClientRect() : null;
    var hr = hero && live.hero && show ? show.getBoundingClientRect() : null;
    if (vr) {
      // 0 when the stage enters at the bottom, 1 when its centre reaches 40% of the screen
      var k = clamp((vh - vr.top) / (vh * 0.6 + vr.height * 0.5), 0, 1);
      stage.style.setProperty('--k', (1 - Math.pow(1 - k, 2)).toFixed(4));
    }
    if (hr) {
      // the sun is down when the showcase's top edge reaches the top of the screen
      var hp = clamp(y / Math.max(1, showTop), 0, 1);
      if (sun) sun.style.setProperty('--set', smooth(hp).toFixed(4));
      show.style.setProperty('--dusk', (hp * 0.55).toFixed(3));
      window.KV_SKY = hp;
      if (photo) photo.style.setProperty('--py', (clamp((hr.top + hr.height / 2 - vh / 2) / vh, -1, 1) * hr.width * 0.0175).toFixed(1) + 'px');
      if (phone && hero) phone.style.setProperty('--lift', (-clamp(y / Math.max(1, hero.offsetHeight), 0, 1) * 70).toFixed(1) + 'px');
    }
    if (sr) {
      var n = figs.length, p = clamp(-sr.top / Math.max(1, sr.height - stickH), 0, 1);
      var f = p * (n - 1), i0 = Math.min(n - 1, Math.floor(f));
      // each screen rests, then the next one glides in over it
      var e = i0 === n - 1 ? 0 : smooth(clamp((f - i0 - 0.38) / 0.62, 0, 1)), g = i0 + e;
      pics.forEach(function (pic, i) {
        var dd = i - g, o = 1, ty = 0, s = 1;
        if (dd >= 1 || dd <= -1) { o = 0; ty = dd > 0 ? 100 : -30; }
        else if (dd >= 0) ty = dd * 100;
        else { o = 1 + dd * 0.8; ty = dd * 30; s = 1 + dd * 0.035; }
        pic.style.transform = 'translate3d(0,' + ty.toFixed(2) + '%,0) scale(' + s.toFixed(4) + ')';
        pic.style.opacity = o.toFixed(3);
      });
      var a = Math.round(g);
      if (a !== active) {
        figs.forEach(function (fg, i) { fg.classList.toggle('on', i === a); });
        if (meta) meta.firstChild.textContent = String(a + 1).padStart(2, '0');
        active = a;
      }
      var swing = Math.sin(e * Math.PI);
      strip.style.setProperty('--tilt', (swing * (i0 % 2 ? -6 : 6)).toFixed(2) + 'deg');
      strip.style.setProperty('--glow', (1 + swing * 0.08).toFixed(3));
      if (meta) meta.style.setProperty('--p', p.toFixed(4));
    }
  }
  function onScroll() { if (!queued) { queued = true; requestAnimationFrame(frame); } }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', function () { measure(); onScroll(); }, { passive: true });
  addEventListener('load', function () { measure(); onScroll(); });
  measure(); frame();

  /* ---------- offscreen: loops pause, scenes stop computing ---------- */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        var on = en.isIntersecting, t = en.target;
        if (t === hero) live.hero = on;
        else if (t === scrub) live.scrub = on;
        else if (t === stage) live.stage = on;
        if (t !== scrub) t.classList.toggle('paused', !on);
      });
      onScroll();
    }, { rootMargin: '80px 0px' });
    [hero, scrub, stage].concat(all('.bento .cell')).forEach(function (el) { if (el) io.observe(el); });
    var tally = $('#tally');
    if (tally && counts.length) {
      var cio = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { cio.disconnect(); countUp(); } }, { threshold: 0.5 });
      cio.observe(tally);
    }
  } else { live.scrub = true; countUp(); }

  if (fine) {
    /* ---------- the hero spotlight trails the cursor ---------- */
    if (hero) {
      var tx = 0, ty = 0, cx = null, cy = 0, spotting = false;
      var spot = function () {
        cx += (tx - cx) * 0.14; cy += (ty - cy) * 0.14;
        hero.style.setProperty('--sx', cx.toFixed(1) + 'px'); hero.style.setProperty('--sy', cy.toFixed(1) + 'px');
        if (Math.abs(tx - cx) + Math.abs(ty - cy) > 0.6) requestAnimationFrame(spot); else spotting = false;
      };
      hero.addEventListener('pointermove', function (e) {
        var r = hero.getBoundingClientRect(); tx = e.clientX - r.left; ty = e.clientY - r.top;
        if (cx === null) { cx = tx; cy = ty; }
        hero.classList.add('lit');
        if (!spotting) { spotting = true; requestAnimationFrame(spot); }
      }, { passive: true });
      hero.addEventListener('pointerleave', function () { hero.classList.remove('lit'); });
    }

    /* ---------- magnetic buttons: they lean toward a pointer that comes near ---------- */
    var mags = all('[data-magnet]'), mx = 0, my = 0, mQueued = false;
    var rest = function (m) { if (!m._on) return; m._on = false; m._x = m._y = 0; m.classList.remove('pull'); m.style.setProperty('--mx', '0px'); m.style.setProperty('--my', '0px'); };
    var pull = function () {
      mQueued = false;
      mags.forEach(function (m) {
        if (m.querySelector('.split-menu.open')) { rest(m); return; }
        var r = m.getBoundingClientRect(), x0 = r.left - (m._x || 0), y0 = r.top - (m._y || 0), pad = 32;
        if (mx < x0 - pad || mx > x0 + r.width + pad || my < y0 - pad || my > y0 + r.height + pad) { rest(m); return; }
        m._x = clamp((mx - x0 - r.width / 2) * 0.2, -9, 9); m._y = clamp((my - y0 - r.height / 2) * 0.3, -6, 6); m._on = true;
        m.classList.add('pull');
        m.style.setProperty('--mx', m._x.toFixed(1) + 'px'); m.style.setProperty('--my', m._y.toFixed(1) + 'px');
      });
    };
    if (mags.length) {
      addEventListener('pointermove', function (e) { mx = e.clientX; my = e.clientY; if (!mQueued) { mQueued = true; requestAnimationFrame(pull); } }, { passive: true });
      document.documentElement.addEventListener('pointerleave', function () { mags.forEach(rest); });
      addEventListener('scroll', function () { mags.forEach(rest); }, { passive: true });
    }
  }

  /* ---------- the mobile menu: links slide in one after another ---------- */
  var mm = $('#mobile-menu');
  if (mm) all('a,button', mm).forEach(function (el, i) { el.style.setProperty('--i', i); });
})();
