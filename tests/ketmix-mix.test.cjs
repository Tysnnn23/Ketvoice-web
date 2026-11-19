// The Ketmix demo's automation (js/ketmix/mix.js): what each preset writes on the two decks.
// Run: node tests/ketmix-mix.test.cjs
const assert = require('node:assert/strict');
const M = require('../js/ketmix/mix.js');

let passed = 0;
function test(name, fn) { fn(); passed++; }
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
const range = (p, n = 200) => Array.from({ length: n + 1 }, (_, i) => p.start + (p.end - p.start) * i / n);

test('Auto picks the beat-matched mix for 124 and 116 BPM, and falls back further apart', () => {
  assert.equal(M.resolve('auto'), 'beatmatch');
  const far = { out: { bpm: 124 }, into: { bpm: 110 } }, farther = { out: { bpm: 140 }, into: { bpm: 90 } };
  assert.equal(M.resolve('auto', far), 'filter');
  assert.equal(M.resolve('auto', farther), 'crossfade');
  assert.equal(M.resolve('echo'), 'echo');
  assert.equal(M.resolve('nonsense'), 'crossfade');
});

test('the box stays on whole bars inside the window; Écho is always two bars', () => {
  assert.deepEqual(M.clampBox(6.4, 3.6, 'beatmatch'), { startBar: 6, lengthBars: 4 });
  assert.deepEqual(M.clampBox(-5, 99, 'crossfade'), { startBar: M.LIMITS.startMin, lengthBars: M.LIMITS.lengthMax });
  assert.deepEqual(M.clampBox(10, 6, 'filter'), { startBar: 8, lengthBars: 6 });
  assert.deepEqual(M.clampBox(5, 6, 'echo'), { startBar: 5, lengthBars: 2 });
  assert.deepEqual(M.clampBox('x', null, 'beatmatch'), { startBar: 6, lengthBars: 4 });
});

test('valueAt interpolates, holds the ends and takes steps', () => {
  const pts = [[0, 0], [1, 1], [1, 5], [2, 5]];
  assert.equal(M.valueAt(pts, -1), 0);
  assert.equal(M.valueAt(pts, 0.5), 0.5);
  assert.equal(M.valueAt(pts, 1), 5);
  assert.equal(M.valueAt(pts, 9), 5);
  assert.equal(M.valueAt([], 3), 0);
});

test('pointsFrom starts mid-way with the right value and keeps the later points', () => {
  const pts = [[0, 1], [2, 1], [4, 0]];
  assert.deepEqual(M.pointsFrom(pts, 3), [[3, 0.5], [4, 0]]);
  assert.deepEqual(M.pointsFrom(pts, -1)[0], [-1, 1]);
});

test('Fondu: equal power, the two always add up to full', () => {
  const p = M.plan({ preset: 'crossfade', startBar: 4, lengthBars: 4 });
  assert.equal(p.kind, 'crossfade');
  for (const t of range(p, 16)) {
    const a = M.valueAt(p.out.gain, t), b = M.valueAt(p.into.gain, t);
    assert.ok(near(a * a + b * b, 1, 1e-9), `power at ${t}`);
  }
  assert.equal(M.valueAt(p.into.gain, p.start - 0.01), 0);
  assert.equal(M.valueAt(p.out.gain, p.end + 0.01), 0);
  assert.equal(M.valueAt(p.into.rate, p.start), 1, 'a plain fade keeps each tempo');
});

test('Calé sur le tempo: the incoming plays at the outgoing tempo, then back to its own', () => {
  const p = M.plan({ preset: 'beatmatch', startBar: 6, lengthBars: 4 });
  const ratio = 124 / 116;
  assert.ok(near(M.valueAt(p.into.rate, p.start), ratio));
  assert.ok(near(M.valueAt(p.into.rate, p.end), ratio));
  assert.equal(M.valueAt(p.into.rate, p.end + 2 * p.bar), 1);
  // its beats land on the outgoing beats: one incoming beat lasts one outgoing beat while matched
  assert.ok(near(M.beatSec(116) / ratio, p.beat, 1e-9));
  assert.ok(near(M.inPos(p, p.start + p.beat), M.beatSec(116), 1e-3));
});

test('Calé sur le tempo: the bass changes hands on the middle beat, never both full', () => {
  const p = M.plan({ preset: 'beatmatch', startBar: 6, lengthBars: 4 });
  const mid = (p.start + p.end) / 2;
  assert.equal(M.valueAt(p.out.shelf, p.start), 0);
  assert.equal(M.valueAt(p.into.shelf, p.start), M.SHELF_CUT);
  assert.equal(M.valueAt(p.out.shelf, mid + p.beat), M.SHELF_CUT);
  assert.equal(M.valueAt(p.into.shelf, mid + p.beat), 0);
  for (const t of range(p)) {
    const a = M.curvesAt(p.out, t).bass, b = M.curvesAt(p.into, t).bass;
    assert.ok(a + b <= 1 + 1e-9, `bass at ${t}`);
  }
  // the incoming is full by the middle, the outgoing still full there
  assert.ok(near(M.valueAt(p.into.gain, mid), 1));
  assert.ok(near(M.valueAt(p.out.gain, mid), 1));
});

test('Filtres: one opens from the top while the other thins out from the bottom', () => {
  const p = M.plan({ preset: 'filter', startBar: 5, lengthBars: 4 });
  let prevOut = Infinity, prevIn = -Infinity;
  for (const t of range(p, 40)) {
    const o = M.curvesAt(p.out, t).filter, i = M.curvesAt(p.into, t).filter;
    assert.ok(o <= prevOut + 1e-9 && i >= prevIn - 1e-9, `monotonic at ${t}`);
    prevOut = o; prevIn = i;
  }
  assert.equal(M.valueAt(p.into.lp, p.end), 20000);
  assert.ok(near(M.valueAt(p.out.hp, p.end), 1500, 1e-6));
});

test('Écho: the dry outgoing stops on the bar, its last beat goes into the echo, the incoming starts there', () => {
  const p = M.plan({ preset: 'echo', startBar: 7, lengthBars: 5 });
  assert.equal(p.lengthBars, 2);
  assert.equal(M.valueAt(p.out.gain, p.start + 0.1), 0);
  assert.equal(M.valueAt(p.out.echo, p.start - p.beat / 2), 1);
  assert.equal(M.valueAt(p.out.echo, p.start + 0.2), 0);
  assert.equal(M.valueAt(p.into.gain, p.start + p.beat), 1);
  assert.ok(M.curvesAt(p.out, p.start + p.bar).volume > 0, 'the ring-out is drawn');
  assert.ok(p.echoFeedback < 1, 'the echo dies away');
});

test('Sans mix: the first stops, a gap, the second at its own tempo', () => {
  const p = M.plan({ preset: 'beatmatch', mix: false, startBar: 6, lengthBars: 4 });
  assert.equal(p.kind, 'none');
  assert.ok(p.inStart > p.end);
  assert.equal(M.valueAt(p.out.gain, p.end + 0.01), 0);
  assert.equal(M.valueAt(p.into.rate, p.inStart + 1), 1);
  assert.ok(M.inPos(p, p.inStart - 0.1) < 0);
});

test('every preset stays inside its bounds and inside the window', () => {
  for (const preset of M.PRESETS) for (const mix of [true, false]) for (let s = 0; s < 14; s += 3) {
    const p = M.plan({ preset, mix, startBar: s, lengthBars: s % 7 });
    assert.ok(p.playFrom >= 0 && p.playFrom < p.start && p.playUntil <= p.windowEnd && p.playUntil > p.end);
    for (const d of [p.out, p.into]) for (let t = 0; t <= p.windowEnd; t += 0.25) {
      const c = M.curvesAt(d, t);
      for (const k of ['volume', 'bass', 'filter']) assert.ok(c[k] >= 0 && c[k] <= 1, `${preset} ${k}`);
      const g = M.valueAt(d.gain, t);
      assert.ok(g >= -1e-9 && g <= 1 + 1e-9 && Number.isFinite(g));
      assert.ok(M.valueAt(d.hp, t) >= 20 && M.valueAt(d.lp, t) <= 20000);
    }
  }
});

test('the loops are four bars of notes, in two keys and two tempos', () => {
  const a = M.score(M.LOOPS.out), b = M.score(M.LOOPS.into);
  assert.notEqual(M.LOOPS.out.bpm, M.LOOPS.into.bpm);
  assert.equal(a.filter((e) => e.kind === 'kick').length, 16);
  assert.ok(a.every((e) => e.t >= 0 && e.t < M.loopSec(M.LOOPS.out)));
  assert.ok(b.every((e) => e.t >= 0 && e.t < M.loopSec(M.LOOPS.into)));
  assert.ok(near(M.midiHz(69), 440));
  assert.ok(near(b.find((e) => e.kind === 'bass').hz, M.midiHz(38)), 'the incoming bass starts on D');
});

console.log(`ketmix-mix: ${passed} tests passed`);
