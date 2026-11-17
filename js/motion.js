/* Ketvoice — motion (round 4).
 * Language: entrances rise a few pixels out of a blur on an expo/quint-out curve
 * (≈ cubic-bezier(.22,1,.36,1)), short staggers (60–100 ms), springy landings
 * (back-out / CSS spring curves), slow idle loops (2–3 s), and scenes scrubbed
 * by the scroll with a little smoothing. Lenis gives the page inertia on
 * wheel/trackpad (touch keeps native scrolling).
 *
 * Paths:
 *  - prefers-reduced-motion: nothing moves; the story still swaps its screen.
 *  - GSAP or ScrollTrigger missing (CDN blocked): a light native fallback.
 *  - otherwise: the full choreography below.
 * Everything animated here is transform, opacity, filter or a CSS variable. */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return [].slice.call((c || document).querySelectorAll(s)); };
  var hero = $('.hero'), story = $('.story'), sing = $('.sing');
  var G = window.gsap, ST = window.ScrollTrigger;
  var clamp = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };

  /* ---------- the player: which screen is on (all paths) ---------- */
  var steps = story ? $$('.step', story) : [];
  var shots = story ? $$('.phone img', story) : [];
  var phone = $('#story-phone'), count = $('#story-count');
  var current = 'player';
  var order = steps.map(function (s) { return s.dataset.screen; });
  function show(key, animate) {
    if (!key || key === current) return;
    var prev = current; current = key;
    steps.forEach(function (s) { s.classList.toggle('is-active', s.dataset.screen === key); });
    if (count) count.textContent = String(order.indexOf(key) + 1).padStart(2, '0');
    if (!animate) {
      shots.forEach(function (im) { var on = im.dataset.screen === key; im.classList.toggle('out', im.classList.contains('on') && !on); im.classList.toggle('on', on); });
      return;
    }
    var inc = shots.filter(function (im) { return im.dataset.screen === key; })[0];
    var out = shots.filter(function (im) { return im.dataset.screen === prev; })[0];
    var fwd = order.indexOf(key) > order.indexOf(prev);
    G.killTweensOf(shots);
    shots.forEach(function (im) { if (im !== inc && im !== out) G.set(im, { autoAlpha: 0 }); });
    if (out) { G.set(out, { zIndex: 1 }); G.to(out, { autoAlpha: 0, scale: 0.92, yPercent: fwd ? -6 : 6, filter: 'blur(6px)', duration: 0.6, ease: 'power2.out' }); }
    if (inc) {
      G.set(inc, { zIndex: 2, autoAlpha: 1 });
      G.fromTo(inc, { clipPath: fwd ? 'inset(100% 0% 0% 0% round 38px)' : 'inset(0% 0% 100% 0% round 38px)', scale: 1.14, yPercent: 0, filter: 'blur(8px)' },
        { clipPath: 'inset(0% 0% 0% 0% round 38px)', scale: 1, filter: 'blur(0px)', duration: 0.95, ease: 'expo.out' });
    }
    if (count) G.fromTo(count, { yPercent: fwd ? 90 : -90, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.5, ease: 'expo.out' });
    if (phone) G.fromTo(phone, { rotation: fwd ? -3 : 3 }, { rotation: 0, duration: 1.1, ease: 'elastic.out(1, 0.45)' });
  }
  function watchSteps(animate) {
    if (!steps.length || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) show(e.target.dataset.screen, animate); });
    }, { rootMargin: '-48% 0px -48% 0px' });
    steps.forEach(function (s) { io.observe(s); });
  }

  if (reduce) { watchSteps(false); return; }

  /* ---------- headline: letters thin out under the cursor (all motion paths) ---------- */
  var h1 = $('.kinetic');
  if (h1 && fine) {
    h1.setAttribute('aria-label', h1.textContent.replace(/\s+/g, ' ').trim());
    $$('.w', h1).forEach(function (w) {
      var t = w.textContent; w.textContent = ''; w.setAttribute('aria-hidden', 'true');
      for (var i = 0; i < t.length; i++) { var c = document.createElement('span'); c.className = 'ch'; c.textContent = t[i]; w.appendChild(c); }
    });
    var chars = $$('.ch', h1), st = chars.map(function () { return { w: 0, v: 0, t: 0 }; });
    var centers = null, running = false, last = 0, px = -1e4, py = -1e4;
    var cache = function () { centers = chars.map(function (c) { var r = c.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }); };
    var frame = function (now) {
      var dt = Math.min(0.032, (now - last) / 1000) || 0.016, moving = false; last = now;
      for (var i = 0; i < chars.length; i++) {
        var s = st[i], f = -170 * (s.w - s.t) - 18 * s.v;
        s.v += f * dt; s.w += s.v * dt;
        if (Math.abs(s.v) > 0.002 || Math.abs(s.w - s.t) > 0.002) moving = true; else { s.w = s.t; s.v = 0; }
        chars[i].style.fontWeight = Math.round(800 - 280 * s.w);
        chars[i].style.transform = s.w > 0.001 ? 'translateY(' + (-s.w * 0.06).toFixed(3) + 'em)' : '';
      }
      if (moving) requestAnimationFrame(frame); else running = false;
    };
    var aim = function () {
      if (!centers) cache();
      for (var i = 0; i < chars.length; i++) { var dx = centers[i][0] - px, dy = centers[i][1] - py; st[i].t = Math.exp(-(dx * dx + dy * dy) / 45000); }
      if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
    };
    hero.addEventListener('pointermove', function (e) { if (e.pointerType !== 'mouse') return; px = e.clientX; py = e.clientY; aim(); }, { passive: true });
    hero.addEventListener('pointerleave', function () { px = py = -1e4; aim(); });
    addEventListener('scroll', function () { centers = null; }, { passive: true });
    addEventListener('resize', function () { centers = null; });
  }

  /* ---------- ticker: drifts, and leans into the scroll ---------- */
  var ticker = $('.ticker');
  if (ticker) {
    var track = $('.ticker-track', ticker), tx = 0, vel = 0, skew = 0, visible = false, lastY = scrollY, tRun = false, tLast = 0;
    ticker.classList.add('is-driven');
    var tick = function (now) {
      var dt = Math.min(0.05, (now - tLast) / 1000) || 0.016, half = track.scrollWidth / 2; tLast = now;
      vel *= Math.pow(0.04, dt); tx -= (55 + vel) * dt;
      if (half > 0) { while (tx <= -half) tx += half; while (tx > 0) tx -= half; }
      skew += (Math.max(-9, Math.min(9, -vel / 60)) - skew) * Math.min(1, dt * 8);
      track.style.transform = 'translate3d(' + tx.toFixed(2) + 'px,0,0) skewX(' + skew.toFixed(2) + 'deg)';
      if (visible) requestAnimationFrame(tick); else tRun = false;
    };
    addEventListener('scroll', function () { var y = scrollY, d = y - lastY; lastY = y; vel = Math.max(-900, Math.min(900, vel + d * 9)); }, { passive: true });
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (visible && !tRun) { tRun = true; tLast = performance.now(); requestAnimationFrame(tick); }
    }).observe(ticker);
  }

  /* ---------- no GSAP: native fallback ---------- */
  if (!G || !ST) {
    root.classList.remove('motion');
    var q = false;
    var measure = function () {
      q = false;
      if (hero) { var r = hero.getBoundingClientRect(); hero.style.setProperty('--p', clamp(-r.top / Math.max(1, r.height - innerHeight)).toFixed(4)); }
      if (story) { var g = $('.story-grid', story).getBoundingClientRect(); story.style.setProperty('--s', clamp((innerHeight * 0.5 - g.top) / Math.max(1, g.height)).toFixed(4)); }
    };
    addEventListener('scroll', function () { if (!q) { q = true; requestAnimationFrame(measure); } }, { passive: true });
    addEventListener('resize', measure);
    measure(); watchSteps(false);
    return;
  }

  /* ================= full choreography ================= */
  G.registerPlugin(ST);
  root.classList.add('motion-ready');
  G.defaults({ ease: 'expo.out', duration: 1 });

  /* Smooth inertia on wheel and trackpad; anchors glide; touch stays native. */
  var lenis = null;
  if (window.Lenis && fine) {
    lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', ST.update);
    G.ticker.add(function (t) { lenis.raf(t * 1000); });
    G.ticker.lagSmoothing(0);
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      var top = e.target.closest && e.target.closest('#to-top');
      if (top) { e.stopPropagation(); lenis.scrollTo(0, { duration: 1.6 }); return; }
      if (!a || a.classList.contains('skip-link')) return;
      var id = a.getAttribute('href'), t = id.length > 1 && document.querySelector(id);
      if (!t) return;
      e.preventDefault();
      lenis.scrollTo(t, { offset: id === '#top' ? 0 : -84, duration: 1.5 });
      if (history.replaceState) history.replaceState(null, '', id);
    }, true);
  }

  /* Blur-in for headings: words rise out of a blur, one after another. */
  function splitWords(el) {
    var walk = function (node) {
      [].slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var parts = n.textContent.split(/(\s+)/), frag = document.createDocumentFragment();
          parts.forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
            var s = document.createElement('span'); s.className = 'split-w'; s.textContent = p; frag.appendChild(s);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1 && !n.classList.contains('split-w')) walk(n);
      });
    };
    walk(el);
    return $$('.split-w', el);
  }
  function blurIn(targets, trigger, extra) {
    return G.fromTo(targets, { opacity: 0, yPercent: 60, rotate: 2.5, filter: 'blur(10px)' },
      Object.assign({ opacity: 1, yPercent: 0, rotate: 0, filter: 'blur(0px)', duration: 1.15, stagger: 0.065, clearProps: 'filter,transform',
        scrollTrigger: { trigger: trigger, start: 'top 86%', once: true } }, extra || {}));
  }
  ['.story-head h2', '.new-head h2', '.vc-text h2', '.dl-head h2'].forEach(function (s) {
    var el = $(s); if (el) blurIn(splitWords(el), el);
  });
  ['.story-head .label', '.story-note', '.new-head .label', '.vc-text .label', '.dl-head .label', '.dl-sub'].forEach(function (s) {
    var el = $(s); if (el) G.fromTo(el, { opacity: 0, y: 14, filter: 'blur(6px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.9, clearProps: 'filter,transform', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
  });

  /* ---------- hero: an intro, then the scroll walks into the sunset ---------- */
  if (hero) {
    var intro = G.timeline({ delay: 0.05 });
    intro
      .fromTo('.hero .sky img', { scale: 1.24, opacity: 0.25, filter: 'blur(18px) saturate(1.5)' }, { scale: 1, opacity: 1, filter: 'blur(0px) saturate(1)', duration: 2.4, clearProps: 'all' }, 0)
      .fromTo('.hero .sea img', { scale: 1.3, opacity: 0 }, { scale: 1, opacity: 1, duration: 2.4, clearProps: 'all' }, 0)
      .fromTo('.sun-glow', { opacity: 0 }, { opacity: 1, duration: 2.6, ease: 'power3.out', clearProps: 'opacity' }, 0.35)
      .fromTo('.frond-l use', { x: -150, y: -140, rotation: -18, svgOrigin: '250 130' }, { x: 0, y: 0, rotation: 0, duration: 2.2 }, 0.1)
      .fromTo('.frond-r use', { x: -150, y: -140, rotation: -18, svgOrigin: '250 130' }, { x: 0, y: 0, rotation: 0, duration: 2.2 }, 0.2)
      .fromTo('.hero-meta', { opacity: 0, y: 16, filter: 'blur(6px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1, clearProps: 'all' }, 0.55)
      .fromTo('.kinetic .w', { opacity: 0, yPercent: 105, rotate: 6, filter: 'blur(8px)' }, { opacity: 1, yPercent: 0, rotate: 0, filter: 'blur(0px)', duration: 1.3, stagger: 0.07, clearProps: 'all' }, 0.6)
      .fromTo('.hero-lede', { opacity: 0, y: 22, filter: 'blur(8px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.1, clearProps: 'all' }, 1.05)
      .fromTo('.hero-actions > *', { opacity: 0, y: 18, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: 'back.out(2.4)', stagger: 0.09, clearProps: 'all' }, 1.2)
      .fromTo('.edition-credit > *', { opacity: 0, x: 26, filter: 'blur(6px)' }, { opacity: 1, x: 0, filter: 'blur(0px)', duration: 1, stagger: 0.1, clearProps: 'all' }, 0.85)
      .fromTo('.edition-credit .neon', { opacity: 1 }, { keyframes: [{ opacity: 0.25, duration: 0.05 }, { opacity: 1, duration: 0.05 }, { opacity: 0.4, duration: 0.08 }, { opacity: 1, duration: 0.3 }], ease: 'none', clearProps: 'opacity' }, 2.05);
    // The palms keep breathing once they are in.
    intro.add(function () {
      G.to('.frond-l use', { rotation: 1.6, svgOrigin: '250 130', duration: 2.4, ease: 'sine.inOut', yoyo: true, repeat: -1 });
      G.to('.frond-r use', { rotation: -1.3, svgOrigin: '250 130', duration: 2.9, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    });
    // The pinned sunset reads one progress value, smoothed a little.
    G.to(hero, { '--p': 1, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom bottom', scrub: 0.7 } });
  }

  /* ---------- sung word by word: the scroll is the song ---------- */
  if (sing) {
    var words = $$('.wd', sing), lines = $$('.ln', sing), N = words.length, gap = 0.85, total = (N - 1) * gap + 1;
    var lineEnds = lines.map(function (l) { var w = $$('.wd', l); return w[w.length - 1]; });
    var timeEl = $('#sing-time'), barEl = $('.sing-track', sing);
    G.fromTo($$('.label, .sing-lines, .sing-bar, .sing-note', sing), { opacity: 0, y: 40, filter: 'blur(10px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.2, stagger: 0.1, clearProps: 'filter,transform',
      scrollTrigger: { trigger: sing, start: 'top 70%', once: true } });
    var song = G.timeline({
      scrollTrigger: { trigger: sing, start: 'top top', end: 'bottom bottom', scrub: 0.5 },
      onUpdate: function () {
        var t = song.progress() * total;
        words.forEach(function (w, i) {
          var live = t > i * gap && t < i * gap + 1.25;
          w.classList.toggle('held', live && lineEnds.indexOf(w) > -1);
        });
        var secs = Math.round(41 + song.progress() * 23);
        if (timeEl) timeEl.textContent = '0:' + String(secs).padStart(2, '0');
        if (barEl) barEl.style.setProperty('--sp', (0.2 + song.progress() * 0.12).toFixed(4));
      }
    });
    words.forEach(function (w, i) { song.fromTo(w, { '--f': '0%' }, { '--f': '112%', duration: 1, ease: 'none' }, i * gap); });
    // the line being sung leans forward, sung lines step back
    lines.forEach(function (l, li) {
      var first = words.indexOf($$('.wd', l)[0]), lastI = words.indexOf(lineEnds[li]);
      song.fromTo(l, { scale: 0.96, opacity: 0.55 }, { scale: 1, opacity: 1, duration: 0.6, ease: 'power2.out', transformOrigin: 'left center' }, Math.max(0, first * gap - 0.4));
      if (li < lines.length - 1) song.to(l, { opacity: 0.55, duration: 0.8, ease: 'power1.inOut' }, lastI * gap + 1.2);
    });
    // the colour behind drifts with the song
    G.to($$('.sing-glow i', sing), { xPercent: function (i) { return [18, -22, 12][i]; }, yPercent: function (i) { return [14, 10, -18][i]; }, scale: function (i) { return [1.25, 0.85, 1.15][i]; }, ease: 'none',
      scrollTrigger: { trigger: sing, start: 'top bottom', end: 'bottom top', scrub: 1 } });
  }

  /* ---------- the player ---------- */
  if (story) {
    var wide = matchMedia('(min-width: 901px)');
    if (phone) {
      phone.classList.add('is-gsap'); phone.style.transition = 'none';
      shots.forEach(function (im) { G.set(im, { autoAlpha: im.classList.contains('on') ? 1 : 0 }); });
      G.fromTo(phone, { rotationY: 20, rotationX: 4, y: 40 }, { rotationY: -20, rotationX: -2, y: -20, ease: 'none', transformPerspective: 1400,
        scrollTrigger: { trigger: '.story-grid', start: 'top bottom', end: 'bottom top', scrub: 1 } });
      G.fromTo(phone, { scale: 0.8, opacity: 0, filter: 'blur(12px)' }, { scale: 1, opacity: 1, filter: 'blur(0px)', duration: 1.4, clearProps: 'filter', scrollTrigger: { trigger: '.story-grid', start: 'top 75%', once: true } });
    }
    G.fromTo('.story-rail span', { scaleY: 0 }, { scaleY: 1, ease: 'none', transformOrigin: 'top', scrollTrigger: { trigger: '.story-grid', start: 'top center', end: 'bottom center', scrub: 0.4 } });
    steps.forEach(function (s) {
      var h = $('h3', s);
      if (h) blurIn(splitWords(h), s, { scrollTrigger: { trigger: s, start: 'top 72%', once: true } });
      ST.create({ trigger: s, start: 'top 55%', end: 'bottom 45%', onToggle: function (self) { if (self.isActive) show(s.dataset.screen, wide.matches && !!phone); } });
      var shot = $('.step-shot', s);
      if (shot) G.fromTo(shot, { y: 70, rotate: -6, scale: 0.92, opacity: 0 }, { y: 0, rotate: 0, scale: 1, opacity: 1, duration: 1.2, scrollTrigger: { trigger: shot, start: 'top 92%', once: true } });
    });
  }

  /* ---------- new in 6.1: rules draw, rows land ---------- */
  var newList = $('.new-list');
  if (newList) {
    var rows = $$('div', newList);
    G.fromTo(rows, { '--line-x': 0 }, { '--line-x': 1, duration: 1.3, stagger: 0.1, scrollTrigger: { trigger: newList, start: 'top 82%', once: true } });
    G.fromTo(rows,
      { opacity: 0, y: 22, filter: 'blur(8px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1, stagger: 0.06, clearProps: 'filter,transform', scrollTrigger: { trigger: newList, start: 'top 82%', once: true } });
  }

  /* ---------- Vice City: the banner opens like a curtain ---------- */
  var vc = $('.vice-city');
  if (vc) {
    G.fromTo('.vc-banner picture', { clipPath: 'inset(8% 34% 8% 0% round 0px 6px 6px 0px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px 6px 6px 0px)', ease: 'none',
      scrollTrigger: { trigger: vc, start: 'top 90%', end: 'center 60%', scrub: 0.6 } });
    G.fromTo('.vc-banner img', { scale: 1.35 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: vc, start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
    G.fromTo('.vc-dates dt', { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1, stagger: 0.12, ease: 'back.out(1.8)', scrollTrigger: { trigger: '.vc-dates', start: 'top 88%', once: true } });
    var neon = $('.vc-text .neon');
    if (neon) ST.create({ trigger: neon, start: 'top 80%', once: true, onEnter: function () {
      G.fromTo(neon, { opacity: 0.15 }, { keyframes: [{ opacity: 1, duration: 0.05 }, { opacity: 0.3, duration: 0.07 }, { opacity: 1, duration: 0.05 }, { opacity: 0.5, duration: 0.1 }, { opacity: 1, duration: 0.4 }], ease: 'none', delay: 0.5 });
    } });
  }

  /* ---------- download: rows slide in, numbers count ---------- */
  var dl = $('.download-list');
  if (dl) G.fromTo($$('.download-row', dl), { opacity: 0, x: -36, filter: 'blur(8px)' }, { opacity: 1, x: 0, filter: 'blur(0px)', duration: 1.1, stagger: 0.09, clearProps: 'all', scrollTrigger: { trigger: dl, start: 'top 85%', once: true } });

  /* ---------- footer: the wordmark rises, then rides a wave ---------- */
  var mark = $('.wordmark');
  if (mark) {
    var txt = mark.textContent; mark.textContent = '';
    for (var i = 0; i < txt.length; i++) { var c = document.createElement('span'); c.className = 'lt'; c.textContent = txt[i]; mark.appendChild(c); }
    var lts = $$('.lt', mark);
    G.fromTo(lts, { yPercent: 105, rotate: 10, opacity: 0 }, { yPercent: 0, rotate: 0, opacity: 1, duration: 1.3, stagger: 0.05, scrollTrigger: { trigger: mark, start: 'top 92%', once: true } });
    G.fromTo(lts, { y: function (i) { return i % 2 ? 34 : -16; } }, { y: 0, ease: 'none', scrollTrigger: { trigger: 'footer', start: 'top bottom', end: 'bottom bottom', scrub: 1 } });
  }

  // Fonts and images change heights: measure again once everything is in.
  addEventListener('load', function () { ST.refresh(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ST.refresh(); });
})();
