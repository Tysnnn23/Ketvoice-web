/* Ketmix demo, the part that plays and draws. The two loops are rendered once from their notes (js/ketmix/mix.js)
   in an OfflineAudioContext, then played on two decks in Web Audio: each deck is a looping buffer → low shelf
   (the bass) → high-pass → low-pass → gain, the outgoing one also into an echo. The automation of the chosen
   preset is written on those parameters; the incoming deck's playbackRate brings it to the outgoing tempo.
   The timeline is drawn like the app's editor (KetmixTimeline.kt): the outgoing wave above, the incoming below,
   the transition box over both (dragged, or moved with the arrow keys), volume solid, bass dashed, filter dotted.
   Mounted on every [data-ketmix-demo]; the page's lang picks French or English. */
(function () {
  'use strict';
  var M = window.KetmixMix;
  if (!M) return;
  var AC = window.AudioContext || window.webkitAudioContext;
  var OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  var reduce = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  var TEXT = {
    fr: {
      presets: { auto: 'Auto', beatmatch: 'Calé sur le tempo', echo: 'Écho', filter: 'Filtres', crossfade: 'Fondu' },
      play: 'Écouter', stop: 'Arrêter', withMix: 'Avec mix', withoutMix: 'Sans mix', compare: 'Comparer',
      presetsLabel: 'Préréglages', loading: 'Préparation des boucles…', noAudio: 'Ce navigateur ne peut pas jouer la démo.',
      legend: ['Volume', 'Basses', 'Filtre'], out: 'Sortant', into: 'Entrant',
      box: 'Transition', boxText: function (s, l) { return 'Commence à la mesure ' + s + ', dure ' + l + (l > 1 ? ' mesures' : ' mesure'); },
      hint: 'Glissez la transition, ou flèches gauche et droite ; Maj + flèches change sa durée.',
      auto: function (k) { return 'Auto a choisi « ' + TEXT.fr.presets[k] + ' » : 124 et 116 BPM sont à 7 % l’un de l’autre. '; },
      kinds: {
        beatmatch: function (r) { return 'Les deux sur le même temps : la seconde boucle joue ×' + r + ' et les basses changent de main au temps du milieu.'; },
        crossfade: function () { return 'L’une baisse pendant que l’autre monte, chacune à son tempo.'; },
        filter: function (r) { return 'La première s’amincit par le bas, la seconde s’ouvre par le haut, calée à ×' + r + '.'; },
        echo: function () { return 'La première s’arrête sur la mesure et résonne en écho ; la seconde part sur ce temps.'; },
        none: function () { return 'Sans mix : la première boucle s’arrête, un court silence, puis la seconde.'; }
      },
      bpm: 'BPM'
    },
    en: {
      presets: { auto: 'Auto', beatmatch: 'On the beat', echo: 'Echo', filter: 'Filters', crossfade: 'Fade' },
      play: 'Play', stop: 'Stop', withMix: 'With mix', withoutMix: 'Without mix', compare: 'Compare',
      presetsLabel: 'Presets', loading: 'Preparing the loops…', noAudio: 'This browser cannot play the demo.',
      legend: ['Volume', 'Bass', 'Filter'], out: 'Outgoing', into: 'Incoming',
      box: 'Transition', boxText: function (s, l) { return 'Starts at bar ' + s + ', lasts ' + l + (l > 1 ? ' bars' : ' bar'); },
      hint: 'Drag the transition, or use the left and right arrows; Shift + arrows changes its length.',
      auto: function (k) { return 'Auto picked “' + TEXT.en.presets[k] + '”: 124 and 116 BPM are 7% apart. '; },
      kinds: {
        beatmatch: function (r) { return 'Both on the same beat: the second loop plays at ×' + r + ' and the bass changes hands on the middle beat.'; },
        crossfade: function () { return 'One fades down while the other comes up, each at its own tempo.'; },
        filter: function (r) { return 'The first thins out from the bass up, the second opens from the top, in time at ×' + r + '.'; },
        echo: function () { return 'The first stops on the bar and rings out in an echo; the second starts on that beat.'; },
        none: function () { return 'Without mix: the first loop stops, a short silence, then the second one.'; }
      },
      bpm: 'BPM'
    }
  };

  /* ---------- rendering the loops ---------- */
  var rendered = null;
  function noise(ctx) {
    var b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), d = b.getChannelData(0), s = 22222;
    for (var i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = s / 1073741823.5 - 1; }
    return b;
  }
  function env(g, t, peak, attack, hold, release) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.setValueAtTime(peak, t + attack + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
  }
  function renderLoop(loop) {
    var rate = 44100, len = Math.round(M.loopSec(loop) * rate);
    var ctx = new OAC(1, len, rate), out = ctx.createDynamicsCompressor(), nb = noise(ctx);
    out.threshold.value = -14; out.ratio.value = 3; out.connect(ctx.destination);
    var pad = loop.chordStyle === 'pad';
    M.score(loop).forEach(function (e) {
      var t = e.t, g = ctx.createGain(), end;
      g.connect(out);
      if (e.kind === 'kick') {
        var o = ctx.createOscillator();
        o.frequency.setValueAtTime(pad ? 120 : 150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
        env(g, t, 0.9, 0.002, 0.02, 0.32); o.connect(g); o.start(t); o.stop(t + 0.4);
      } else if (e.kind === 'bass') {
        var b = ctx.createOscillator(), f = ctx.createBiquadFilter();
        b.type = pad ? 'triangle' : 'sawtooth'; b.frequency.value = e.hz;
        f.type = 'lowpass'; f.frequency.value = pad ? 420 : 600; f.Q.value = pad ? 1 : 6;
        env(g, t, pad ? 0.5 : 0.32, 0.006, Math.max(0.02, e.dur - 0.08), 0.06);
        b.connect(f); f.connect(g); b.start(t); b.stop(t + e.dur + 0.1);
      } else if (e.kind === 'chord') {
        var lp = ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = pad ? 1400 : 2400; lp.connect(g);
        var dur = Math.min(e.dur, M.loopSec(loop) - t) - 0.05;
        if (pad) env(g, t, 0.05, 0.35, Math.max(0.05, dur - 0.75), 0.35);
        else env(g, t, 0.075, 0.004, 0.02, Math.max(0.05, dur - 0.03));
        e.hz.forEach(function (hz) {
          [-7, 7].forEach(function (cents) {
            var c = ctx.createOscillator();
            c.type = pad ? 'triangle' : 'sawtooth'; c.frequency.value = hz; c.detune.value = cents;
            c.connect(lp); c.start(t); c.stop(t + dur + 0.05);
          });
        });
      } else {
        var n = ctx.createBufferSource(), nf = ctx.createBiquadFilter();
        n.buffer = nb; n.loopStart = 0; n.loop = true;
        var conf = { clap: ['bandpass', 1500, 0.8, 0.45, 0.17], hat: ['highpass', 7000, 0.7, pad ? 0.1 : 0.16, 0.045], shaker: ['bandpass', 9000, 1, 0.05, 0.03] }[e.kind];
        nf.type = conf[0]; nf.frequency.value = conf[1]; nf.Q.value = conf[2];
        env(g, t, conf[3], 0.001, 0.005, conf[4]);
        n.connect(nf); nf.connect(g); end = t + conf[4] + 0.05; n.start(t, (t * 7.3) % 0.9); n.stop(end);
      }
    });
    return ctx.startRendering ? new Promise(function (res, rej) {
      var p = ctx.startRendering();
      if (p && p.then) p.then(res, rej); else ctx.oncomplete = function (ev) { res(ev.renderedBuffer); };
    }) : Promise.reject(new Error('no rendering'));
  }
  /** Peaks every 10 ms, normalised: what the waves are drawn from. */
  function peaks(buffer) {
    var d = buffer.getChannelData(0), step = Math.round(buffer.sampleRate / 100), out = new Float32Array(Math.ceil(d.length / step)), max = 0;
    for (var i = 0; i < out.length; i++) {
      var m = 0;
      for (var j = i * step, e = Math.min(d.length, j + step); j < e; j++) { var a = d[j] < 0 ? -d[j] : d[j]; if (a > m) m = a; }
      out[i] = m; if (m > max) max = m;
    }
    for (var k = 0; k < out.length; k++) out[k] = Math.sqrt(out[k] / (max || 1));
    return out;
  }
  function prepare() {
    if (rendered) return rendered;
    if (!OAC) return (rendered = Promise.reject(new Error('no web audio')));
    rendered = Promise.all([renderLoop(M.LOOPS.out), renderLoop(M.LOOPS.into)]).then(function (b) {
      return { out: b[0], into: b[1], peaks: { out: peaks(b[0]), into: peaks(b[1]) } };
    });
    return rendered;
  }

  /* ---------- one demo ---------- */
  function mount(root) {
    var lang = (document.documentElement.lang || 'en').slice(0, 2) === 'fr' ? 'fr' : 'en';
    var T = TEXT[lang];
    var state = { preset: 'auto', startBar: 6, lengthBars: 4, mix: true };
    var p = M.plan(state), audio = null, live = null, frame = 0, layer = null;

    function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
    function deckLine(loop, cls, role) {
      var row = el('p', 'kx-deck ' + cls);
      row.appendChild(el('span', 'kx-role', role));
      row.appendChild(el('strong', null, loop.name));
      row.appendChild(el('span', 'kx-meta', loop.bpm + ' ' + T.bpm + ', ' + loop.key[lang]));
      return row;
    }
    var panel = el('div', 'kx-panel');
    var stage = el('div', 'kx-stage'), canvas = el('canvas', 'kx-canvas'), box = el('div', 'kx-box');
    canvas.setAttribute('aria-hidden', 'true');
    box.tabIndex = 0; box.setAttribute('role', 'slider'); box.setAttribute('aria-label', T.box);
    box.setAttribute('aria-valuemin', M.LIMITS.startMin + 1); box.setAttribute('aria-valuemax', M.LIMITS.startMax + 1);
    var gripS = el('span', 'kx-grip kx-grip-s'), gripE = el('span', 'kx-grip kx-grip-e');
    box.appendChild(gripS); box.appendChild(gripE);
    stage.appendChild(canvas); stage.appendChild(box);
    var legend = el('ul', 'kx-legend');
    ['vol', 'bass', 'filter'].forEach(function (k, i) { var li = el('li', 'kx-l-' + k); li.appendChild(el('i')); li.appendChild(document.createTextNode(T.legend[i])); legend.appendChild(li); });
    var controls = el('div', 'kx-controls');
    var play = el('button', 'kx-play'); play.type = 'button';
    var ab = el('div', 'kx-ab'); ab.setAttribute('role', 'group'); ab.setAttribute('aria-label', T.compare);
    var withBtn = el('button', null, T.withMix), withoutBtn = el('button', null, T.withoutMix);
    withBtn.type = withoutBtn.type = 'button';
    ab.appendChild(withBtn); ab.appendChild(withoutBtn);
    controls.appendChild(play); controls.appendChild(ab);
    var presets = el('div', 'kx-presets'); presets.setAttribute('role', 'radiogroup'); presets.setAttribute('aria-label', T.presetsLabel);
    var presetBtns = M.PRESETS.map(function (id) {
      var b = el('button', 'kx-chip', T.presets[id]); b.type = 'button'; b.setAttribute('role', 'radio'); b.dataset.preset = id;
      presets.appendChild(b); return b;
    });
    var status = el('p', 'kx-status'); status.setAttribute('aria-live', 'polite');
    var hint = el('p', 'kx-hint', T.hint); hint.id = 'kx-hint-' + Math.random().toString(36).slice(2, 8);
    box.setAttribute('aria-describedby', hint.id);
    panel.appendChild(deckLine(M.LOOPS.out, 'kx-deck-out', T.out));
    panel.appendChild(stage);
    panel.appendChild(deckLine(M.LOOPS.into, 'kx-deck-in', T.into));
    panel.appendChild(legend);
    panel.appendChild(controls);
    panel.appendChild(presets);
    panel.appendChild(status);
    panel.appendChild(hint);
    var slot = root.querySelector('[data-ketmix-slot]') || root;
    slot.innerHTML = '';
    slot.appendChild(panel);
    root.classList.add('kx-ready');

    function sync() {
      p = M.plan(state);
      play.innerHTML = live
        ? '<svg aria-hidden="true" viewBox="0 0 16 16"><rect x="3.5" y="3.5" width="9" height="9" rx="1.5"/></svg>' + T.stop
        : '<svg aria-hidden="true" viewBox="0 0 16 16"><path d="M4.5 2.8v10.4a.8.8 0 0 0 1.2.7l8.3-5.2a.8.8 0 0 0 0-1.4L5.7 2.1a.8.8 0 0 0-1.2.7z"/></svg>' + T.play;
      play.setAttribute('aria-pressed', live ? 'true' : 'false');
      withBtn.setAttribute('aria-pressed', state.mix ? 'true' : 'false');
      withoutBtn.setAttribute('aria-pressed', state.mix ? 'false' : 'true');
      presetBtns.forEach(function (b) {
        var on = b.dataset.preset === state.preset;
        b.setAttribute('aria-checked', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; b.disabled = !state.mix;
      });
      var r = p.ratio.toFixed(2).replace('.', lang === 'fr' ? ',' : '.');
      var kind = state.mix ? M.resolve(state.preset) : 'none';
      status.textContent = (state.mix && state.preset === 'auto' ? T.auto(kind) : '') + T.kinds[kind](r);
      var sized = p.kind !== 'echo' && p.kind !== 'none';
      box.hidden = p.kind === 'none';
      box.classList.toggle('kx-fixed', !sized);
      box.style.left = (p.start / p.windowEnd * 100) + '%';
      box.style.width = ((p.end - p.start) / p.windowEnd * 100) + '%';
      box.setAttribute('aria-valuenow', p.startBar + 1);
      box.setAttribute('aria-valuetext', T.boxText(p.startBar + 1, p.lengthBars));
      draw();
    }

    /* ----- drawing ----- */
    var waves = null;
    function ink() {
      var cs = getComputedStyle(root);
      var v = function (n) { return cs.getPropertyValue(n).trim() || '#888'; };
      return { wave: v('--kx-wave'), vol: v('--kx-vol'), bass: v('--kx-bass'), filter: v('--kx-filter'), box: v('--kx-box'), grid: v('--kx-grid'), text: v('--kx-text') };
    }
    function size() {
      var w = stage.clientWidth, h = stage.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      }
      return { w: w, h: h, dpr: dpr };
    }
    function peakAt(arr, from, to, loopLen) {
      if (!arr) return 0;
      var a = Math.floor(((from % loopLen) + loopLen) % loopLen * 100), n = Math.max(1, Math.round((to - from) * 100)), m = 0;
      for (var i = 0; i < n; i++) { var v = arr[(a + i) % arr.length]; if (v > m) m = v; }
      return m;
    }
    function draw() {
      var s = size(), w = s.w, h = s.h;
      if (!w || !h) return;
      if (!layer) layer = document.createElement('canvas');
      layer.width = canvas.width; layer.height = canvas.height;
      var g = layer.getContext('2d'), c = ink(), T0 = p.windowEnd, half = h / 2, ruler = 18;
      g.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      var X = function (t) { return t / T0 * w; };
      var lanes = [{ top: ruler, bottom: half - 2 }, { top: half + 2, bottom: h - 4 }];
      // the line between the two titles
      g.globalAlpha = 0.14; g.fillStyle = c.wave; g.fillRect(0, half, w, 1); g.globalAlpha = 1;
      // the box under everything
      if (p.kind !== 'none') {
        var x0 = X(p.start), x1 = Math.max(x0 + 3, X(p.end));
        g.globalAlpha = 0.12; g.fillStyle = c.box; roundRect(g, x0, 3, x1 - x0, h - 6, 12); g.fill(); g.globalAlpha = 1;
      }
      // beat grid on the outgoing clock, bars numbered
      var narrow = w < 560;
      g.font = '500 11px ' + (getComputedStyle(root).getPropertyValue('--kx-font').trim() || 'system-ui');
      g.textBaseline = 'top';
      for (var bt = 0, n = 0; bt <= T0 + 0.001; bt += p.beat, n++) {
        var x = Math.round(X(bt)) + 0.5, isBar = n % 4 === 0;
        g.globalAlpha = isBar ? 0.28 : 0.1; g.fillStyle = c.grid;
        g.fillRect(x, isBar ? ruler - 4 : ruler + 4, 1, (isBar ? half - ruler + 4 : half - ruler - 8));
        if (isBar && n / 4 < M.WINDOW_BARS && (!narrow || (n / 4) % 2 === 0)) { g.globalAlpha = 0.75; g.fillStyle = c.text; g.fillText(String(n / 4 + 1), x + 3, 2); }
      }
      // beats of the incoming loop, on its own clock
      var inBeat = M.beatSec(M.LOOPS.into.bpm), pos = 0, k = 0;
      for (var t = p.inStart; t <= T0; t += 0.01) {
        pos += M.valueAt(p.into.rate, t) * 0.01;
        var beatNo = Math.floor(pos / inBeat + 1e-6);
        if (beatNo !== k || t === p.inStart) {
          k = beatNo; var bx = Math.round(X(t)) + 0.5, bar = beatNo % 4 === 0;
          g.globalAlpha = bar ? 0.28 : 0.1; g.fillStyle = c.grid; g.fillRect(bx, half + 6, 1, h - half - 10);
        }
      }
      g.globalAlpha = 1;
      // waves: heard strong, the rest faint
      var colW = narrow ? 3 : 4, outLen = M.loopSec(M.LOOPS.out), inLen = M.loopSec(M.LOOPS.into);
      var mids = [(lanes[0].top + lanes[0].bottom) / 2, (lanes[1].top + lanes[1].bottom) / 2];
      var amp = [(lanes[0].bottom - lanes[0].top) / 2 - 3, (lanes[1].bottom - lanes[1].top) / 2 - 3];
      g.lineCap = 'round'; g.lineWidth = narrow ? 2 : 2.2; g.strokeStyle = c.wave;
      var ip = 0, last = p.inStart;
      for (var cx = colW / 2; cx < w; cx += colW) {
        var ta = cx / w * T0, tb = (cx + colW) / w * T0;
        var heardOut = M.curvesAt(p.out, ta).volume > 0.02 && (ta < p.outStop || p.kind === 'echo' && ta < p.end);
        var r0 = Math.max(1, peakAt(waves && waves.out, ta, tb, outLen) * amp[0]);
        g.globalAlpha = heardOut ? 0.5 : 0.13;
        g.beginPath(); g.moveTo(cx, mids[0] - r0); g.lineTo(cx, mids[0] + r0); g.stroke();
        if (tb > p.inStart) {
          while (last < ta) { var d = Math.min(0.02, ta - last); ip += M.valueAt(p.into.rate, last + d / 2) * d; last += d; }
          var heardIn = M.curvesAt(p.into, ta).volume > 0.02;
          var r1 = Math.max(1, peakAt(waves && waves.into, Math.max(0, ip), Math.max(0, ip) + (tb - ta), inLen) * amp[1]);
          g.globalAlpha = heardIn ? 0.5 : 0.13;
          g.beginPath(); g.moveTo(cx, mids[1] - r1); g.lineTo(cx, mids[1] + r1); g.stroke();
        }
      }
      g.globalAlpha = 1;
      // the box's rim and grips over the waves
      if (p.kind !== 'none') {
        var bx0 = X(p.start), bx1 = Math.max(bx0 + 3, X(p.end));
        g.strokeStyle = c.box; g.lineWidth = 1.5; g.globalAlpha = 0.9; roundRect(g, bx0, 3, bx1 - bx0, h - 6, 12); g.stroke(); g.globalAlpha = 1;
        if (p.kind !== 'echo') {
          g.lineWidth = 4; g.lineCap = 'round';
          [bx0, bx1].forEach(function (gx) { g.beginPath(); g.moveTo(gx, half - 13); g.lineTo(gx, half + 13); g.stroke(); });
        }
        // the curves, from a beat before to a beat after
        [[p.out, lanes[0]], [p.into, lanes[1]]].forEach(function (pair) {
          var dk = pair[0], ln = pair[1], pad = 6;
          var y = function (v) { return ln.top + pad + (1 - v) * (ln.bottom - ln.top - pad * 2); };
          [['filter', c.filter, [1, 4], 2], ['bass', c.bass, [7, 4], 2], ['volume', c.vol, [], 2.5]].forEach(function (cv) {
            g.beginPath(); g.setLineDash(cv[2]); g.strokeStyle = cv[1]; g.lineWidth = cv[3]; g.lineCap = 'round';
            var a = Math.max(0, p.start - p.beat), b = Math.min(T0, p.end + p.beat), steps = Math.max(24, Math.round((X(b) - X(a)) / 2));
            for (var i = 0; i <= steps; i++) {
              var tt = a + (b - a) * i / steps, v = M.curvesAt(dk, tt)[cv[0]];
              if (dk === p.into && tt < p.inStart) v = cv[0] === 'volume' ? 0 : v;
              if (i) g.lineTo(X(tt), y(v)); else g.moveTo(X(tt), y(v));
            }
            g.stroke();
          });
          g.setLineDash([]);
        });
      } else {
        // « Sans mix »: where the first stops and the second starts
        g.strokeStyle = c.text; g.lineWidth = 1.5; g.setLineDash([4, 4]);
        g.beginPath(); g.moveTo(X(p.end), 0); g.lineTo(X(p.end), half); g.moveTo(X(p.inStart), half); g.lineTo(X(p.inStart), h); g.stroke();
        g.setLineDash([]);
      }
      blit();
    }
    function roundRect(g, x, y, w, h, r) {
      r = Math.min(r, w / 2, h / 2);
      g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
      g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
    }
    function blit() {
      var g = canvas.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, canvas.width, canvas.height);
      if (layer) g.drawImage(layer, 0, 0);
      if (!live) return;
      var t = audio.currentTime - live.base, s = size(), x = t / p.windowEnd * s.w, c = ink();
      g.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      g.fillStyle = c.vol; g.fillRect(x - 1, 0, 2, s.h);
      g.beginPath(); g.arc(x, 4, 4.5, 0, Math.PI * 2); g.fill();
    }

    /* ----- playing ----- */
    function schedule(param, points, from, base) {
      var pts = M.pointsFrom(points, from);
      param.cancelScheduledValues(0);
      param.setValueAtTime(pts[0][1], base + from);
      for (var i = 1; i < pts.length; i++) {
        var at = base + pts[i][0];
        if (pts[i][0] === pts[i - 1][0]) param.setValueAtTime(pts[i][1], at);
        else param.linearRampToValueAtTime(pts[i][1], at);
      }
    }
    function chain(buf, d, from, base, start, offset, echo) {
      var src = audio.createBufferSource(), shelf = audio.createBiquadFilter(), hp = audio.createBiquadFilter(), lp = audio.createBiquadFilter(), gain = audio.createGain();
      src.buffer = buf; src.loop = true;
      shelf.type = 'lowshelf'; shelf.frequency.value = 180;
      hp.type = 'highpass'; hp.Q.value = 0.7; lp.type = 'lowpass'; lp.Q.value = 0.7;
      src.connect(shelf); shelf.connect(hp); hp.connect(lp); lp.connect(gain); gain.connect(live.master);
      schedule(shelf.gain, d.shelf, from, base); schedule(hp.frequency, d.hp, from, base); schedule(lp.frequency, d.lp, from, base);
      schedule(gain.gain, d.gain, from, base); schedule(src.playbackRate, d.rate, from, base);
      var nodes = [src, shelf, hp, lp, gain];
      if (echo) {
        var send = audio.createGain(), delay = audio.createDelay(2), fb = audio.createGain(), wet = audio.createGain();
        delay.delayTime.value = p.echoDelay; fb.gain.value = p.echoFeedback; wet.gain.value = 0.8;
        lp.connect(send); send.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(live.master);
        schedule(send.gain, d.echo, from, base);
        nodes.push(send, delay, fb, wet);
      }
      src.start(base + start, offset % buf.duration);
      live.nodes = live.nodes.concat(nodes);
      live.sources.push(src);
    }
    function start(from) {
      if (!audio) audio = new AC();
      if (audio.state === 'suspended') audio.resume();
      prepare().then(function (r) {
        halt(true);
        var base = audio.currentTime + 0.06 - from;
        var master = audio.createGain(), comp = audio.createDynamicsCompressor();
        master.gain.value = 0.8; master.connect(comp); comp.connect(audio.destination);
        live = { base: base, master: master, comp: comp, nodes: [], sources: [] };
        if (from < p.outStop + 0.2) chain(r.out, p.out, from, base, from, from, p.kind === 'echo');
        var inFrom = Math.max(from, p.inStart);
        chain(r.into, p.into, from, base, inFrom, Math.max(0, M.inPos(p, inFrom)), false);
        live.until = p.playUntil;
        master.gain.setValueAtTime(0.8, base + p.playUntil - 0.3);
        master.gain.linearRampToValueAtTime(0, base + p.playUntil);
        sync(); tick();
      }, function () { status.textContent = T.noAudio; });
    }
    function halt(quiet) {
      if (!live) return;
      var l = live; live = null;
      try { l.master.gain.cancelScheduledValues(0); l.master.gain.setTargetAtTime(0, audio.currentTime, 0.015); } catch (e) { /* closed */ }
      setTimeout(function () {
        l.sources.forEach(function (s) { try { s.stop(); } catch (e) { /* already */ } });
        l.nodes.concat([l.master, l.comp]).forEach(function (n) { try { n.disconnect(); } catch (e) { /* gone */ } });
      }, 80);
      clearTimeout(frame); cancelAnimationFrame(frame);
      if (!quiet) { sync(); blit(); }
    }
    function tick() {
      if (!live) return;
      if (audio.currentTime - live.base >= live.until) { halt(); return; }
      blit();
      frame = reduce.matches ? setTimeout(tick, 250) : requestAnimationFrame(tick);
    }
    /** A change while playing carries on from where the music is. */
    function changed() {
      var at = live ? audio.currentTime - live.base : null;
      sync();
      if (at != null) start(Math.min(Math.max(at, 0), p.playUntil - 0.5));
    }

    play.addEventListener('click', function () { if (live) halt(); else start(p.playFrom); });
    withBtn.addEventListener('click', function () { if (!state.mix) { state.mix = true; changed(); } });
    withoutBtn.addEventListener('click', function () { if (state.mix) { state.mix = false; changed(); } });
    presetBtns.forEach(function (b, i) {
      b.addEventListener('click', function () { state.preset = b.dataset.preset; changed(); });
      b.addEventListener('keydown', function (e) {
        var dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (!dir) return;
        e.preventDefault();
        var nb = presetBtns[(i + dir + presetBtns.length) % presetBtns.length];
        state.preset = nb.dataset.preset; changed(); nb.focus();
      });
    });
    function setBox(startBar, lengthBars) {
      var b = M.clampBox(startBar, lengthBars, p.kind);
      if (b.startBar === p.startBar && b.lengthBars === p.lengthBars) return;
      state.startBar = b.startBar; state.lengthBars = b.lengthBars; changed();
    }
    box.addEventListener('keydown', function (e) {
      var dir = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0;
      if (e.key === 'Home') { e.preventDefault(); setBox(M.LIMITS.startMin, state.lengthBars); return; }
      if (e.key === 'End') { e.preventDefault(); setBox(M.LIMITS.startMax, state.lengthBars); return; }
      if (!dir) return;
      e.preventDefault();
      if (e.shiftKey) setBox(state.startBar, state.lengthBars + dir); else setBox(state.startBar + dir, state.lengthBars);
    });
    var drag = null;
    box.addEventListener('pointerdown', function (e) {
      if (e.button) return;
      var grip = e.target === gripS ? 's' : e.target === gripE ? 'e' : 'box';
      if (box.classList.contains('kx-fixed')) grip = 'box';
      drag = { x: e.clientX, grip: grip, start: state.startBar, len: state.lengthBars, barPx: stage.clientWidth / M.WINDOW_BARS };
      box.setPointerCapture(e.pointerId); box.classList.add('kx-dragging');
      e.preventDefault();
    });
    box.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var bars = Math.round((e.clientX - drag.x) / drag.barPx);
      if (drag.grip === 'box') setBox(drag.start + bars, drag.len);
      else if (drag.grip === 'e') setBox(drag.start, drag.len + bars);
      else setBox(drag.start + bars, drag.len - bars);
    });
    function endDrag() { drag = null; box.classList.remove('kx-dragging'); }
    box.addEventListener('pointerup', endDrag);
    box.addEventListener('pointercancel', endDrag);

    if (window.ResizeObserver) new ResizeObserver(function () { draw(); }).observe(stage);
    else window.addEventListener('resize', draw);
    new MutationObserver(function () { draw(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    if (!AC || !OAC) { play.disabled = true; status.textContent = T.noAudio; }
    sync();
    if (!AC || !OAC) status.textContent = T.noAudio;
    function load() {
      prepare().then(function (r) { waves = r.peaks; draw(); }, function () { play.disabled = true; status.textContent = T.noAudio; });
    }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (en) { if (en.some(function (x) { return x.isIntersecting; })) { io.disconnect(); load(); } }, { rootMargin: '400px' });
      io.observe(root);
    } else load();
    document.addEventListener('visibilitychange', function () { if (document.hidden && live) halt(); });
  }

  function init() { Array.prototype.forEach.call(document.querySelectorAll('[data-ketmix-demo]'), mount); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
