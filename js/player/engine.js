/* Ketvoice web player — playback. Each title is played the app's way as far as a browser can follow it
 * (KVCatalog.plan): a title published on Ketvoice from its public file, any other title from the Ketvoice
 * API's stream address (its own source id, or its title and artist) in an <audio> element, and YouTube's
 * IFrame player when the title has a video and no audio address answered (the player stays visible: the
 * page places it over the artwork). Two <audio> decks: the next title's address is asked 20 s before the
 * end and loaded in the other deck, so it starts without a gap, with a 2 s crossfade unless the listener
 * chose « Sans fondu » (and where the browser lets a page set the volume: not on iPhone). One queue for
 * both, shuffle (the queue itself is reordered, as in the app), repeat off/all/one, radio (more titles join
 * before the queue runs out) and the Media Session API (lock screen, media keys, seek). window.KVEngine. */
(function () {
  'use strict';

  var YT_STATE = { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 };
  var PRELOAD_BEFORE_MS = 20000;
  var FADE_MS = 2000;
  var RADIO_AHEAD = 3;
  /** Half a second of silence: played once from a gesture so iPhone lets each deck start later on its own. */
  var SILENCE = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

  function createEngine(opts) {
    var core = opts.core, api = opts.api, catalog = opts.catalog, hostId = opts.hostId;
    var decks = [opts.audio, opts.audio2];
    var emit = opts.onChange || function () {};
    var fadeOn = opts.fadeOn || function () { return true; };
    var s = {
      queue: [], index: -1, original: null, shuffle: false, repeat: 'off', playing: false, loading: false,
      positionMs: 0, durationMs: 0, volume: 100, muted: false, source: null, via: null, quality: '', error: null, needsTap: false,
      radio: null
    };
    var yt = null, ytReady = null, ytApi = null, ticking = 0, token = 0, pendingSeek = 0, tapTimer = 0, skipTimer = 0;
    var active = 0, preload = null, fade = null, tried = [], unlocked = false, radioBusy = false;

    try {
      var saved = JSON.parse(localStorage.getItem('kv-player-volume') || 'null');
      if (saved && typeof saved.v === 'number') { s.volume = Math.min(100, Math.max(0, saved.v)); s.muted = !!saved.m; }
    } catch (e) { /* storage blocked */ }

    /** Can the page set an <audio>'s volume here? iPhone keeps it at 1 (the hardware buttons set it). */
    var volumeWorks = (function () { try { var a = document.createElement('audio'); a.volume = 0.5; return Math.abs(a.volume - 0.5) < 0.01; } catch (e) { return false; } })();

    function current() { return s.queue[s.index] || null; }
    function changed(what) { emit(what || 'state', s); }
    function deck() { return decks[active]; }
    function other() { return decks[1 - active]; }
    function playable(t) { return !!(core.playable(t) || window.KVCatalog.canStream(t)); }

    function canPlayFormat(format) {
      var f = String(format || '').toLowerCase();
      var mime = f.indexOf('flac') >= 0 ? 'audio/flac' : f.indexOf('wav') >= 0 ? 'audio/wav' : f.indexOf('opus') >= 0 ? 'audio/ogg; codecs=opus'
        : f.indexOf('aac') >= 0 || f.indexOf('m4a') >= 0 ? 'audio/mp4' : 'audio/mpeg';
      return deck().canPlayType(mime) !== '';
    }

    /** From the first tap or key: each deck plays a silence, after which it may start from a timer or an answer. */
    function unlock() {
      if (unlocked) return;
      unlocked = true;
      decks.forEach(function (el) {
        if (el.getAttribute('src')) return;
        el.muted = true; el.src = SILENCE;
        var p = el.play();
        var done = function () { if (el.getAttribute('src') === SILENCE) { el.pause(); el.removeAttribute('src'); el.load(); } el.muted = s.muted; };
        if (p && p.then) p.then(done, done); else done();
      });
    }
    ['pointerdown', 'keydown', 'touchend'].forEach(function (ev) { document.addEventListener(ev, unlock, { capture: true, passive: true }); });

    // ------------------------------------------------------------ YouTube

    function loadYouTubeApi() {
      if (ytApi) return ytApi;
      ytApi = new Promise(function (resolve, reject) {
        if (window.YT && window.YT.Player) { resolve(window.YT); return; }
        var previous = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = function () { if (previous) previous(); resolve(window.YT); };
        var tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.async = true;
        tag.onerror = function () { ytApi = null; reject(new Error('youtube_api')); };
        document.head.appendChild(tag);
      });
      return ytApi;
    }

    function ensurePlayer(videoId, startS, autoplay) {
      if (ytReady) return ytReady;
      ytReady = loadYouTubeApi().then(function (YT) {
        return new Promise(function (resolve) {
          yt = new YT.Player(hostId, {
            width: '100%', height: '100%', videoId: videoId, host: 'https://www.youtube-nocookie.com',
            playerVars: { playsinline: 1, rel: 0, controls: 1, autoplay: autoplay === false ? 0 : 1, start: Math.floor(startS || 0), origin: location.origin, enablejsapi: 1 },
            events: {
              onReady: function () { applyVolume(); resolve(yt); },
              onStateChange: onYouTubeState,
              onError: onYouTubeError
            }
          });
        });
      });
      ytReady.catch(function () { ytReady = null; });
      return ytReady;
    }

    function onYouTubeState(e) {
      if (s.source !== 'youtube') return;
      var st = e.data;
      if (st === YT_STATE.PLAYING) {
        s.playing = true; s.loading = false; s.needsTap = false; clearTimeout(tapTimer);
        if (pendingSeek) { yt.seekTo(pendingSeek / 1000, true); pendingSeek = 0; }
        var data = yt.getVideoData && yt.getVideoData();
        var t = current();
        if (t && t.bare && data && data.title) { t.title = data.title; t.artist = data.author || ''; delete t.bare; changed('track'); }
      } else if (st === YT_STATE.PAUSED) { s.playing = false; }
      else if (st === YT_STATE.BUFFERING) { s.loading = true; }
      else if (st === YT_STATE.ENDED) { s.playing = false; next(true); return; }
      changed();
      tick();
    }

    function onYouTubeError(e) {
      if (s.source !== 'youtube') return;
      // 2 bad id, 5 HTML5 error, 100 removed or private, 101/150 the owner does not allow embedding.
      failed(e && (e.data === 101 || e.data === 150) ? 'embed_blocked' : 'unavailable');
    }

    function playYouTube(videoId, startMs, autoplay, my) {
      stopAudio(-1);
      s.source = 'youtube'; s.via = 'youtube'; s.quality = '';
      s.loading = autoplay !== false;
      changed('source');
      if (yt && yt.loadVideoById) {
        if (autoplay === false) yt.cueVideoById({ videoId: videoId, startSeconds: (startMs || 0) / 1000 });
        else yt.loadVideoById({ videoId: videoId, startSeconds: (startMs || 0) / 1000 });
      } else {
        ensurePlayer(videoId, (startMs || 0) / 1000, autoplay).then(function (p) {
          if (my !== token) return;
          var made = p.getVideoData && p.getVideoData();
          var at = { videoId: videoId, startSeconds: (startMs || 0) / 1000 };
          // The player was made for an earlier title still loading: this one replaces it.
          if (made && made.video_id && made.video_id !== videoId) { if (autoplay === false) p.cueVideoById(at); else p.loadVideoById(at); }
          else if (autoplay !== false) p.playVideo();
        }).catch(function () { if (my === token) failed('youtube_api', true); });
      }
      if (autoplay !== false) {
        // A browser that refused to start the sound (no gesture) leaves the video waiting: the listener taps it.
        tapTimer = setTimeout(function () {
          if (my === token && !s.playing && s.source === 'youtube' && !s.error) { s.needsTap = true; s.loading = false; changed(); }
        }, 3500);
      }
    }

    function stopYouTube() { if (yt && yt.pauseVideo) { try { yt.pauseVideo(); } catch (e) { /* not ready */ } } }

    // ------------------------------------------------------------ the two <audio> decks

    function isActive(el) { return el === deck() && s.source === 'audio'; }

    decks.forEach(function (el) {
      el.addEventListener('playing', function () { if (isActive(el)) { s.playing = true; s.loading = false; s.needsTap = false; changed(); } });
      el.addEventListener('pause', function () { if (isActive(el) && !fade) { s.playing = false; changed(); } });
      el.addEventListener('waiting', function () { if (isActive(el)) { s.loading = true; changed(); } });
      el.addEventListener('ended', function () { if (isActive(el)) { s.playing = false; next(true); } });
      el.addEventListener('error', function () {
        var src = el.getAttribute('src');
        if (!src || src === SILENCE) return;
        if (preload && preload.el === el && !isActive(el)) { if (catalog) catalog.forget(preload.track.id); preload = null; return; }
        if (!isActive(el)) return;
        // This address failed: the next source of the title's plan, as the app does.
        var t = current();
        if (t && s.via && s.via !== 'upload' && catalog) { catalog.forget(t.id); tried.push(s.via); s.source = null; resolveAndPlay(t, s.positionMs, true, token); return; }
        failed('unavailable');
      });
      el.addEventListener('loadedmetadata', function () {
        if (!isActive(el)) return;
        if (pendingSeek) { el.currentTime = pendingSeek / 1000; pendingSeek = 0; }
        tick();
      });
    });

    /** Stops the decks except [keep] (-1: both). */
    function stopAudio(keep) {
      decks.forEach(function (el, i) {
        if (i === keep || !el.getAttribute('src')) return;
        el.pause(); el.removeAttribute('src'); el.load();
      });
      if (preload && preload.el && preload.el !== decks[keep]) preload = null;
    }

    function startDeck(el, autoplay, my) {
      applyVolume();
      if (autoplay === false) { s.loading = false; changed(); return; }
      var p = el.play();
      if (p && p.catch) p.catch(function (err) {
        if (my !== token || (err && err.name === 'AbortError')) return;
        s.loading = false; s.needsTap = true; changed();
      });
    }

    function playAudio(r, startMs, autoplay, my) {
      stopYouTube();
      cancelFade();
      var el;
      if (preload && preload.el && preload.url === r.url) {
        // Already loaded in the other deck: it becomes the playing one.
        active = 1 - active; el = deck(); preload = null;
        stopAudio(active);
        pendingSeek = 0;
        if (startMs) { if (el.readyState >= 1) el.currentTime = startMs / 1000; else pendingSeek = startMs; }
        else if (el.currentTime > 0.05) el.currentTime = 0;
      } else {
        stopAudio(active);
        el = deck();
        pendingSeek = startMs || 0;
        el.preload = 'auto';
        el.src = r.url;
      }
      s.source = 'audio'; s.via = r.via; s.quality = r.quality || '';
      s.loading = autoplay !== false;
      changed('source');
      startDeck(el, autoplay, my);
    }

    function failed(code, keep) {
      s.error = code; s.playing = false; s.loading = false;
      changed('error');
      clearTimeout(skipTimer);
      if (!keep) skipTimer = setTimeout(function () { if (s.error) next(true); }, 2500);
    }

    // ------------------------------------------------------------ time

    function tick() {
      var pos = 0, dur = 0, el = deck();
      if (s.source === 'youtube' && yt && yt.getCurrentTime) { pos = (yt.getCurrentTime() || 0) * 1000; dur = (yt.getDuration() || 0) * 1000; }
      else if (s.source === 'audio') { pos = (el.currentTime || 0) * 1000; dur = isFinite(el.duration) ? el.duration * 1000 : 0; }
      var t = current();
      if (!dur && t) dur = t.durationMs || 0;
      if (pendingSeek && s.source === 'audio') pos = pendingSeek;
      s.positionMs = pos; s.durationMs = dur;
      emit('time', s);
      updatePosition();
      if (s.playing && dur > 0) {
        var left = dur - pos;
        if (left <= PRELOAD_BEFORE_MS) preloadNext();
        if (left <= FADE_MS + 150 && s.source === 'audio') maybeFade();
      }
      if (s.radio && s.playing) topUpRadio();
    }

    function startTicking() {
      if (ticking) return;
      ticking = setInterval(function () { if (s.playing || s.loading) tick(); }, 250);
    }

    // ------------------------------------------------------------ the next title, ready before the end

    function nextIndex() {
      if (s.repeat === 'one') return -1;
      var i = findPlayable(s.index + 1, 1, false);
      if (i < 0 && s.repeat === 'all') i = findPlayable(0, 1, false);
      return i === s.index ? -1 : i;
    }

    function preloadNext() {
      var i = nextIndex();
      if (i < 0) return;
      var t = s.queue[i];
      if (preload && preload.track === t) return;
      if (preload && preload.pending) return;
      var my = token;
      preload = { track: t, pending: true };
      resolveTrack(t, []).then(function (r) {
        if (my !== token || !preload || preload.track !== t) return;
        if (!r || r.kind !== 'audio' || fade) { preload = { track: t, kind: r ? r.kind : null, videoId: r && r.videoId }; return; }
        var el = other();
        el.pause();
        el.preload = 'auto';
        el.src = r.url;
        el.load();
        preload = { track: t, el: el, url: r.url, via: r.via, quality: r.quality, at: Date.now() };
      }, function () { if (preload && preload.track === t) preload = null; });
    }

    /** The last seconds: the next deck comes in while this one goes, over 2 s (« Sans fondu »: none). */
    function maybeFade() {
      if (fade || !volumeWorks || !fadeOn() || !preload || !preload.el || preload.el.readyState < 3) return;
      var i = nextIndex();
      if (i < 0 || s.queue[i] !== preload.track) return;
      var from = deck(), to = preload.el;
      to.currentTime = 0; to.volume = 0; to.muted = s.muted;
      var p = to.play();
      if (p && p.catch) p.catch(function () { cancelFade(); });
      var t0 = performance.now();
      fade = { from: from, to: to, timer: setInterval(function () {
        var k = Math.min(1, (performance.now() - t0) / FADE_MS);
        var vol = s.muted ? 0 : s.volume / 100;
        to.volume = vol * k; from.volume = vol * (1 - k);
        if (k >= 1) endFade();
      }, 50) };
      // The title that comes in is the current one from now on.
      tried = [];
      active = 1 - active;
      s.index = i; s.via = preload.via; s.quality = preload.quality || ''; s.error = null;
      preload = null;
      updateMetadata();
      changed('track');
    }

    function endFade() {
      if (!fade) return;
      clearInterval(fade.timer);
      var from = fade.from;
      fade = null;
      if (from !== deck()) { from.pause(); from.removeAttribute('src'); from.load(); }
      applyVolume();
    }
    function cancelFade() { if (fade) endFade(); }

    // ------------------------------------------------------------ loading a title

    function resolveTrack(t, skip) {
      if (core.playable(t) === 'upload' && t.streamUrl) return Promise.resolve({ kind: 'audio', url: t.streamUrl, via: 'upload' });
      if (!catalog) {
        var y = core.youtubeId(t);
        if (core.playable(t) === 'upload') return api.resolveUpload(core.uploadId(t)).then(function (r) { return r ? { kind: 'audio', url: r.streamUrl, via: 'upload' } : null; });
        return Promise.resolve(y ? { kind: 'youtube', videoId: y, via: 'youtube' } : null);
      }
      return catalog.resolve(t, { skip: skip, canPlay: canPlayFormat, upload: function (x) {
        return api.resolveUpload(core.uploadId(x)).then(function (r) { if (r) x.streamUrl = r.streamUrl; return r ? { kind: 'audio', url: r.streamUrl, via: 'upload' } : null; });
      } });
    }

    function resolveAndPlay(t, startMs, autoplay, my) {
      s.loading = autoplay !== false;
      changed();
      resolveTrack(t, tried.slice()).then(function (r) {
        if (my !== token) return;
        if (!r) { failed('unavailable'); return; }
        if (r.kind === 'audio') playAudio(r, startMs, autoplay, my);
        else playYouTube(r.videoId, startMs, autoplay, my);
      }, function () { if (my === token) failed('unavailable'); });
    }

    function load(startMs, autoplay) {
      var t = current();
      var my = ++token;
      clearTimeout(skipTimer); clearTimeout(tapTimer);
      cancelFade();
      tried = [];
      s.error = null; s.positionMs = startMs || 0; s.durationMs = (t && t.durationMs) || 0; s.needsTap = false;
      if (!t) { s.source = null; s.via = null; stopAudio(-1); stopYouTube(); s.playing = false; changed('track'); return; }
      updateMetadata();
      changed('track');
      startTicking();
      if (!playable(t)) { s.playing = false; s.loading = false; failed('app_only', true); return; }
      // The next title already loaded in the other deck: it starts at once.
      if (preload && preload.track === t && preload.el && Date.now() - preload.at < window.KVCatalog.STREAM_FRESH_MS) {
        playAudio({ url: preload.url, via: preload.via, quality: preload.quality }, startMs, autoplay, my);
        return;
      }
      if (preload && preload.track === t && preload.kind === 'youtube' && preload.videoId) { var v = preload.videoId; preload = null; playYouTube(v, startMs, autoplay, my); return; }
      // Stay on the current deck's element while the address is asked: a tap already made it allowed to play.
      if (s.source === 'youtube') stopYouTube(); else stopAudio(-1);
      s.source = null; s.via = null;
      resolveAndPlay(t, startMs, autoplay, my);
    }

    /** Plays [tracks] from [index]; titles only the app can play are skipped. */
    function playQueue(tracks, index, startMs) {
      s.queue = tracks.slice(); s.original = null; s.shuffle = false; s.radio = null;
      preload = null;
      s.index = Math.max(0, Math.min(index || 0, s.queue.length - 1));
      if (!playable(current())) { var i = findPlayable(s.index, 1, false); if (i >= 0) s.index = i; }
      load(startMs || 0, true);
    }

    function findPlayable(from, step, wrap) {
      var n = s.queue.length;
      for (var k = 0; k < n; k++) {
        var i = from + step * k;
        if (wrap) i = ((i % n) + n) % n;
        if (i < 0 || i >= n) return -1;
        if (playable(s.queue[i])) return i;
      }
      return -1;
    }

    function play() {
      var t = current();
      if (!t) return;
      if (s.error === 'app_only') return;
      if (s.source === 'youtube' && yt && yt.playVideo) { yt.playVideo(); s.loading = true; changed(); }
      else if (s.source === 'audio' && deck().getAttribute('src')) { var p = deck().play(); if (p && p.catch) p.catch(function () {}); }
      else load(s.positionMs, true);
    }

    function pause() {
      cancelFade();
      if (s.source === 'youtube' && yt && yt.pauseVideo) yt.pauseVideo();
      else if (s.source === 'audio') deck().pause();
      s.playing = false; s.loading = false; changed();
    }

    function toggle() { if (s.playing || s.loading) pause(); else play(); }

    function next(auto) {
      if (!s.queue.length) return;
      if (auto && s.repeat === 'one' && !s.error) { seek(0); play(); return; }
      var i = findPlayable(s.index + 1, 1, false);
      if (i < 0 && s.repeat === 'all') i = findPlayable(0, 1, false);
      if (i < 0) {
        if (auto) { s.playing = false; s.loading = false; s.positionMs = 0; changed(); }
        return;
      }
      s.index = i;
      load(0, true);
    }

    function prev() {
      if (s.positionMs > 3000 && !s.error) { seek(0); return; }
      var i = findPlayable(s.index - 1, -1, false);
      if (i < 0 && s.repeat === 'all') i = findPlayable(s.queue.length - 1, -1, false);
      if (i < 0) { seek(0); return; }
      s.index = i;
      load(0, true);
    }

    function playAt(i) {
      if (i < 0 || i >= s.queue.length) return;
      s.index = i;
      load(0, true);
    }

    function seek(ms) {
      ms = Math.max(0, Math.min(ms, s.durationMs || ms));
      cancelFade();
      if (s.source === 'youtube' && yt && yt.seekTo) yt.seekTo(ms / 1000, true);
      else if (s.source === 'audio') { var el = deck(); if (el.readyState >= 1) el.currentTime = ms / 1000; else pendingSeek = ms; }
      s.positionMs = ms;
      emit('time', s);
      updatePosition();
    }

    function applyVolume() {
      if (yt && yt.setVolume) { yt.setVolume(s.volume); if (s.muted) yt.mute(); else yt.unMute(); }
      if (fade) return;
      decks.forEach(function (el) { el.volume = s.volume / 100; el.muted = s.muted; });
    }

    function setVolume(v) {
      s.volume = Math.min(100, Math.max(0, Math.round(v)));
      if (s.volume > 0) s.muted = false;
      applyVolume(); persistVolume(); changed('volume');
    }

    function toggleMute() { s.muted = !s.muted; applyVolume(); if (fade) { fade.to.muted = s.muted; fade.from.muted = s.muted; } persistVolume(); changed('volume'); }
    function persistVolume() { try { localStorage.setItem('kv-player-volume', JSON.stringify({ v: s.volume, m: s.muted })); } catch (e) { /* storage blocked */ } }

    /** Shuffle reorders the queue (the title playing stays and comes first); off puts the order back. */
    function toggleShuffle() {
      var t = current();
      if (!s.shuffle) {
        s.original = s.queue.slice();
        var rest = s.queue.filter(function (_, i) { return i !== s.index; });
        for (var i = rest.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = rest[i]; rest[i] = rest[j]; rest[j] = x; }
        s.queue = t ? [t].concat(rest) : rest;
        s.index = t ? 0 : -1;
        s.shuffle = true;
      } else {
        if (s.original) { s.queue = s.original; s.index = t ? Math.max(0, s.queue.indexOf(t)) : -1; }
        s.original = null; s.shuffle = false;
      }
      dropPreload();
      changed('queue');
    }

    function dropPreload() {
      if (preload && preload.el && !fade) { preload.el.pause(); preload.el.removeAttribute('src'); preload.el.load(); }
      if (!fade) preload = null;
    }

    function cycleRepeat() {
      s.repeat = s.repeat === 'off' ? 'all' : s.repeat === 'all' ? 'one' : 'off';
      dropPreload();
      changed();
    }

    // ------------------------------------------------------------ radio (the app's « radio » / up next)

    function videoFor(t) {
      var v = window.KVCatalog.youtubeOf(t) || (t.alts || []).map(window.KVCatalog.youtubeOf).find(Boolean);
      return v ? Promise.resolve(v) : catalog && catalog.catalogOn ? catalog.matchVideo(t) : Promise.resolve(null);
    }

    function radioFrom(t, known) {
      return videoFor(t).then(function (v) { return v ? catalog.radio(v) : null; }).then(function (rows) {
        return (rows || []).filter(function (r) { return !known.has(r.id) && !known.has(r.videoId); });
      });
    }

    function keysOf(list) {
      var set = new Set();
      list.forEach(function (x) { set.add(x.id); var v = window.KVCatalog.youtubeOf(x); if (v) set.add(v); });
      return set;
    }

    /**
     * A radio from [seed]: the seed plays (or keeps playing) and YouTube Music's radio of it follows; more joins
     * before the queue runs out. Resolves false when the catalogue has none.
     */
    function startRadio(seed) {
      if (!catalog || !catalog.catalogOn || !seed) return Promise.resolve(false);
      var playingSeed = current() === seed;
      return radioFrom(seed, keysOf([seed])).then(function (rows) {
        if (!rows.length) return false;
        if (playingSeed && current() === seed) {
          s.queue = [seed].concat(rows); s.index = 0; s.original = null; s.shuffle = false;
          dropPreload();
          s.radio = { seed: seed.id, title: seed.title };
          changed('queue');
        } else {
          playQueue([seed].concat(rows), 0, 0);
          s.radio = { seed: seed.id, title: seed.title };
          changed('queue');
        }
        return true;
      }, function () { return false; });
    }

    function topUpRadio() {
      if (radioBusy || !s.radio || s.queue.length - 1 - s.index > RADIO_AHEAD) return;
      var from = current();
      if (!from) return;
      radioBusy = true;
      var radio = s.radio;
      radioFrom(s.queue[s.queue.length - 1] || from, keysOf(s.queue)).then(function (rows) {
        if (s.radio === radio && rows.length) { s.queue = s.queue.concat(rows.slice(0, 25)); if (s.original) s.original = s.original.concat(rows.slice(0, 25)); changed('queue'); }
      }).then(function () { radioBusy = false; }, function () { radioBusy = false; });
    }

    // ------------------------------------------------------------ Media Session (lock screen, background)

    var ms = 'mediaSession' in navigator ? navigator.mediaSession : null;
    function artwork(t) {
      var url = t.coverUrl || (core.youtubeId(t) ? 'https://i.ytimg.com/vi/' + core.youtubeId(t) + '/hqdefault.jpg' : '');
      if (!url) return [{ src: '/favicon-512.png', sizes: '512x512', type: 'image/png' }];
      var big = window.KVCatalog.bigImage(url, 512);
      return [{ src: big, sizes: '512x512' }, { src: url, sizes: '256x256' }];
    }
    function updateMetadata() {
      var t = current();
      if (!ms || !t || typeof MediaMetadata === 'undefined') return;
      try { ms.metadata = new MediaMetadata({ title: t.title || 'Ketvoice', artist: t.artist || '', album: t.album || '', artwork: artwork(t) }); }
      catch (e) { /* unsupported artwork */ }
    }
    function updatePosition() {
      if (!ms) return;
      try {
        ms.playbackState = s.playing ? 'playing' : current() ? 'paused' : 'none';
        if (ms.setPositionState && s.durationMs > 0) ms.setPositionState({ duration: s.durationMs / 1000, playbackRate: 1, position: Math.min(s.positionMs, s.durationMs) / 1000 });
      } catch (e) { /* position out of range while a title changes */ }
    }
    if (ms) {
      var handlers = {
        play: play, pause: pause, stop: pause, previoustrack: prev, nexttrack: function () { next(false); },
        seekbackward: function (d) { seek(s.positionMs - ((d && d.seekOffset) || 10) * 1000); },
        seekforward: function (d) { seek(s.positionMs + ((d && d.seekOffset) || 10) * 1000); },
        seekto: function (d) { if (d && typeof d.seekTime === 'number') seek(d.seekTime * 1000); }
      };
      Object.keys(handlers).forEach(function (k) { try { ms.setActionHandler(k, handlers[k]); } catch (e) { /* action not supported */ } });
    }

    return {
      state: s, current: current, playQueue: playQueue, play: play, pause: pause, toggle: toggle, next: next, prev: prev,
      playAt: playAt, seek: seek, setVolume: setVolume, toggleMute: toggleMute, toggleShuffle: toggleShuffle, cycleRepeat: cycleRepeat,
      startRadio: startRadio, playable: playable, volumeWorks: volumeWorks,
      preload: function () { return loadYouTubeApi().catch(function () { return null; }); },
      /** Puts a queue in place without playing (« Reprendre » waits for the listener's tap). */
      cueQueue: function (tracks, index, startMs) { s.queue = tracks.slice(); s.original = null; s.shuffle = false; s.radio = null; s.index = index; preload = null; load(startMs || 0, false); },
      enqueue: function (track) { s.queue.push(track); if (s.original) s.original.push(track); changed('queue'); },
      playNext: function (track) { s.queue.splice(s.index + 1, 0, track); if (s.original) s.original.push(track); dropPreload(); changed('queue'); }
    };
  }

  window.KVEngine = { createEngine: createEngine };
})();
