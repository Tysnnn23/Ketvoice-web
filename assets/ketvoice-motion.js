/* Ketvoice Motion — device tilt (vanilla, no dependencies)
 * Subtle 3D tilt of the hero phone and the experience-stage device toward the
 * pointer, written through CSS custom properties so the page still looks and
 * works perfectly without JS, and transitions handle the easing.
 * Skipped entirely for touch pointers and reduced motion. */
(function () {
  'use strict';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  /* max tilt in degrees; the CSS transition on transform does the easing */
  var MAX = 6;

  function attach(container, target, max) {
    if (!container || !target) return;
    var raf = 0, px = 0, py = 0;

    function apply() {
      raf = 0;
      target.style.setProperty('--tilt-x', (-py * max).toFixed(2) + 'deg');
      target.style.setProperty('--tilt-y', (px * max).toFixed(2) + 'deg');
    }

    container.addEventListener('pointermove', function (e) {
      var r = container.getBoundingClientRect();
      px = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
      py = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
      if (!raf) raf = requestAnimationFrame(apply);
    }, { passive: true });

    container.addEventListener('pointerleave', function () {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      target.style.setProperty('--tilt-x', '0deg');
      target.style.setProperty('--tilt-y', '0deg');
    }, { passive: true });
  }

  attach(document.querySelector('.hero-phone-scene'), document.querySelector('.hero-device'), MAX);
  attach(document.querySelector('.experience-stage'), document.getElementById('device-tilt'), 8);
})();
