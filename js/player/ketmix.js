/* Ketvoice web player — Ketmix, the pure part: how two titles of the queue blend in the browser.
 * A quick tempo estimate from the decoded audio (an onset envelope at 100 frames a second, its
 * autocorrelation over 70–180 BPM, then the beat's phase), the plan of the blend (whole bars started on a
 * beat of the outgoing title when both tempos are known and within 6 % of each other, an equal-power
 * crossfade otherwise), the equal-power gain curves and the bass swap. The engine (engine.js) applies the
 * plan to two <audio> elements routed through Web Audio. window.KVKetmix, or require() in Node for the tests. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KVKetmix = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var FPS = 100;
  var MIN_BPM = 70, MAX_BPM = 180;
  /** The longest blend, and the one used when no tempo is known. */
  var MAX_MS = 10000, SMOOTH_MS = 6000;
  /** The blend ends this long before the outgoing title does (its last frames are often silence). */
  var TAIL_MS = 300;
  var MAX_RATE_SHIFT = 0.06;
  var MIN_CONFIDENCE = 0.3;
  /** The bass of the outgoing title goes down by this much at the middle of a beat-matched blend. */
  var BASS_CUT_DB = -14;

  /** The onset strength of [samples] (one channel), 100 values a second: the rise of a log energy. */
  function onsets(samples, sampleRate) {
    var hop = Math.max(1, Math.round(sampleRate / FPS)), n = Math.floor(samples.length / hop);
    var env = new Float32Array(n), out = new Float32Array(n);
    for (var i = 0; i < n; i++) {
      var sum = 0, base = i * hop;
      for (var j = 0; j < hop; j++) { var v = samples[base + j]; sum += v * v; }
      env[i] = Math.log(1 + 1000 * Math.sqrt(sum / hop));
    }
    for (i = 1; i < n; i++) out[i] = Math.max(0, env[i] - env[i - 1]);
    // Minus the local mean (half a second), so a crescendo does not read as a beat.
    var w = 25, acc = 0, mean = new Float32Array(n);
    for (i = 0; i < n; i++) {
      acc += out[i]; if (i - 2 * w - 1 >= 0) acc -= out[i - 2 * w - 1];
      var c = i - w; if (c >= 0) mean[c] = acc / Math.min(i + 1, 2 * w + 1);
    }
    for (i = Math.max(0, n - w); i < n; i++) mean[i] = mean[Math.max(0, n - w - 1)] || 0;
    for (i = 0; i < n; i++) out[i] = Math.max(0, out[i] - mean[i]);
    return out;
  }

  function autocorr(x, lag) {
    var whole = Math.floor(lag), frac = lag - whole, sum = 0;
    for (var i = 0; i + whole + 1 < x.length; i++) sum += x[i] * (x[i + whole] * (1 - frac) + x[i + whole + 1] * frac);
    return sum;
  }

  /**
   * The tempo of a stretch of music: { bpm, beatAtMs (a beat, from the start of [samples]), confidence 0..1 },
   * or bpm 0 when nothing steady was found. Needs 6 s at least.
   */
  function estimateBpm(samples, sampleRate) {
    var none = { bpm: 0, beatAtMs: 0, confidence: 0 };
    if (!samples || !sampleRate || samples.length < sampleRate * 6) return none;
    var o = onsets(samples, sampleRate);
    var zero = autocorr(o, 0);
    if (!(zero > 1e-6)) return none;
    var best = 0, bestScore = -1, total = 0, count = 0;
    for (var bpm = MIN_BPM; bpm <= MAX_BPM; bpm += 0.5) {
      var lag = FPS * 60 / bpm;
      // The beat, its double and its half: a steady pulse scores on all three.
      var score = autocorr(o, lag) + 0.5 * autocorr(o, 2 * lag) + 0.25 * autocorr(o, lag / 2);
      total += score; count++;
      if (score > bestScore) { bestScore = score; best = bpm; }
    }
    // Refine to a tenth of a BPM around the winner.
    for (var b = best - 0.5; b <= best + 0.5; b += 0.1) {
      var l = FPS * 60 / b, sc = autocorr(o, l) + 0.5 * autocorr(o, 2 * l) + 0.25 * autocorr(o, l / 2);
      if (sc > bestScore) { bestScore = sc; best = b; }
    }
    var mean = total / count;
    var confidence = Math.max(0, Math.min(1, (bestScore - mean) / (bestScore + 1e-9) * 1.6));
    // The phase: the offset whose every period lands on the strongest onsets.
    var period = FPS * 60 / best, bestPhase = 0, phaseScore = -1;
    for (var p = 0; p < period; p++) {
      var acc = 0;
      for (var t = p; t < o.length; t += period) acc += o[Math.round(t)] || 0;
      if (acc > phaseScore) { phaseScore = acc; bestPhase = p; }
    }
    return { bpm: Math.round(best * 10) / 10, beatAtMs: Math.round(bestPhase * 1000 / FPS), confidence: Math.round(confidence * 100) / 100 };
  }

  /** The rate that brings [toBpm] to [fromBpm] (a tempo twice or half as fast counts), or 0 when too far apart. */
  function rateFor(fromBpm, toBpm) {
    if (!(fromBpm > 0) || !(toBpm > 0)) return 0;
    var best = 0;
    [toBpm, toBpm * 2, toBpm / 2].forEach(function (b) {
      var r = fromBpm / b;
      if (Math.abs(r - 1) <= MAX_RATE_SHIFT && (!best || Math.abs(r - 1) < Math.abs(best - 1))) best = r;
    });
    return best ? Math.round(best * 10000) / 10000 : 0;
  }

  /**
   * The blend of the title playing ([durationMs], at [positionMs]) into the next one.
   * [from] and [to]: tempo estimates ({ bpm, beatAtMs, confidence }, beatAtMs a position in that title), or null.
   * Returns { mode: 'beat' | 'smooth', startMs (a position in the outgoing title), durationMs, toStartMs (where the
   * next title starts), rate (its playback rate during the blend), beats }.
   */
  function plan(o) {
    var end = o.durationMs - TAIL_MS, pos = o.positionMs || 0;
    var maxMs = o.maxMs || MAX_MS, smoothMs = o.smoothMs || SMOOTH_MS;
    var from = o.from, to = o.to;
    var rate = from && to && from.confidence >= MIN_CONFIDENCE && to.confidence >= MIN_CONFIDENCE ? rateFor(from.bpm, to.bpm) : 0;
    if (rate) {
      var beatMs = 60000 / from.bpm;
      var counts = [32, 16, 8, 4];
      for (var i = 0; i < counts.length; i++) {
        var dur = counts[i] * beatMs;
        if (dur > maxMs) continue;
        var k = Math.floor((end - dur - from.beatAtMs) / beatMs);
        var start = from.beatAtMs + k * beatMs;
        if (start < pos + 200) continue;
        // The next title starts on its first beat: its beats then fall on the outgoing title's.
        var toBeat = 60000 / to.bpm;
        var toStart = ((to.beatAtMs % toBeat) + toBeat) % toBeat;
        return { mode: 'beat', startMs: Math.round(start), durationMs: Math.round(dur), toStartMs: Math.round(toStart), rate: rate, beats: counts[i] };
      }
    }
    var startMs = Math.max(pos, end - smoothMs);
    return { mode: 'smooth', startMs: Math.round(startMs), durationMs: Math.max(0, Math.round(end - startMs)), toStartMs: 0, rate: 1, beats: 0 };
  }

  /** Equal-power gains at [k] (0 → 1) of the blend: the sum of their squares stays 1, so the level holds. */
  function gainsAt(k) {
    k = Math.max(0, Math.min(1, k));
    return { from: Math.cos(k * Math.PI / 2), to: Math.sin(k * Math.PI / 2) };
  }

  /** [n] values of one side's gain over the blend, for AudioParam.setValueCurveAtTime. */
  function curve(side, n) {
    var out = new Float32Array(Math.max(2, n || 64));
    for (var i = 0; i < out.length; i++) out[i] = gainsAt(i / (out.length - 1))[side];
    return out;
  }

  /**
   * The low shelf of each side (dB) at [k]: in a beat-matched blend the basses swap around the middle
   * (over one beat's share [swapK]), so two kick drums never pile up; a smooth blend leaves them alone.
   */
  function bassAt(k, mode, swapK) {
    if (mode !== 'beat') return { from: 0, to: 0 };
    var half = Math.max(0.01, (swapK || 0.1) / 2), x = Math.max(0, Math.min(1, (k - (0.5 - half)) / (2 * half)));
    return { from: (BASS_CUT_DB * x) || 0, to: (BASS_CUT_DB * (1 - x)) || 0 };
  }

  return {
    FPS: FPS, MAX_MS: MAX_MS, SMOOTH_MS: SMOOTH_MS, TAIL_MS: TAIL_MS, BASS_CUT_DB: BASS_CUT_DB, MIN_CONFIDENCE: MIN_CONFIDENCE,
    onsets: onsets, estimateBpm: estimateBpm, rateFor: rateFor, plan: plan, gainsAt: gainsAt, curve: curve, bassAt: bassAt
  };
});
