/* Ketvoice Spring + Parallax (vanilla, no dependencies)
 * Progressive enhancement: the page works without this file. */
(function () {
  'use strict';
  var reduced = matchMedia('(prefers-reduced-motion: reduce)');
  var fine = matchMedia('(hover: hover) and (pointer: fine)');
  if (reduced.matches) return;

  /* Damped spring: returns a stepper that eases `value` toward `target`. */
  function spring(stiffness, damping) {
    var value = 0, velocity = 0, target = 0;
    return {
      set: function (t) { target = t; },
      get: function () { return value; },
      step: function (dt) {
        var force = -stiffness * (value - target) - damping * velocity;
        velocity += force * dt;
        value += velocity * dt;
        return Math.abs(velocity) > 0.01 || Math.abs(value - target) > 0.01;
      }
    };
  }

  var items = [];
  var running = false;
  var last = 0;

  function frame(now) {
    var dt = Math.min((now - last) / 1000, 0.032);
    last = now;
    var active = false;
    for (var i = 0; i < items.length; i++) {
      if (items[i].update(dt)) active = true;
    }
    if (active) requestAnimationFrame(frame); else running = false;
  }
  function wake() {
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }

  /* Buttons are handled by ketvoice-glass-motion.js (--mx/--my + CSS overshoot easing). */

  /* Hero parallax: phone and waves drift with the pointer and scroll */
  var hero = document.querySelector('.hero');
  var phone = document.querySelector('.hero-phone-scene');
  var waves = document.querySelector('.hero-waves');
  if (hero && (phone || waves)) {
    var px = spring(60, 12), py = spring(60, 12), ps = spring(80, 16);
    items.push({
      update: function (dt) {
        var a = px.step(dt), b = py.step(dt), c = ps.step(dt);
        if (phone) phone.style.transform = 'translate3d(' + px.get().toFixed(2) + 'px,' + (py.get() + ps.get() * -0.08).toFixed(2) + 'px,0)';
        if (waves) waves.style.transform = 'translate3d(' + (px.get() * -0.5).toFixed(2) + 'px,' + (ps.get() * 0.05).toFixed(2) + 'px,0)';
        return a || b || c;
      }
    });
    if (fine.matches) {
      hero.addEventListener('pointermove', function (e) {
        var r = hero.getBoundingClientRect();
        px.set(((e.clientX - r.left) / r.width - 0.5) * 22);
        py.set(((e.clientY - r.top) / r.height - 0.5) * 14);
        wake();
      });
      hero.addEventListener('pointerleave', function () { px.set(0); py.set(0); wake(); });
    }
    addEventListener('scroll', function () {
      if (scrollY < innerHeight * 1.2) { ps.set(scrollY); wake(); }
    }, { passive: true });
  }
})();
