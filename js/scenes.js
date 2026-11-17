/* Ketvoice — scroll scenes (vanilla, no dependencies).
 * 1. Hero: --p (0 → 1) while the sticky sunset is pinned. CSS scroll-driven
 *    animations set it where supported; this file sets it everywhere else.
 * 2. Headline: words rise in on load; on fine pointers each letter thins out
 *    as the cursor passes (variable font weight) and springs back.
 * 3. Ticker: drifts on its own and speeds up / skews with scroll velocity.
 * 4. Story: the step crossing the middle of the screen drives the phone.
 * Everything here is skipped or reduced to its final state with
 * prefers-reduced-motion. */
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var root = document.documentElement;
  var hero = document.querySelector('.hero');
  var story = document.querySelector('.story');
  var cssTimeline = window.CSS && CSS.supports && CSS.supports('animation-timeline: view()');
  var clamp = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };

  /* ---------- scroll-linked progress ---------- */
  var queued = false;
  function measure() {
    queued = false;
    var vh = innerHeight;
    if (hero && !cssTimeline && !reduce) {
      var r = hero.getBoundingClientRect();
      hero.style.setProperty('--p', clamp(-r.top / Math.max(1, r.height - vh)).toFixed(4));
    }
    if (story) {
      var s = story.querySelector('.story-grid').getBoundingClientRect();
      story.style.setProperty('--s', clamp((vh * 0.5 - s.top) / Math.max(1, s.height)).toFixed(4));
    }
  }
  function onScroll() { if (!queued) { queued = true; requestAnimationFrame(measure); } }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  measure();

  /* ---------- headline ---------- */
  var h1 = document.querySelector('.kinetic');
  if (h1) {
    if (!reduce && fine) {
      // Split each word into letters once; the h1 keeps its plain text for assistive tech.
      h1.setAttribute('aria-label', h1.textContent.replace(/\s+/g, ' ').trim());
      h1.querySelectorAll('.w').forEach(function (w) {
        var t = w.textContent; w.textContent = '';
        w.setAttribute('aria-hidden', 'true');
        for (var i = 0; i < t.length; i++) { var c = document.createElement('span'); c.className = 'ch'; c.textContent = t[i]; w.appendChild(c); }
      });
      var chars = [].slice.call(h1.querySelectorAll('.ch'));
      var state = chars.map(function () { return { w: 0, v: 0, t: 0 }; });
      var centers = null, running = false, last = 0, px = -1e4, py = -1e4;
      var BASE = 800, MIN = 520, RADIUS = 150;
      function cache() { centers = chars.map(function (c) { var r = c.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }); }
      function frame(now) {
        var dt = Math.min(0.032, (now - last) / 1000) || 0.016; last = now;
        var moving = false;
        for (var i = 0; i < chars.length; i++) {
          var st = state[i];
          var f = -170 * (st.w - st.t) - 18 * st.v;   // spring toward the target thinning
          st.v += f * dt; st.w += st.v * dt;
          if (Math.abs(st.v) > 0.002 || Math.abs(st.w - st.t) > 0.002) moving = true; else { st.w = st.t; st.v = 0; }
          chars[i].style.fontWeight = Math.round(BASE - (BASE - MIN) * st.w);
          chars[i].style.transform = st.w > 0.001 ? 'translateY(' + (-st.w * 0.06).toFixed(3) + 'em)' : '';
        }
        if (moving) requestAnimationFrame(frame); else running = false;
      }
      function wake() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } }
      function target() {
        if (!centers) cache();
        for (var i = 0; i < chars.length; i++) {
          var dx = centers[i][0] - px, dy = centers[i][1] - py;
          state[i].t = Math.exp(-(dx * dx + dy * dy) / (2 * RADIUS * RADIUS));
        }
        wake();
      }
      hero.addEventListener('pointermove', function (e) { if (e.pointerType !== 'mouse') return; px = e.clientX; py = e.clientY; target(); }, { passive: true });
      hero.addEventListener('pointerleave', function () { px = py = -1e4; target(); });
      addEventListener('scroll', function () { centers = null; }, { passive: true });
      addEventListener('resize', function () { centers = null; });
    }
    var go = function () { h1.classList.add('is-in'); };
    if (document.fonts && document.fonts.ready) { document.fonts.ready.then(go); setTimeout(go, 900); } else go();
  }

  /* ---------- ticker ---------- */
  var ticker = document.querySelector('.ticker');
  if (ticker && !reduce) {
    var track = ticker.querySelector('.ticker-track');
    var x = 0, vel = 0, skew = 0, visible = false, lastY = scrollY, tRun = false, tLast = 0;
    ticker.classList.add('is-driven');
    function tick(now) {
      var dt = Math.min(0.05, (now - tLast) / 1000) || 0.016; tLast = now;
      var half = track.scrollWidth / 2;
      vel *= Math.pow(0.04, dt);                      // scroll boost decays within a second
      x -= (55 + vel) * dt;
      if (half > 0) { while (x <= -half) x += half; while (x > 0) x -= half; }
      skew += ((-vel / 60) - skew) * Math.min(1, dt * 8);
      if (skew > 8) skew = 8; if (skew < -8) skew = -8;
      track.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0) skewX(' + skew.toFixed(2) + 'deg)';
      if (visible) requestAnimationFrame(tick); else tRun = false;
    }
    addEventListener('scroll', function () {
      var y = scrollY, d = y - lastY; lastY = y;
      vel = Math.max(-900, Math.min(900, vel + d * 9));
    }, { passive: true });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        if (visible && !tRun) { tRun = true; tLast = performance.now(); requestAnimationFrame(tick); }
      }).observe(ticker);
    }
  }

  /* ---------- story ---------- */
  if (story) {
    var steps = [].slice.call(story.querySelectorAll('.step'));
    var shots = [].slice.call(story.querySelectorAll('.phone img'));
    var phone = document.getElementById('story-phone');
    var count = document.getElementById('story-count');
    var current = 'player';
    function show(key) {
      if (key === current) return;
      var order = steps.map(function (s) { return s.dataset.screen; });
      var forward = order.indexOf(key) > order.indexOf(current);
      current = key;
      steps.forEach(function (s) { s.classList.toggle('is-active', s.dataset.screen === key); });
      shots.forEach(function (im) {
        var on = im.dataset.screen === key, was = im.classList.contains('on');
        im.classList.toggle('from-below', on && !forward);
        im.classList.toggle('on', on);
        im.classList.toggle('out', was && !on);
        im.classList.toggle('out-down', was && !on && !forward);
      });
      if (count) count.textContent = String(order.indexOf(key) + 1).padStart(2, '0');
      if (phone && !reduce) { phone.classList.remove('flip'); void phone.offsetWidth; phone.classList.add('flip'); }
    }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) show(e.target.dataset.screen); });
      }, { rootMargin: '-48% 0px -48% 0px' });
      steps.forEach(function (s) { io.observe(s); });
    }
    // The phone leans toward the pointer (desktop only).
    var stage = story.querySelector('.story-phone');
    if (stage && phone && fine && !reduce) {
      stage.addEventListener('pointermove', function (e) {
        var r = stage.getBoundingClientRect();
        phone.style.setProperty('--lean-x', (((e.clientX - r.left) / r.width - 0.5) * 14).toFixed(2) + 'deg');
        phone.style.setProperty('--lean-y', (-((e.clientY - r.top) / r.height - 0.5) * 10).toFixed(2) + 'deg');
      }, { passive: true });
      stage.addEventListener('pointerleave', function () { phone.style.setProperty('--lean-x', '0deg'); phone.style.setProperty('--lean-y', '0deg'); });
    }
  }
})();
