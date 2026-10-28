/* Ketvoice Magnetic Glass (vanilla, no dependencies)
 * Continuous spring follow with an attraction zone around each control.
 * CSS keeps a static transform; this file only writes custom properties,
 * so the page stays usable (and still looks correct) without JS. */
(function () {
  'use strict';
  var reduced = matchMedia('(prefers-reduced-motion: reduce)');
  var fine = matchMedia('(hover: hover) and (pointer: fine)');
  if (reduced.matches || !fine.matches) return;

  var SELECTOR = '.btn,.nav-icon,.nav-download,.download-row .row-button';
  var REACH = 78;      /* px of extra pull outside the control */
  var LIFT = 9;        /* px the control rises on hover */
  var SCALE = 1.045;
  var STIFF = 260, DAMP = 26;

  var nodes = [];

  function make(springs, target) {
    return { springs: springs, target: target, v: [0, 0, 0], vel: [0, 0, 0] };
  }

  function build(el) {
    return {
      el: el,
      rect: null,
      hover: false,
      cur: [0, 0, 0],           /* x, y, scale-progress */
      vel: [0, 0, 0],
      tgt: [0, 0, 0],
      shine: [50, 50],
      dirty: true
    };
  }

  function refresh(node) {
    node.rect = node.el.getBoundingClientRect();
  }

  function step(node, dt) {
    var moved = false;
    for (var i = 0; i < 3; i++) {
      var f = -STIFF * (node.cur[i] - node.tgt[i]) - DAMP * node.vel[i];
      node.vel[i] += f * dt;
      node.cur[i] += node.vel[i] * dt;
      if (Math.abs(node.vel[i]) > 0.05 || Math.abs(node.cur[i] - node.tgt[i]) > 0.05) moved = true;
      else { node.cur[i] = node.tgt[i]; node.vel[i] = 0; }
    }
    return moved;
  }

  function paint(node) {
    var s = node.el.style;
    s.setProperty('--mx', node.cur[0].toFixed(2) + 'px');
    s.setProperty('--my', node.cur[1].toFixed(2) + 'px');
    s.setProperty('--pull', (-LIFT * node.cur[2]).toFixed(2) + 'px');
    s.setProperty('--s', (1 + (SCALE - 1) * node.cur[2]).toFixed(4));
    s.setProperty('--shine-x', node.shine[0].toFixed(1) + '%');
    s.setProperty('--shine-y', node.shine[1].toFixed(1) + '%');
  }

  var running = false, last = 0;

  function frame(now) {
    var dt = Math.min((now - last) / 1000, 0.032) || 0.016;
    last = now;
    var active = false;
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (step(n, dt)) active = true;
      paint(n);
    }
    if (active) requestAnimationFrame(frame);
    else running = false;
  }

  function wake() {
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }

  document.querySelectorAll(SELECTOR).forEach(function (el) {
    var n = build(el);
    nodes.push(n);

    el.addEventListener('pointerenter', function () {
      refresh(n);
      n.hover = true;
      n.tgt[2] = 1;
      wake();
    });

    el.addEventListener('pointerleave', function () {
      n.hover = false;
      n.tgt[0] = 0;
      n.tgt[1] = 0;
      n.tgt[2] = 0;
      n.shine = [50, 50];
      wake();
    });

    el.addEventListener('blur', function () {
      n.hover = false;
      n.tgt[0] = n.tgt[1] = n.tgt[2] = 0;
      wake();
    });
  });

  /* One document-level listener drives attraction for every control. */
  document.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (!n.rect) refresh(n);
      var r = n.rect;
      if (!r || !r.width) continue;
      var cx = r.left + r.width / 2;
      var cy = r.top + r.height / 2;
      var dx = e.clientX - cx;
      var dy = e.clientY - cy;
      var inside = Math.abs(dx) <= r.width / 2 + REACH && Math.abs(dy) <= r.height / 2 + REACH;
      if (!inside) {
        if (n.tgt[0] || n.tgt[1]) { n.tgt[0] = 0; n.tgt[1] = 0; wake(); }
        continue;
      }
      var nx = Math.max(-1, Math.min(1, dx / (r.width / 2 + REACH)));
      var ny = Math.max(-1, Math.min(1, dy / (r.height / 2 + REACH)));
      n.tgt[0] = nx * 13;
      n.tgt[1] = ny * 7;
      n.shine = [(nx + 1) * 50, (ny + 1) * 50];
      wake();
    }
  }, { passive: true });

  addEventListener('scroll', function () {
    for (var i = 0; i < nodes.length; i++) nodes[i].rect = null;
  }, { passive: true });

  addEventListener('resize', function () {
    for (var i = 0; i < nodes.length; i++) nodes[i].rect = null;
  });
})();
