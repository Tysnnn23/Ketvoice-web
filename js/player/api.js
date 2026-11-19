/* Ketvoice web player — the network: Supabase Auth over REST (e-mail and password, Discord with PKCE,
 * refresh, sign-out), the synced library `ketvoice_library` through PostgREST with the listener's own
 * session (owner-only row level security), the shared playlists, the public Ketvoice content endpoint
 * and LRCLIB. The same calls as the app (account/AuthApi.kt, sync/CloudLibrary.kt, sync/SharedClient.kt,
 * data/PublicationApi.kt). Only the project's publishable (anon) key is here: it is public by design.
 * fetch, storage and the clock are injected, so tests drive it with recorded answers. */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KVApi = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var ROOT = 'https://xodklrunqlzyeiqtovgx.supabase.co';
  var ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvZGtscnVucWx6eWVpcXRvdmd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1ODgzNjgsImV4cCI6MjEwODE2NDM2OH0.V-F8ZhM21Ht1yRV5FXOuZcddufvY8aIW5kclb-F2zao';
  var CONTENT = ROOT + '/functions/v1/ketvoice-content';
  var PUBLIC_MEDIA = ROOT + '/storage/v1/object/public/ketvoice-public-media/';
  var TABLE = '/rest/v1/ketvoice_library';
  var SESSION_KEY = 'kv-player-session';
  var PKCE_KEY = 'kv-player-pkce';
  var REFRESH_MARGIN_MS = 60000;
  var ATTEMPTS = 4;
  var UUID = /^[0-9a-fA-F-]{36}$/;
  var EMAIL = /^[^@\s]{1,64}@[^@\s]{1,190}\.[^@\s.]{2,24}$/;

  function fail(code, status, detail) {
    var e = new Error(detail || code);
    e.code = code; e.status = status || 0;
    return e;
  }

  /** A code for the listener's message, from Supabase Auth's error (AuthApi.message). */
  function authCode(status, json) {
    json = json || {};
    var code = json.error_code || json.error || '';
    var text = [json.msg, json.error_description, json.message].join(' ').toLowerCase();
    if (code === 'invalid_credentials' || text.indexOf('invalid login credentials') >= 0) return 'invalid_credentials';
    if (code === 'email_not_confirmed') return 'email_not_confirmed';
    if (code === 'provider_disabled' || text.indexOf('provider is not enabled') >= 0) return 'provider_disabled';
    if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit' || status === 429) return 'rate_limited';
    if (code === 'validation_failed' && text.indexOf('email') >= 0) return 'invalid_email';
    return 'auth_failed';
  }

  /** True when a refresh failed because the server no longer knows the session (AuthApi.rejected). */
  function rejected(status, json) {
    var code = (json && (json.error_code || json.error)) || '';
    return status >= 400 && status <= 403 && (['refresh_token_not_found', 'refresh_token_already_used', 'invalid_grant',
      'session_not_found', 'session_expired', 'user_not_found', 'bad_jwt'].indexOf(code) >= 0 ||
      JSON.stringify(json || {}).toLowerCase().indexOf('refresh token') >= 0);
  }

  function parseJson(text) { try { return JSON.parse(text); } catch (e) { return null; } }

  function createClient(opts) {
    var core = opts.core;
    var fetchFn = opts.fetch;
    var store = opts.storage;
    var now = opts.now || Date.now;
    var locks = opts.locks || null;
    var random = opts.random;
    var subtle = opts.subtle;
    var listeners = [];
    var session = load();
    var refreshing = null;
    var lyricCache = new Map();

    function load() {
      try {
        var s = JSON.parse(store.getItem(SESSION_KEY));
        return s && typeof s.refresh === 'string' && s.refresh && UUID.test(s.user || '') ? s : null;
      } catch (e) { return null; }
    }

    function emit(reason) { listeners.forEach(function (fn) { try { fn(session, reason); } catch (e) { /* a listener's own problem */ } }); }

    function save(next, reason) {
      session = next;
      try { if (next) store.setItem(SESSION_KEY, JSON.stringify(next)); else store.removeItem(SESSION_KEY); } catch (e) { /* private mode */ }
      emit(reason);
    }

    /** AuthApi.parseSession, plus the server's clock read from the token's issue time. */
    function parseSession(json, previousRefresh) {
      var access = json && json.access_token, user = (json && json.user) || {};
      if (!access || !UUID.test(user.id || '')) throw fail('auth_failed');
      var refresh = json.refresh_token || previousRefresh || '';
      if (!refresh) throw fail('auth_failed');
      var expires = Math.min(Math.max(Number(json.expires_in) || 3600, 60), 7 * 24 * 3600);
      var t = now(), claims = core.jwtClaims(access), offset = 0;
      if (claims && typeof claims.iat === 'number') {
        offset = claims.iat * 1000 - t;
        if (Math.abs(offset) > 24 * 3600 * 1000) offset = 0;
      }
      return { access: access, refresh: refresh, expiresAt: t + expires * 1000, user: user.id,
        email: user.email || (session && session.user === user.id ? session.email : '') || '', offset: offset };
    }

    function request(method, url, o) {
      o = o || {};
      var headers = { apikey: ANON_KEY, Authorization: 'Bearer ' + (o.token || ANON_KEY), Accept: 'application/json' };
      if (o.body !== undefined) headers['Content-Type'] = 'application/json';
      Object.keys(o.headers || {}).forEach(function (k) { headers[k] = o.headers[k]; });
      var init = { method: method, headers: headers, credentials: 'omit', cache: 'no-store' };
      if (o.body !== undefined) init.body = JSON.stringify(o.body);
      if (o.keepalive) init.keepalive = true;
      return Promise.resolve(fetchFn(url.indexOf('https://') === 0 ? url : ROOT + url, init)).then(function (r) {
        return r.text().then(function (text) { return { status: r.status, ok: r.status >= 200 && r.status < 300, text: text, json: parseJson(text) }; });
      }, function () { throw fail('network'); });
    }

    function authPost(path, body) {
      return request('POST', '/auth/v1' + path, { body: body }).then(function (r) {
        if (!r.ok) throw fail(authCode(r.status, r.json), r.status);
        return r.json || {};
      });
    }

    function doRefresh(current) {
      return request('POST', '/auth/v1/token?grant_type=refresh_token', { body: { refresh_token: current.refresh } }).then(function (r) {
        if (r.ok && r.json) { var next = parseSession(r.json, current.refresh); save(next, 'refreshed'); return next.access; }
        if (rejected(r.status, r.json)) { save(null, 'expired'); throw fail('signed_out', r.status); }
        throw fail('network', r.status);
      });
    }

    function fresh(s) { return s && s.access && now() < s.expiresAt - REFRESH_MARGIN_MS; }

    /** A valid access token, renewed first when needed: one refresh at a time, also across tabs (refresh tokens are single use). */
    function access() {
      if (!session) return Promise.reject(fail('signed_out'));
      if (fresh(session)) return Promise.resolve(session.access);
      if (refreshing) return refreshing;
      var run = function () {
        // Another tab may have renewed it meanwhile: its session is the one to use.
        var stored = load();
        if (stored && session && stored.user === session.user && stored.refresh !== session.refresh) session = stored;
        if (!session) throw fail('signed_out');
        if (fresh(session)) return session.access;
        return doRefresh(session);
      };
      refreshing = Promise.resolve(locks && locks.request ? locks.request('kv-player-refresh', run) : run())
        .then(function (v) { refreshing = null; return v; }, function (e) { refreshing = null; throw e; });
      return refreshing;
    }

    /** Sends a call with the listener's token; on 401 the token is renewed once and the call sent again. */
    function authorized(method, path, o) {
      o = o || {};
      return access().then(function (token) {
        return request(method, path, Object.assign({}, o, { token: token })).then(function (r) {
          if (r.status !== 401 || !session) return r;
          session = Object.assign({}, session, { access: '', expiresAt: 0 });
          return access().then(function (again) { return request(method, path, Object.assign({}, o, { token: again })); });
        });
      });
    }

    function uid() { if (!session) throw fail('signed_out'); return session.user; }
    /** Runs [fn] inside a promise, so a signed-out listener gets a rejection, never a thrown error. */
    function later(fn) { return Promise.resolve().then(fn); }

    // ------------------------------------------------------------ sign-in

    function signIn(email, password) {
      email = String(email || '').trim();
      if (!EMAIL.test(email)) return Promise.reject(fail('invalid_email'));
      if (!password || password.length > 72) return Promise.reject(fail('invalid_password'));
      return authPost('/token?grant_type=password', { email: email, password: password }).then(function (json) {
        var s = parseSession(json); save(s, 'signed_in'); return s;
      });
    }

    /** Discord through Supabase Auth with PKCE: the address to open; the answer comes back to [redirect] with ?code=. */
    function oauthUrl(provider, redirect) {
      var verifier = core.newVerifier(random);
      return core.pkceChallenge(verifier, subtle).then(function (challenge) {
        try { store.setItem(PKCE_KEY, JSON.stringify({ verifier: verifier, at: now(), redirect: redirect })); } catch (e) { /* private mode */ }
        return ROOT + '/auth/v1/authorize?provider=' + encodeURIComponent(provider) + '&redirect_to=' + encodeURIComponent(redirect) +
          '&code_challenge=' + encodeURIComponent(challenge) + '&code_challenge_method=s256';
      });
    }

    /** The provider sent the listener back: true when [params] carried an answer (signed in, or an error thrown). */
    function hasOAuthAnswer(params) { return !!(params.get('code') || params.get('error') || params.get('error_description')); }

    function completeOAuth(params) {
      var pending = parseJson(store.getItem(PKCE_KEY) || 'null');
      try { store.removeItem(PKCE_KEY); } catch (e) { /* private mode */ }
      if (params.get('error') || params.get('error_description')) return Promise.reject(fail(params.get('error') === 'access_denied' ? 'oauth_cancelled' : 'oauth_failed', 0, params.get('error_description') || ''));
      var code = params.get('code') || '';
      if (!/^[A-Za-z0-9_-]{8,200}$/.test(code)) return Promise.reject(fail('oauth_invalid'));
      if (!pending || !pending.verifier) return Promise.reject(fail('oauth_expired'));
      if (now() - (pending.at || 0) > 15 * 60000) return Promise.reject(fail('oauth_expired'));
      return authPost('/token?grant_type=pkce', { auth_code: code, code_verifier: pending.verifier }).then(function (json) {
        var s = parseSession(json); save(s, 'signed_in'); return s;
      });
    }

    function signOut() {
      var token = session && session.access;
      var done = token ? request('POST', '/auth/v1/logout?scope=local', { token: token, body: {} }).catch(function () { return null; }) : Promise.resolve();
      return done.then(function () { save(null, 'signed_out'); });
    }

    // ------------------------------------------------------------ the synced library

    function readRows(kinds) {
      return later(function () {
        var path = TABLE + '?select=kind,doc,revision,device_id,updated_at&user_id=eq.' + uid() + '&kind=in.(' + kinds.join(',') + ')';
        return authorized('GET', path).then(function (r) {
          if (!r.ok || !Array.isArray(r.json)) throw fail('library_read', r.status);
          var out = {};
          r.json.forEach(function (row) { if (row && typeof row.kind === 'string') out[row.kind] = row; });
          return out;
        });
      });
    }

    function fetchKind(kind) { return readRows([kind]).then(function (rows) { return rows[kind] || null; }); }

    function insertKind(kind, doc, deviceId) {
      return later(function () {
        return authorized('POST', TABLE, { body: { user_id: uid(), kind: kind, doc: doc, device_id: deviceId }, headers: { Prefer: 'return=minimal' } })
          .then(function (r) { if (r.status === 409) return false; if (!r.ok) throw fail('library_write', r.status); return true; });
      });
    }

    function updateKind(kind, doc, revision, deviceId) {
      return later(function () {
        var path = TABLE + '?user_id=eq.' + uid() + '&kind=eq.' + kind + '&revision=eq.' + revision + '&select=revision';
        return authorized('PATCH', path, { body: { doc: doc, device_id: deviceId }, headers: { Prefer: 'return=representation' } })
          .then(function (r) { if (!r.ok) throw fail('library_write', r.status); return Array.isArray(r.json) && r.json.length > 0; });
      });
    }

    /**
     * One change to a kind, the app's way (SyncRound): read the cloud's copy and its revision, apply the change,
     * write naming that revision; when another device wrote in between, read and apply again (four tries).
     * [change] gets the decoded document and returns the next one (the same Map when nothing changes).
     */
    function changeKind(kind, deviceId, change) {
      var attempt = 0;
      function round() {
        attempt++;
        return fetchKind(kind).then(function (row) {
          var doc = core.decodeDoc(row && row.doc);
          var next = core.pruneDoc(change(doc, serverNow()), serverNow());
          if (core.sameDoc(next, doc)) return next;
          var write = row ? updateKind(kind, core.encodeDoc(next), row.revision, deviceId) : insertKind(kind, core.encodeDoc(next), deviceId);
          return write.then(function (ok) {
            if (ok) return next;
            if (attempt >= ATTEMPTS) throw fail('library_busy');
            return round();
          });
        });
      }
      return round();
    }

    function uuid() {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
      var b = new Uint8Array(16); crypto.getRandomValues(b); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
      var h = Array.from(b, function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
      return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
    }

    /** Adds a title at the end of one of the account's playlists, the app's way (PlaylistStore.add → PlaylistsKind). */
    function addToPlaylist(listId, track, deviceId) {
      var entry = uuid();
      return changeKind('playlists', deviceId, function (doc, t) { return core.addToPlaylist(doc, listId, track, t, entry); });
    }

    function setFavorite(track, on, deviceId) {
      return changeKind('favorites', deviceId, function (doc, t) { return core.setFavorite(doc, track, on, t); });
    }

    /** What plays here, written over whatever another device wrote (the latest listening wins). */
    function putNowPlaying(doc, deviceId, keepalive) {
      return later(function () {
        return authorized('POST', TABLE + '?on_conflict=user_id,kind', { keepalive: !!keepalive,
          body: { user_id: uid(), kind: 'now_playing', doc: doc, device_id: deviceId },
          headers: { Prefer: 'return=minimal,resolution=merge-duplicates' } }).then(function (r) {
          if (!r.ok) throw fail('now_playing_write', r.status);
          return true;
        });
      });
    }

    function profile() {
      return later(function () {
        return authorized('GET', '/rest/v1/ketvoice_profiles?select=display_name,handle,avatar_url&id=eq.' + uid())
          .then(function (r) { return r.ok && Array.isArray(r.json) && r.json[0] ? r.json[0] : null; });
      });
    }

    /** A short-lived address of the profile photo (a private bucket: only its owner can sign it). */
    function avatarUrl(path) {
      if (!/^[0-9a-f-]{36}\/avatar-[0-9]{10,16}\.jpg$/.test(path || '')) return Promise.resolve(null);
      return authorized('POST', '/storage/v1/object/sign/ketvoice-avatars/' + path.split('/').map(encodeURIComponent).join('/'), { body: { expiresIn: 3600 } })
        .then(function (r) {
          var signed = r.ok && r.json && (r.json.signedURL || r.json.signedUrl);
          return signed ? ROOT + '/storage/v1' + (signed.charAt(0) === '/' ? '' : '/') + signed : null;
        }).catch(function () { return null; });
    }

    // ------------------------------------------------------------ shared playlists (read only here)

    function sharedLists() {
      return authorized('GET', '/rest/v1/ketvoice_shared_playlists?select=id,name,owner_id&order=created_at.asc&limit=100').then(function (r) {
        if (!r.ok || !Array.isArray(r.json)) throw fail('shared_read', r.status);
        return r.json.filter(function (row) { return row && row.id && row.name; }).map(function (row) {
          return { id: String(row.id), name: String(row.name), owner: String(row.owner_id || '') };
        });
      });
    }

    function sharedTracks(id) {
      var path = '/rest/v1/ketvoice_shared_tracks?select=id,track_id,title,artist,album,cover_url,duration_ms,extra,added_by,added_at,pos' +
        '&playlist_id=eq.' + encodeURIComponent(id) + '&order=pos.asc,added_at.asc,id.asc&limit=500';
      return authorized('GET', path).then(function (r) {
        if (!r.ok) throw fail('shared_read', r.status);
        return core.sharedRows(r.json).map(function (row) { return row.track; });
      });
    }

    // ------------------------------------------------------------ public content and lyrics

    /** PublicationApi.track: a title published on Ketvoice, playable from its public file. */
    function contentTrack(item) {
      if (!item || typeof item.id !== 'string' || item.id.indexOf('kv:upload:') !== 0) return null;
      var stream = typeof item.streamURL === 'string' ? item.streamURL : '';
      if (stream.indexOf(PUBLIC_MEDIA) !== 0) return null;
      var cover = typeof item.artworkURL === 'string' && item.artworkURL.indexOf('https://') === 0 ? item.artworkURL : undefined;
      var t = { id: item.id, title: String(item.title || ''), artist: String(item.artist || ''), album: String(item.album || ''),
        durationMs: Number(item.durationMs) || 0, streamUrl: stream, addon: 'upload', addonId: String(item.addonId || ''), lyricsProvider: 'Ketvoice API' };
      if (cover) t.coverUrl = cover;
      return t.title ? t : null;
    }

    function contentSearch(q) {
      q = String(q || '').trim();
      if (q.length < 2 || q.length > 160) return Promise.resolve([]);
      return request('GET', CONTENT + '/search?q=' + encodeURIComponent(q)).then(function (r) {
        return r.ok && r.json && Array.isArray(r.json.tracks) ? r.json.tracks.map(contentTrack).filter(Boolean) : [];
      });
    }

    function resolveUpload(id) {
      if (!/^[0-9a-f-]{36}$/.test(id || '')) return Promise.resolve(null);
      return request('GET', CONTENT + '/track?id=' + id).then(function (r) { return r.ok && r.json ? contentTrack(r.json.track) : null; });
    }

    /** LRCLIB, the app's way: up to three searches, the closest answer kept (MusicApi.fetchLyrics). */
    function lyrics(track) {
      var key = (track.title || '') + '\u0000' + (track.artist || '') + '\u0000' + (track.durationMs || 0);
      if (lyricCache.has(key)) return lyricCache.get(key);
      var queries = core.lyricQueries(track);
      var found = queries.reduce(function (chain, q) {
        return chain.then(function (done) {
          if (done) return done;
          return Promise.resolve(fetchFn('https://lrclib.net/api/search?q=' + encodeURIComponent(q), { credentials: 'omit' }))
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (rows) { var pick = core.pickLyrics(rows, track); return pick && pick.lines.length ? pick : null; })
            .catch(function () { return null; });
        });
      }, Promise.resolve(null));
      lyricCache.set(key, found);
      found.then(function (v) { if (!v) setTimeout(function () { lyricCache.delete(key); }, 60000); });
      return found;
    }

    function serverNow() { return now() + ((session && session.offset) || 0); }

    return {
      get session() { return session; },
      onSession: function (fn) { listeners.push(fn); },
      /** Another tab signed in, out or renewed the session. */
      reload: function () { var s = load(); var changed = (s && s.refresh) !== (session && session.refresh); session = s; if (changed) emit('storage'); },
      serverNow: serverNow, access: access, authorized: authorized,
      signIn: signIn, oauthUrl: oauthUrl, hasOAuthAnswer: hasOAuthAnswer, completeOAuth: completeOAuth, signOut: signOut,
      readRows: readRows, fetchKind: fetchKind, insertKind: insertKind, updateKind: updateKind, changeKind: changeKind,
      setFavorite: setFavorite, addToPlaylist: addToPlaylist, putNowPlaying: putNowPlaying, profile: profile, avatarUrl: avatarUrl,
      sharedLists: sharedLists, sharedTracks: sharedTracks, contentSearch: contentSearch, resolveUpload: resolveUpload, lyrics: lyrics
    };
  }

  return { ROOT: ROOT, ANON_KEY: ANON_KEY, SESSION_KEY: SESSION_KEY, PKCE_KEY: PKCE_KEY, createClient: createClient, authCode: authCode, rejected: rejected };
});
