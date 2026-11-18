/* Ketvoice web player — playback. Titles whose id maps to a YouTube video play through the official
 * YouTube IFrame Player API, in a player that stays visible (the page places it over the artwork area);
 * titles published on Ketvoice play from their public file in an <audio> element. One queue for both,
 * with shuffle (the queue itself is reordered, as in the app), repeat off/all/one, and the Media Session
 * API (lock screen, keyboard media keys). Exposed as window.KVEngine. */
(function () {
  'use strict';

  var YT_STATE = { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 };

  function createEngine(opts) {
    var core = opts.core, api = opts.api, audio = opts.audio, hostId = opts.hostId;
    var emit = opts.onChange || function () {};
    var s = {
      queue: [], index: -1, original: null, shuffle: false, repeat: 'off', playing: false, loading: false,
      positionMs: 0, durationMs: 0, volume: 100, muted: false, source: null, error: null, needsTap: false
    };
    var yt = null, ytReady = null, ytApi = null, ticking = 0, token = 0, pendingSeek = 0, tapTimer = 0, skipTimer = 0;

    try {
      var saved = JSON.parse(localStorage.getItem('kv-player-volume') || 'null');
      if (saved && typeof saved.v === 'number') { s.volume = Math.min(100, Math.max(0, saved.v)); s.muted = !!saved.m; }
    } catch (e) { /* storage blocked */ }

    function current() { return s.queue[s.index] || null; }
    function changed(what) { emit(what || 'state', s); }

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
      s.error = e && (e.data === 101 || e.data === 150) ? 'embed_blocked' : 'unavailable';
      s.playing = false; s.loading = false;
      changed('error');
      clearTimeout(skipTimer);
      skipTimer = setTimeout(function () { if (s.error) next(true); }, 2500);
    }

    // ------------------------------------------------------------ <audio> (titles published on Ketvoice)

    audio.addEventListener('playing', function () { if (s.source === 'upload') { s.playing = true; s.loading = false; changed(); } });
    audio.addEventListener('pause', function () { if (s.source === 'upload') { s.playing = false; changed(); } });
    audio.addEventListener('waiting', function () { if (s.source === 'upload') { s.loading = true; changed(); } });
    audio.addEventListener('ended', function () { if (s.source === 'upload') { s.playing = false; next(true); } });
    audio.addEventListener('error', function () {
      if (s.source !== 'upload' || !audio.getAttribute('src')) return;
      s.error = 'unavailable'; s.playing = false; s.loading = false; changed('error');
    });
    audio.addEventListener('loadedmetadata', function () {
      if (s.source !== 'upload') return;
      if (pendingSeek) { audio.currentTime = pendingSeek / 1000; pendingSeek = 0; }
      tick();
    });

    // ------------------------------------------------------------ time

    function tick() {
      var pos = 0, dur = 0;
      if (s.source === 'youtube' && yt && yt.getCurrentTime) { pos = (yt.getCurrentTime() || 0) * 1000; dur = (yt.getDuration() || 0) * 1000; }
      else if (s.source === 'upload') { pos = (audio.currentTime || 0) * 1000; dur = isFinite(audio.duration) ? audio.duration * 1000 : 0; }
      var t = current();
      if (!dur && t) dur = t.durationMs || 0;
      s.positionMs = pos; s.durationMs = dur;
      emit('time', s);
      updatePosition();
    }

    function startTicking() {
      if (ticking) return;
      ticking = setInterval(function () { if (s.playing || s.loading) tick(); }, 250);
    }

    // ------------------------------------------------------------ loading a title

    function stopOthers(source) {
      if (source !== 'upload' && audio.getAttribute('src')) { audio.pause(); audio.removeAttribute('src'); audio.load(); }
      if (source !== 'youtube' && yt && yt.pauseVideo) { try { yt.pauseVideo(); } catch (e) { /* not ready */ } }
    }

    function load(startMs, autoplay) {
      var t = current();
      var my = ++token;
      clearTimeout(skipTimer); clearTimeout(tapTimer);
      s.error = null; s.positionMs = startMs || 0; s.durationMs = (t && t.durationMs) || 0; s.needsTap = false;
      if (!t) { s.source = null; stopOthers(null); s.playing = false; changed('track'); return; }
      var kind = core.playable(t);
      s.source = kind;
      stopOthers(kind);
      updateMetadata();
      changed('track');
      startTicking();
      if (kind === 'youtube') {
        var id = core.youtubeId(t);
        s.loading = autoplay !== false;
        if (yt && yt.loadVideoById) {
          // Called from the click itself when possible: Safari on iPhone lets a page start sound only from a gesture.
          if (autoplay === false) yt.cueVideoById({ videoId: id, startSeconds: (startMs || 0) / 1000 });
          else yt.loadVideoById({ videoId: id, startSeconds: (startMs || 0) / 1000 });
        } else {
          ensurePlayer(id, (startMs || 0) / 1000, autoplay).then(function (p) {
            if (my !== token) return;
            var made = p.getVideoData && p.getVideoData();
            var at = { videoId: id, startSeconds: (startMs || 0) / 1000 };
            // The player was made for an earlier title still loading: this one replaces it.
            if (made && made.video_id && made.video_id !== id) { if (autoplay === false) p.cueVideoById(at); else p.loadVideoById(at); }
            else if (autoplay !== false) p.playVideo();
          }).catch(function () { if (my === token) { s.error = 'youtube_api'; s.loading = false; changed('error'); } });
        }
        if (autoplay !== false) {
          // A browser that refused to start the sound (no gesture) leaves the video waiting: the listener taps it.
          tapTimer = setTimeout(function () {
            if (my === token && !s.playing && s.source === 'youtube' && !s.error) { s.needsTap = true; s.loading = false; changed(); }
          }, 3500);
        }
      } else if (kind === 'upload') {
        s.loading = true;
        var start = function (src) {
          if (my !== token) return;
          if (!src) { s.error = 'unavailable'; s.loading = false; changed('error'); return; }
          pendingSeek = startMs || 0;
          audio.src = src;
          applyVolume();
          if (autoplay !== false) {
            var p = audio.play();
            if (p && p.catch) p.catch(function () { if (my === token) { s.loading = false; s.needsTap = true; changed(); } });
          } else s.loading = false;
        };
        if (t.streamUrl) start(t.streamUrl);
        else api.resolveUpload(core.uploadId(t)).then(function (r) { if (r) t.streamUrl = r.streamUrl; start(r && r.streamUrl); }, function () { start(null); });
      } else {
        s.playing = false; s.loading = false; s.error = 'app_only'; changed('error');
      }
    }

    /** Plays [tracks] from [index]; titles only the app can play are skipped. */
    function playQueue(tracks, index, startMs) {
      s.queue = tracks.slice(); s.original = null; s.shuffle = false;
      s.index = Math.max(0, Math.min(index || 0, s.queue.length - 1));
      if (!core.playable(current())) { var i = findPlayable(s.index, 1, false); if (i >= 0) s.index = i; }
      load(startMs || 0, true);
    }

    function findPlayable(from, step, wrap) {
      var n = s.queue.length;
      for (var k = 0; k < n; k++) {
        var i = from + step * k;
        if (wrap) i = ((i % n) + n) % n;
        if (i < 0 || i >= n) return -1;
        if (core.playable(s.queue[i])) return i;
      }
      return -1;
    }

    function play() {
      var t = current();
      if (!t) return;
      if (s.error === 'app_only') return;
      if (s.source === 'youtube' && yt && yt.playVideo) { yt.playVideo(); s.loading = true; changed(); }
      else if (s.source === 'upload' && audio.getAttribute('src')) { var p = audio.play(); if (p && p.catch) p.catch(function () {}); }
      else load(s.positionMs, true);
    }

    function pause() {
      if (s.source === 'youtube' && yt && yt.pauseVideo) yt.pauseVideo();
      else if (s.source === 'upload') audio.pause();
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
      if (s.source === 'youtube' && yt && yt.seekTo) yt.seekTo(ms / 1000, true);
      else if (s.source === 'upload') { if (audio.readyState >= 1) audio.currentTime = ms / 1000; else pendingSeek = ms; }
      s.positionMs = ms;
      emit('time', s);
      updatePosition();
    }

    function applyVolume() {
      if (yt && yt.setVolume) { yt.setVolume(s.volume); if (s.muted) yt.mute(); else yt.unMute(); }
      audio.volume = s.volume / 100; audio.muted = s.muted;
    }

    function setVolume(v) {
      s.volume = Math.min(100, Math.max(0, Math.round(v)));
      if (s.volume > 0) s.muted = false;
      applyVolume(); persistVolume(); changed('volume');
    }

    function toggleMute() { s.muted = !s.muted; applyVolume(); persistVolume(); changed('volume'); }
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
      changed('queue');
    }

    function cycleRepeat() {
      s.repeat = s.repeat === 'off' ? 'all' : s.repeat === 'all' ? 'one' : 'off';
      changed();
    }

    // ------------------------------------------------------------ Media Session

    var ms = 'mediaSession' in navigator ? navigator.mediaSession : null;
    function updateMetadata() {
      var t = current();
      if (!ms || !t || typeof MediaMetadata === 'undefined') return;
      try {
        ms.metadata = new MediaMetadata({ title: t.title || 'Ketvoice', artist: t.artist || '', album: t.album || '',
          artwork: t.coverUrl ? [{ src: t.coverUrl, sizes: '512x512' }] : [{ src: '/favicon-512.png', sizes: '512x512', type: 'image/png' }] });
      } catch (e) { /* unsupported artwork */ }
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
        play: play, pause: pause, previoustrack: prev, nexttrack: function () { next(false); },
        seekbackward: function (d) { seek(s.positionMs - ((d && d.seekOffset) || 10) * 1000); },
        seekforward: function (d) { seek(s.positionMs + ((d && d.seekOffset) || 10) * 1000); },
        seekto: function (d) { if (d && typeof d.seekTime === 'number') seek(d.seekTime * 1000); }
      };
      Object.keys(handlers).forEach(function (k) { try { ms.setActionHandler(k, handlers[k]); } catch (e) { /* action not supported */ } });
    }

    return {
      state: s, current: current, playQueue: playQueue, play: play, pause: pause, toggle: toggle, next: next, prev: prev,
      playAt: playAt, seek: seek, setVolume: setVolume, toggleMute: toggleMute, toggleShuffle: toggleShuffle, cycleRepeat: cycleRepeat,
      preload: function () { return loadYouTubeApi().catch(function () { return null; }); },
      /** Puts a queue in place without playing (« Reprendre » waits for the listener's tap). */
      cueQueue: function (tracks, index, startMs) { s.queue = tracks.slice(); s.original = null; s.shuffle = false; s.index = index; load(startMs || 0, false); },
      enqueue: function (track) { s.queue.push(track); if (s.original) s.original.push(track); changed('queue'); },
      playNext: function (track) { s.queue.splice(s.index + 1, 0, track); if (s.original) s.original.push(track); changed('queue'); }
    };
  }

  window.KVEngine = { createEngine: createEngine };
})();
