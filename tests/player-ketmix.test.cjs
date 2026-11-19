/* Ketmix's pure part (js/player/ketmix.js): the tempo estimate on synthetic click tracks, the plan of a
 * blend (beat-matched or equal-power), the gain curves and the bass swap. node tests/player-ketmix.test.cjs */
'use strict';
const assert = require('assert');
const K = require('../js/player/ketmix.js');

let failures = 0;
function test(name, fn) { try { fn(); console.log('ok  ' + name); } catch (e) { failures++; console.log('FAIL ' + name + '\n  ' + e.message); } }

/** [seconds] of a kick every beat at [bpm] from [firstMs], with a little noise, at 22 050 Hz. */
function clicks(bpm, seconds, firstMs, seed) {
  const rate = 22050, n = Math.round(rate * seconds), out = new Float32Array(n);
  let x = seed || 7;
  const rnd = () => { x = (x * 16807) % 2147483647; return x / 2147483647 - 0.5; };
  for (let i = 0; i < n; i++) out[i] = rnd() * 0.02;
  const beat = 60 / bpm * rate;
  for (let b = firstMs / 1000 * rate; b < n; b += beat) {
    for (let j = 0; j < 900 && b + j < n; j++) out[Math.floor(b + j)] += Math.sin(j / 4) * Math.exp(-j / 180) * 0.8;
  }
  return { samples: out, rate };
}

test('120 BPM is found, with its phase', () => {
  const c = clicks(120, 20, 250);
  const r = K.estimateBpm(c.samples, c.rate);
  assert(Math.abs(r.bpm - 120) <= 1, 'bpm ' + r.bpm);
  const phase = ((r.beatAtMs - 250) % 500 + 500) % 500;
  assert(phase <= 30 || phase >= 470, 'phase ' + r.beatAtMs);
  assert(r.confidence >= K.MIN_CONFIDENCE, 'confidence ' + r.confidence);
});

test('128 and 96 BPM are found', () => {
  [128, 96].forEach((bpm) => {
    const c = clicks(bpm, 20, 100, bpm);
    const r = K.estimateBpm(c.samples, c.rate);
    assert(Math.abs(r.bpm - bpm) <= 1.5, bpm + ' → ' + r.bpm);
  });
});

test('noise has no steady tempo, silence and too short a stretch none at all', () => {
  const noise = clicks(120, 20, 0, 3); for (let i = 0; i < noise.samples.length; i++) noise.samples[i] = (Math.sin(i * 12.9898) * 43758.5453 % 1) * 0.5;
  const r = K.estimateBpm(noise.samples, noise.rate);
  assert(r.confidence < K.MIN_CONFIDENCE || r.bpm === 0, 'noise confidence ' + r.confidence);
  assert.strictEqual(K.estimateBpm(new Float32Array(22050 * 10), 22050).bpm, 0);
  assert.strictEqual(K.estimateBpm(new Float32Array(22050 * 3), 22050).bpm, 0);
});

test('rates: close tempos, double and half time, too far apart', () => {
  assert.strictEqual(K.rateFor(124, 120), 1.0333);
  assert.strictEqual(K.rateFor(120, 61), 0.9836);
  assert.strictEqual(K.rateFor(120, 240), 1);
  assert.strictEqual(K.rateFor(120, 100), 0);
  assert.strictEqual(K.rateFor(0, 120), 0);
});

test('a beat-matched blend: whole bars, started on a beat, ends before the title', () => {
  const p = K.plan({ durationMs: 200000, positionMs: 182000, from: { bpm: 120, beatAtMs: 130, confidence: 0.8 }, to: { bpm: 122, beatAtMs: 740, confidence: 0.7 } });
  assert.strictEqual(p.mode, 'beat');
  assert.strictEqual(p.beats, 16);
  assert.strictEqual(p.durationMs, 8000);
  assert.strictEqual((p.startMs - 130) % 500, 0, 'on a beat: ' + p.startMs);
  assert(p.startMs + p.durationMs <= 200000 - K.TAIL_MS);
  assert(p.startMs + p.durationMs > 200000 - K.TAIL_MS - 500, 'not a beat earlier than needed');
  assert.strictEqual(p.toStartMs, Math.round(740 % (60000 / 122)));
  assert.strictEqual(p.rate, K.rateFor(120, 122));
});

test('fewer bars when the title is nearly over; equal power otherwise', () => {
  const near = K.plan({ durationMs: 200000, positionMs: 195000, from: { bpm: 120, beatAtMs: 0, confidence: 0.8 }, to: { bpm: 120, beatAtMs: 0, confidence: 0.8 } });
  assert.strictEqual(near.mode, 'beat'); assert.strictEqual(near.beats, 8);
  const far = K.plan({ durationMs: 200000, positionMs: 180000, from: { bpm: 120, beatAtMs: 0, confidence: 0.8 }, to: { bpm: 100, beatAtMs: 0, confidence: 0.8 } });
  assert.strictEqual(far.mode, 'smooth'); assert.strictEqual(far.durationMs, K.SMOOTH_MS); assert.strictEqual(far.rate, 1);
  const unsure = K.plan({ durationMs: 200000, positionMs: 180000, from: { bpm: 120, beatAtMs: 0, confidence: 0.1 }, to: { bpm: 120, beatAtMs: 0, confidence: 0.9 } });
  assert.strictEqual(unsure.mode, 'smooth');
  const none = K.plan({ durationMs: 200000, positionMs: 197000, from: null, to: null });
  assert.strictEqual(none.mode, 'smooth'); assert.strictEqual(none.startMs, 197000); assert.strictEqual(none.durationMs, 2700);
});

test('equal-power gains keep the level and run the right way', () => {
  for (let k = 0; k <= 1; k += 0.05) { const g = K.gainsAt(k); assert(Math.abs(g.from * g.from + g.to * g.to - 1) < 1e-9); }
  assert.deepStrictEqual(K.gainsAt(0), { from: 1, to: 0 });
  const out = K.curve('from', 16), inc = K.curve('to', 16);
  assert.strictEqual(out.length, 16); assert(Math.abs(out[0] - 1) < 1e-6 && Math.abs(out[15]) < 1e-6);
  assert(Math.abs(inc[0]) < 1e-6 && Math.abs(inc[15] - 1) < 1e-6);
  for (let i = 1; i < 16; i++) { assert(out[i] <= out[i - 1]); assert(inc[i] >= inc[i - 1]); }
});

test('the basses swap at the middle of a beat-matched blend only', () => {
  assert.deepStrictEqual(K.bassAt(0.2, 'beat', 0.1), { from: 0, to: K.BASS_CUT_DB });
  assert.deepStrictEqual(K.bassAt(0.8, 'beat', 0.1), { from: K.BASS_CUT_DB, to: 0 });
  const mid = K.bassAt(0.5, 'beat', 0.1); assert(Math.abs(mid.from - K.BASS_CUT_DB / 2) < 1e-9);
  assert.deepStrictEqual(K.bassAt(0.8, 'smooth'), { from: 0, to: 0 });
});

if (failures) { console.log(failures + ' failed'); process.exit(1); }
console.log('all passed');
