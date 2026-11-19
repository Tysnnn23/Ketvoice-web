/* Ketmix demo, the pure part: the two loops written for this page (notes, no samples), the presets and the
   automation each one writes on the two decks. No DOM and no Web Audio here: js/ketmix/demo.js plays and draws
   what this returns, tests/ketmix-mix.test.cjs checks it in Node.

   The clock is the outgoing loop's (« mix time », seconds from its first beat), as in the app's timeline
   (KetmixTimeline.kt). Every automated value is a list of points [time, value]; two points at the same time are a
   step. The presets follow the app's MixKind: Auto (Ketmix decides), Calé sur le tempo (Beatmatch), Écho (Echo),
   Filtres (Filter), Fondu (Crossfade); « Sans mix » is MixKind.None, the second loop after the first one stops. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.KetmixMix = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* Two original loops, four bars each, in sixteenth-note steps. Written for this page; free to play anywhere. */
  var LOOPS = {
    out: {
      id: 'out', name: 'Néon Drive', bpm: 124, key: { fr: 'la mineur', en: 'A minor' }, bars: 4,
      kick: [0, 4, 8, 12], clap: [4, 12], hat: [2, 6, 10, 14], shaker: [],
      // Am F C G, the bass on the off-beats, chord stabs.
      bass: [[45, [0, 3, 6, 10, 14]], [41, [0, 3, 6, 10, 14]], [48, [0, 3, 6, 10, 14]], [43, [0, 3, 6, 10, 13, 14]]],
      chords: [[[57, 60, 64], [0, 3, 6, 10]], [[53, 57, 60], [0, 3, 6, 10]], [[55, 60, 64], [0, 3, 6, 10]], [[55, 59, 62], [0, 3, 6, 11]]],
      chordStyle: 'stab'
    },
    into: {
      id: 'into', name: 'Marée basse', bpm: 116, key: { fr: 'ré majeur', en: 'D major' }, bars: 4,
      kick: [0, 7, 10], clap: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14], shaker: [1, 3, 5, 7, 9, 11, 13, 15],
      // D Bm G A, long bass notes, a pad held through the bar.
      bass: [[38, [0, 10]], [35, [0, 10]], [43, [0, 10]], [45, [0, 7, 10]]],
      chords: [[[62, 66, 69], [0]], [[59, 62, 66], [0]], [[55, 59, 62], [0]], [[57, 61, 64], [0]]],
      chordStyle: 'pad'
    }
  };

  var PRESETS = ['auto', 'beatmatch', 'echo', 'filter', 'crossfade'];
  var WINDOW_BARS = 16;           // what the timeline shows, in bars of the outgoing loop
  var LIMITS = { startMin: 2, startMax: 10, lengthMin: 1, lengthMax: 6, endMax: 14 };
  var GAP_S = 0.6;                // « Sans mix »: the silence between the two
  var SHELF_CUT = -24;            // dB: the bass taken away (low shelf at 180 Hz)
  var HP_OPEN = 20, LP_OPEN = 20000;

  function barSec(bpm) { return 240 / bpm; }
  function beatSec(bpm) { return 60 / bpm; }
  function midiHz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

  /** What « Auto » picks, as Ketmix would from the two tempos: in time when they are close, filters further. */
  function resolve(preset, loops) {
    if (preset && preset !== 'auto') return PRESETS.indexOf(preset) > 0 ? preset : 'crossfade';
    loops = loops || LOOPS;
    var gap = Math.abs(loops.out.bpm / loops.into.bpm - 1);
    return gap <= 0.08 ? 'beatmatch' : gap <= 0.16 ? 'filter' : 'crossfade';
  }

  /** The box on the grid: whole bars, inside the window; Écho has a fixed two-bar ring-out. */
  function clampBox(startBar, lengthBars, kind) {
    var len = kind === 'echo' ? 2 : clamp(Math.round(Number(lengthBars) || 4), LIMITS.lengthMin, LIMITS.lengthMax);
    var start = clamp(Math.round(Number(startBar) || 6), LIMITS.startMin, Math.min(LIMITS.startMax, LIMITS.endMax - len));
    return { startBar: start, lengthBars: len };
  }

  /** n+1 points of f(u), u from 0 to 1, between t0 and t1. */
  function sample(t0, t1, f, n) {
    n = n || 16;
    var out = [];
    for (var i = 0; i <= n; i++) { var u = i / n; out.push([t0 + (t1 - t0) * u, f(u)]); }
    return out;
  }
  var cosDown = function (u) { return u >= 1 ? 0 : Math.cos(u * Math.PI / 2); };
  var sinUp = function (u) { return Math.sin(u * Math.PI / 2); };
  function logSweep(a, b) { return function (u) { return a * Math.pow(b / a, u); }; }

  /** The value of a list of points at t: flat before the first and after the last, linear between. */
  function valueAt(points, t) {
    if (!points || !points.length) return 0;
    if (t <= points[0][0]) return points[0][1];
    for (var i = 1; i < points.length; i++) {
      var p = points[i - 1], q = points[i];
      if (t < q[0]) return q[0] === p[0] ? q[1] : p[1] + (q[1] - p[1]) * (t - p[0]) / (q[0] - p[0]);
    }
    return points[points.length - 1][1];
  }

  /** The points from t0 on, starting with the value at t0: what is scheduled when playback starts mid-way. */
  function pointsFrom(points, t0) {
    var out = [[t0, valueAt(points, t0)]];
    for (var i = 0; i < points.length; i++) if (points[i][0] > t0) out.push([points[i][0], points[i][1]]);
    return out;
  }

  function flat(v) { return [[0, v]]; }
  function deck() { return { gain: flat(1), shelf: flat(0), hp: flat(HP_OPEN), lp: flat(LP_OPEN), rate: flat(1), echo: flat(0), tail: flat(0) }; }

  /**
   * The whole transition for a preset and a box. mix false = « Sans mix ». Returns the decks' points, where the
   * incoming loop starts, the box, and the stretch Play covers (two bars before the box to three after it).
   */
  function plan(opts) {
    opts = opts || {};
    var loops = opts.loops || LOOPS;
    var mix = opts.mix !== false;
    var kind = mix ? resolve(opts.preset || 'auto', loops) : 'none';
    var box = clampBox(opts.startBar, opts.lengthBars, kind);
    var bar = barSec(loops.out.bpm), beat = beatSec(loops.out.bpm);
    var S = box.startBar * bar, L = box.lengthBars * bar, E = S + L, mid = S + L / 2;
    var ratio = loops.out.bpm / loops.into.bpm;
    var out = deck(), into = deck();
    var inStart = S, outStop = E;
    into.gain = [[0, 0], [S, 0]];

    if (kind === 'none') {
      out.gain = [[0, 1], [E, 1], [E, 0]];
      inStart = E + GAP_S;
      into.gain = [[0, 1]];
    } else if (kind === 'crossfade') {
      out.gain = [[0, 1]].concat(sample(S, E, cosDown));
      into.gain = [[0, 0]].concat(sample(S, E, sinUp));
    } else if (kind === 'beatmatch') {
      // Both in time; the incoming comes up without its bass, the bass changes hands on the middle beat.
      out.gain = [[0, 1], [mid, 1]].concat(sample(mid, E, cosDown, 8));
      into.gain = [[0, 0]].concat(sample(S, mid, sinUp, 8));
      out.shelf = [[0, 0], [mid - beat / 2, 0], [mid + beat / 2, SHELF_CUT]];
      into.shelf = [[0, SHELF_CUT], [mid - beat / 2, SHELF_CUT], [mid + beat / 2, 0]];
      into.rate = [[0, ratio], [E, ratio], [E + 2 * bar, 1]];
    } else if (kind === 'filter') {
      // One thins out from the bottom while the other opens from the top, in time.
      out.hp = [[0, HP_OPEN]].concat(sample(S, E, logSweep(HP_OPEN, 1500)));
      out.gain = [[0, 1], [S + 0.7 * L, 1]].concat(sample(S + 0.7 * L, E, cosDown, 8));
      into.lp = [[0, 250]].concat(sample(S, E, logSweep(250, LP_OPEN)));
      into.gain = [[0, 0]].concat(sample(S, S + 0.3 * L, sinUp, 8));
      into.rate = [[0, ratio], [E, ratio], [E + 2 * bar, 1]];
    } else if (kind === 'echo') {
      // Cut on the bar: the last beat goes into an echo that rings out while the next loop starts on that beat.
      out.gain = [[0, 1], [S, 1], [S + 0.06, 0]];
      out.echo = [[0, 0], [S - beat, 0], [S - beat + 0.02, 1], [S + 0.06, 1], [S + 0.12, 0]];
      out.tail = [[0, 0], [S, 0]].concat(sample(S, E, function (u) { return 0.8 * Math.pow(0.02, u); }, 12));
      into.gain = [[0, 0], [S, 0], [S + beat, 1]];
      outStop = S + 0.12;
    }

    var playFrom = Math.max(0, S - 2 * bar);
    var playUntil = Math.min(WINDOW_BARS * bar, Math.max(E, inStart) + 3 * bar);
    return {
      kind: kind, preset: opts.preset || 'auto', mix: mix, loops: loops,
      startBar: box.startBar, lengthBars: box.lengthBars, start: S, end: E, bar: bar, beat: beat,
      ratio: ratio, inStart: inStart, outStop: outStop, playFrom: playFrom, playUntil: playUntil,
      windowEnd: WINDOW_BARS * bar, echoDelay: beat / 2, echoFeedback: 0.6,
      out: out, into: into
    };
  }

  /** Where the incoming loop's own clock is at mix time t (its rate integrated), seconds; negative before it starts. */
  function inPos(p, t) {
    if (t <= p.inStart) return t - p.inStart;
    var pts = p.into.rate, step = 0.05, pos = 0, x = p.inStart;
    while (x < t) { var dx = Math.min(step, t - x); pos += valueAt(pts, x + dx / 2) * dx; x += dx; }
    return pos;
  }

  /** The three curves the timeline draws, each 0..1: volume, bass presence, filter opening (as the app). */
  function curvesAt(d, t) {
    var hp = valueAt(d.hp, t), lp = valueAt(d.lp, t), span = Math.log(1000);
    return {
      volume: clamp(Math.max(valueAt(d.gain, t), valueAt(d.tail, t)), 0, 1),
      bass: clamp(1 + valueAt(d.shelf, t) / -SHELF_CUT, 0, 1),
      filter: clamp(Math.min(1 - Math.log(hp / HP_OPEN) / span, Math.log(lp / HP_OPEN) / span), 0, 1)
    };
  }

  /** Every note of a loop as {t, kind, ...}: what demo.js renders into a buffer, and what a test can count. */
  function score(loop) {
    var step = beatSec(loop.bpm) / 4, ev = [];
    for (var b = 0; b < loop.bars; b++) {
      var t0 = b * 16 * step;
      ['kick', 'clap', 'hat', 'shaker'].forEach(function (k) {
        loop[k].forEach(function (s) { ev.push({ t: t0 + s * step, kind: k }); });
      });
      var bass = loop.bass[b % loop.bass.length], steps = bass[1];
      steps.forEach(function (s, i) {
        var next = i + 1 < steps.length ? steps[i + 1] : 16;
        ev.push({ t: t0 + s * step, kind: 'bass', hz: midiHz(bass[0]), dur: Math.max(1, next - s) * step * 0.9 });
      });
      var ch = loop.chords[b % loop.chords.length];
      ch[1].forEach(function (s) {
        ev.push({ t: t0 + s * step, kind: 'chord', hz: ch[0].map(midiHz), dur: loop.chordStyle === 'pad' ? 16 * step : 1.5 * step });
      });
    }
    return ev.sort(function (a, b) { return a.t - b.t; });
  }

  function loopSec(loop) { return loop.bars * barSec(loop.bpm); }

  return {
    LOOPS: LOOPS, PRESETS: PRESETS, LIMITS: LIMITS, WINDOW_BARS: WINDOW_BARS, SHELF_CUT: SHELF_CUT,
    resolve: resolve, clampBox: clampBox, plan: plan, valueAt: valueAt, pointsFrom: pointsFrom, inPos: inPos,
    curvesAt: curvesAt, score: score, loopSec: loopSec, barSec: barSec, beatSec: beatSec, midiHz: midiHz
  };
});
