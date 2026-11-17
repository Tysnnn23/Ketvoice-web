/* Ketvoice — motion (round 5). Vanilla, no dependencies.
 * The language: things arrive quietly (a fade on cubic-bezier(.22,1,.36,1), a few
 * pixels of rise out of a light blur), small UI answers fast with a hint of
 * overshoot (.14–.25 s), the nav pill shrinks with a spring while you scroll down,
 * a soft spotlight follows the cursor in the hero, and two scenes are tied to the
 * scroll: the Vice City chips gather onto the banner, the screenshots drift.
 * Entrances and loops are CSS (html.motion + .visible from main.js); this file
 * only toggles states and writes a few custom properties.
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

  if (reduce) return;

  /* ---------- nav pill: shrinks while scrolling down, comes back on the way up ---------- */
  var bar = $('#topbar'), lastY = scrollY;
  /* ---------- scroll-linked scenes ---------- */
  var stage = $('#vc-stage'), shots = all('.shot[data-depth]'), phone = $('.showcase-phone'), hero = $('.hero');
  var queued = false;
  function frame() {
    queued = false;
    var y = scrollY, vh = innerHeight;
    if (bar) { var d = y - lastY; if (Math.abs(d) > 2) { bar.classList.toggle('compact', d > 0 && y > 8); lastY = y; } }
    if (stage) {
      var r = stage.getBoundingClientRect();
      // 0 when the stage enters at the bottom, 1 when its centre reaches 40% of the screen
      var k = clamp((vh - r.top) / (vh * 0.6 + r.height * 0.5), 0, 1);
      stage.style.setProperty('--k', (1 - Math.pow(1 - k, 2)).toFixed(4));
    }
    if (shots.length) {
      var sr = shots[0].parentNode.getBoundingClientRect();
      var s = clamp((vh - sr.top) / (vh + sr.height), 0, 1) - 0.5;
      shots.forEach(function (el) { el.style.setProperty('--drift', (s * 56 * Number(el.dataset.depth)).toFixed(1) + 'px'); });
    }
    if (phone && hero) {
      var h = clamp(y / Math.max(1, hero.offsetHeight), 0, 1);
      phone.style.setProperty('--lift', (-h * 70).toFixed(1) + 'px');
    }
  }
  function onScroll() { if (!queued) { queued = true; requestAnimationFrame(frame); } }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  frame();

  /* ---------- hero spotlight under the cursor ---------- */
  if (hero && fine) {
    var spotQueued = false, sx = 0, sy = 0;
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect(); sx = e.clientX - r.left; sy = e.clientY - r.top;
      if (!spotQueued) { spotQueued = true; requestAnimationFrame(function () { spotQueued = false; hero.style.setProperty('--sx', sx + 'px'); hero.style.setProperty('--sy', sy + 'px'); hero.classList.add('lit'); }); }
    }, { passive: true });
    hero.addEventListener('pointerleave', function () { hero.classList.remove('lit'); });
  }

  /* ---------- the mobile menu: links slide in one after another ---------- */
  var mm = $('#mobile-menu');
  if (mm) all('a,button', mm).forEach(function (el, i) { el.style.setProperty('--i', i); });
})();
