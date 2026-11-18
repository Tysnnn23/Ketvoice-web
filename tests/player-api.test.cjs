// The web player's network client against a fake Supabase that answers like the real one (recorded
// shapes): sign-in, token refresh (one at a time, 401 retried once, a refused session signs out), the
// favourites written with the revision rule (a lost race reads and merges again), now playing, Discord
// with PKCE, the public content endpoint and LRCLIB. Run: node tests/player-api.test.cjs
const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');

const core = require(path.join(__dirname, '../js/player/core.js'));
const KVApi = require(path.join(__dirname, '../js/player/api.js'));
const fixture = require(path.join(__dirname, 'fixtures/player-library.json'));
const ROOT = KVApi.ROOT;
const USER = fixture.user;

function jwt(claims) {
  const b = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return b({ alg: 'HS256', typ: 'JWT' }) + '.' + b(claims) + '.sig';
}

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m };
}

/** A fake Supabase: auth, the library table with its revision trigger, profiles, content, LRCLIB. */
function fakeServer(opts = {}) {
  const s = {
    clock: opts.serverClock || (() => 1795000000000),
    rows: new Map(fixture.rows.map((r) => [r.kind, JSON.parse(JSON.stringify(r))])),
    calls: [], refreshes: 0, tokens: 0, beforeWrite: null, rejectRefresh: false, expireNext: false, validTokens: new Set()
  };
  function session(prevRefresh) {
    const iat = Math.floor(s.clock() / 1000);
    const access = jwt({ sub: USER, iat, exp: iat + 3600, n: ++s.tokens });
    s.validTokens.add(access);
    return { access_token: access, token_type: 'bearer', expires_in: 3600, refresh_token: 'r' + s.tokens, user: { id: USER, email: 'listener@example.invalid' } };
  }
  const json = (status, body, headers) => ({ status, text: async () => (body === undefined ? '' : JSON.stringify(body)), json: async () => body, ok: status >= 200 && status < 300, headers });
  s.fetch = async (url, init = {}) => {
    const u = new URL(url);
    const method = init.method || 'GET';
    const body = init.body ? JSON.parse(init.body) : undefined;
    const headers = init.headers || {};
    s.calls.push({ method, path: u.pathname + u.search, body, headers });
    if (u.hostname === 'lrclib.net') return json(200, fixture.lrclib);
    if (u.pathname === '/auth/v1/token') {
      const grant = u.searchParams.get('grant_type');
      if (grant === 'password') return body.password === 'right' ? json(200, session()) : json(400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
      if (grant === 'refresh_token') {
        s.refreshes++;
        await new Promise((r) => setTimeout(r, 5));
        if (s.rejectRefresh) return json(400, { code: 400, error_code: 'refresh_token_already_used', msg: 'Invalid Refresh Token: Already Used' });
        return json(200, session());
      }
      if (grant === 'pkce') return body.code_verifier && body.auth_code === 'c0de-1234-abcd' ? json(200, session()) : json(400, { error_code: 'flow_state_not_found' });
    }
    if (u.pathname === '/auth/v1/logout') return json(204);
    const token = (headers.Authorization || '').replace('Bearer ', '');
    if (u.pathname.startsWith('/rest/v1/') || u.pathname.startsWith('/storage/')) {
      if (s.expireNext) { s.expireNext = false; return json(401, { code: 'PGRST301', message: 'JWT expired' }); }
      if (!s.validTokens.has(token)) return json(401, { message: 'invalid JWT' });
    }
    if (u.pathname === '/rest/v1/ketvoice_library') {
      if (method === 'GET') {
        const kinds = (u.searchParams.get('kind') || '').replace(/^in\.\(|\)$/g, '').replace(/^eq\./, '').split(',');
        assert.equal(u.searchParams.get('user_id'), 'eq.' + USER);
        return json(200, kinds.map((k) => s.rows.get(k)).filter(Boolean));
      }
      if (s.beforeWrite) { const f = s.beforeWrite; s.beforeWrite = null; f(); }
      if (method === 'POST' && u.searchParams.get('on_conflict') === 'user_id,kind') {
        const prev = s.rows.get(body.kind);
        s.rows.set(body.kind, { kind: body.kind, doc: body.doc, revision: prev ? prev.revision + 1 : 1, device_id: body.device_id });
        return json(201);
      }
      if (method === 'POST') {
        if (s.rows.has(body.kind)) return json(409, { code: '23505', message: 'duplicate key value violates unique constraint' });
        s.rows.set(body.kind, { kind: body.kind, doc: body.doc, revision: 1, device_id: body.device_id });
        return json(201);
      }
      if (method === 'PATCH') {
        const kind = u.searchParams.get('kind').replace('eq.', '');
        const rev = Number(u.searchParams.get('revision').replace('eq.', ''));
        const r = s.rows.get(kind);
        if (!r || r.revision !== rev) return json(200, []);
        r.doc = body.doc; r.revision++; r.device_id = body.device_id;
        return json(200, [{ revision: r.revision }]);
      }
    }
    if (u.pathname === '/rest/v1/ketvoice_profiles') return json(200, fixture.profile);
    if (u.pathname === '/rest/v1/ketvoice_shared_playlists') return json(200, fixture.sharedLists);
    if (u.pathname === '/rest/v1/ketvoice_shared_tracks') return json(200, fixture.sharedTracks);
    if (u.pathname.startsWith('/storage/v1/object/sign/')) return json(200, { signedURL: '/object/sign/ketvoice-avatars/x.jpg?token=t' });
    if (u.pathname === '/functions/v1/ketvoice-content/search') {
      return json(200, { tracks: fixture.content.tracks.concat([{ id: 'kv:upload:bad', title: 'Elsewhere', streamURL: 'https://evil.example/x.mp3' }]) });
    }
    if (u.pathname === '/functions/v1/ketvoice-content/track') return json(200, { track: fixture.content.tracks[0] });
    return json(404, { error: 'not found ' + u.pathname });
  };
  return s;
}

function client(server, extra = {}) {
  const storage = extra.storage || memoryStorage();
  let now = extra.now || 1795000000000;
  const c = KVApi.createClient({
    core, fetch: server.fetch, storage, now: () => now, random: (b) => globalThis.crypto.getRandomValues(b), subtle: globalThis.crypto.subtle, locks: extra.locks
  });
  return { c, storage, tick: (ms) => { now += ms; }, setNow: (v) => { now = v; } };
}

test('sign-in keeps the session (and the server clock from the token), a wrong password says why', async () => {
  const server = fakeServer({ serverClock: () => 1795000000000 + 90000 });
  const { c, storage } = client(server);
  await assert.rejects(c.signIn('listener@example.invalid', 'wrong'), (e) => e.code === 'invalid_credentials');
  await assert.rejects(c.signIn('not-an-email', 'x'), (e) => e.code === 'invalid_email');
  const s = await c.signIn(' listener@example.invalid ', 'right');
  assert.equal(s.user, USER);
  assert.equal(JSON.parse(storage.getItem(KVApi.SESSION_KEY)).refresh, 'r1');
  assert.equal(c.serverNow(), 1795000000000 + 90000);
  assert.equal(server.calls[1].headers.apikey, KVApi.ANON_KEY);
});

test('an expiring token is renewed once for concurrent calls; a 401 renews and retries once', async () => {
  const server = fakeServer();
  const { c, tick } = client(server);
  await c.signIn('listener@example.invalid', 'right');
  tick(3600 * 1000 - 30000);
  const rows = await Promise.all([c.readRows(['favorites']), c.readRows(['playlists']), c.profile()]);
  assert.equal(server.refreshes, 1);
  assert.equal(rows[0].favorites.revision, 7);
  server.expireNext = true;
  const again = await c.fetchKind('artists');
  assert.equal(again.revision, 2);
  assert.equal(server.refreshes, 2);
});

test('a refused refresh signs out; a network failure keeps the session for later', async () => {
  const server = fakeServer();
  const { c, tick, storage } = client(server);
  const events = [];
  c.onSession((s, why) => events.push(why));
  await c.signIn('listener@example.invalid', 'right');
  tick(3600 * 1000);
  const realFetch = server.fetch;
  server.fetch = async () => { throw new TypeError('Failed to fetch'); };
  const c2 = KVApi.createClient({ core, fetch: (u, o) => server.fetch(u, o), storage, now: () => 1795000000000 + 3600 * 1000, random: () => {}, subtle: null });
  await assert.rejects(c2.fetchKind('favorites'), (e) => e.code === 'network');
  assert.ok(c2.session);
  server.fetch = realFetch;
  server.rejectRefresh = true;
  await assert.rejects(c.fetchKind('favorites'), (e) => e.code === 'signed_out');
  assert.equal(c.session, null);
  assert.equal(storage.getItem(KVApi.SESSION_KEY), null);
  assert.deepEqual(events, ['signed_in', 'expired']);
});

test('another tab\'s renewed session is used instead of spending a used refresh token', async () => {
  const server = fakeServer();
  const storage = memoryStorage();
  const a = client(server, { storage });
  await a.c.signIn('listener@example.invalid', 'right');
  const b = client(server, { storage });
  a.tick(3600 * 1000); b.tick(3600 * 1000);
  await a.c.fetchKind('favorites');
  assert.equal(server.refreshes, 1);
  server.rejectRefresh = true; // b's old refresh token is spent: it must not be sent
  const row = await b.c.fetchKind('favorites');
  assert.equal(row.revision, 7);
  assert.equal(server.refreshes, 1);
});

test('liking writes the app\'s document naming the revision read', async () => {
  const server = fakeServer();
  const { c } = client(server);
  await c.signIn('listener@example.invalid', 'right');
  const track = { id: 'yt:kvNewSong01', title: 'New song', artist: 'Vice FM', album: '', durationMs: 180000, coverUrl: 'https://lh3.googleusercontent.com/x' };
  const doc = await c.setFavorite(track, true, 'web-test-device');
  const patch = server.calls.find((x) => x.method === 'PATCH');
  assert.match(patch.path, /revision=eq\.7&select=revision$/);
  assert.equal(patch.headers.Prefer, 'return=representation');
  assert.equal(patch.body.device_id, 'web-test-device');
  const stored = server.rows.get('favorites');
  assert.equal(stored.revision, 8);
  assert.equal(stored.doc.v, 1);
  assert.deepEqual(stored.doc.items['yt:kvNewSong01'], { t: c.serverNow(), v: core.trackJson(track) });
  // Everything else is untouched: the tombstone and the bare id are still there.
  assert.deepEqual(stored.doc.items['yt:kvTestGone1'], fixture.rows[0].doc.items['yt:kvTestGone1']);
  assert.deepEqual(stored.doc.items['yt:kvTestBare1'], fixture.rows[0].doc.items['yt:kvTestBare1']);
  assert.equal(core.live(doc).has('yt:kvNewSong01'), true);
  // Liking it again changes nothing and writes nothing.
  const writes = server.calls.filter((x) => x.method !== 'GET').length;
  await c.setFavorite(track, true, 'web-test-device');
  assert.equal(server.calls.filter((x) => x.method !== 'GET').length, writes);
});

test('when the phone wrote first, the web reads again and keeps both changes', async () => {
  const server = fakeServer();
  const { c } = client(server);
  await c.signIn('listener@example.invalid', 'right');
  server.beforeWrite = () => {
    const r = server.rows.get('favorites');
    r.doc = JSON.parse(JSON.stringify(r.doc));
    r.doc.items['yt:kvPhoneAdd1'] = { t: 1795000000500, v: { id: 'yt:kvPhoneAdd1', title: 'From the phone', artist: 'A', album: '', durationMs: 0, lyricsProvider: 'LRCLIB', explicit: false, youtubeCatalogVerified: true } };
    r.revision++;
  };
  await c.setFavorite({ id: 'yt:kvTestChi01', title: 'Chicago' }, false, 'web-test-device');
  const patches = server.calls.filter((x) => x.method === 'PATCH');
  assert.equal(patches.length, 2);
  assert.match(patches[0].path, /revision=eq\.7/);
  assert.match(patches[1].path, /revision=eq\.8/);
  const items = server.rows.get('favorites').doc.items;
  assert.equal(items['yt:kvTestChi01'].d, true);
  assert.equal(items['yt:kvPhoneAdd1'].v.title, 'From the phone');
  assert.equal(server.rows.get('favorites').revision, 9);
});

test('a first favourite creates the row; a row created meanwhile is updated instead', async () => {
  const server = fakeServer();
  server.rows.delete('favorites');
  const { c } = client(server);
  await c.signIn('listener@example.invalid', 'right');
  server.beforeWrite = () => server.rows.set('favorites', { kind: 'favorites', doc: { v: 1, items: { 'yt:kvOther0001': { t: 5, v: { id: 'yt:kvOther0001', title: 'Other' } } } }, revision: 1, device_id: 'phone-0001' });
  await c.setFavorite({ id: 'yt:kvTestBli01', title: 'Blinding Lights', artist: 'The Weeknd' }, true, 'web-test-device');
  const writes = server.calls.filter((x) => x.method !== 'GET').map((x) => x.method);
  assert.deepEqual(writes.slice(-2), ['POST', 'PATCH']);
  const items = server.rows.get('favorites').doc.items;
  assert.deepEqual(Object.keys(items).sort(), ['yt:kvOther0001', 'yt:kvTestBli01']);
  // Unliking a title that is not there never creates a row.
  server.rows.delete('favorites');
  await c.setFavorite({ id: 'yt:kvTestBli01', title: 'x' }, false, 'web-test-device');
  assert.equal(server.rows.has('favorites'), false);
});

test('a library that keeps changing elsewhere gives up after four tries', async () => {
  const server = fakeServer();
  const { c } = client(server);
  await c.signIn('listener@example.invalid', 'right');
  const bump = () => { server.rows.get('favorites').revision++; server.beforeWrite = bump; };
  server.beforeWrite = bump;
  await assert.rejects(c.setFavorite({ id: 'yt:kvX00000001', title: 'X' }, true, 'web-test-device'), (e) => e.code === 'library_busy');
  assert.equal(server.calls.filter((x) => x.method === 'PATCH').length, 4);
});

test('now playing is upserted over the other device\'s', async () => {
  const server = fakeServer();
  const { c } = client(server);
  await c.signIn('listener@example.invalid', 'right');
  const doc = core.encodeNowPlaying({ queue: [{ id: 'yt:kvTestChi01', title: 'Chicago', artist: 'MJ', album: '', durationMs: 1 }], index: 0, playing: true, positionMs: 5000, at: c.serverNow(), deviceId: 'web-test-device', deviceName: 'Web · Chrome · Linux' });
  await c.putNowPlaying(doc, 'web-test-device');
  const call = server.calls.at(-1);
  assert.equal(call.path, '/rest/v1/ketvoice_library?on_conflict=user_id,kind');
  assert.equal(call.headers.Prefer, 'return=minimal,resolution=merge-duplicates');
  assert.deepEqual(Object.keys(call.body).sort(), ['device_id', 'doc', 'kind', 'user_id']);
  const back = core.decodeNowPlaying(server.rows.get('now_playing').doc);
  assert.equal(back.deviceName, 'Web · Chrome · Linux');
  assert.equal(back.positionMs, 5000);
});

test('Discord: PKCE address, the code exchanged with the stored verifier, stale or cancelled answers refused', async () => {
  const server = fakeServer();
  const { c, storage, tick } = client(server);
  const url = new URL(await c.oauthUrl('discord', 'https://ketvoice-web.vercel.app/player'));
  assert.equal(url.origin + url.pathname, ROOT + '/auth/v1/authorize');
  assert.equal(url.searchParams.get('provider'), 'discord');
  assert.equal(url.searchParams.get('redirect_to'), 'https://ketvoice-web.vercel.app/player');
  assert.equal(url.searchParams.get('code_challenge_method'), 's256');
  const verifier = JSON.parse(storage.getItem(KVApi.PKCE_KEY)).verifier;
  assert.equal(url.searchParams.get('code_challenge'), await core.pkceChallenge(verifier, globalThis.crypto.subtle));
  const s = await c.completeOAuth(new URLSearchParams('code=c0de-1234-abcd'));
  assert.equal(s.user, USER);
  assert.equal(server.calls.at(-1).body.code_verifier, verifier);
  assert.equal(storage.getItem(KVApi.PKCE_KEY), null);
  await assert.rejects(c.completeOAuth(new URLSearchParams('code=c0de-1234-abcd')), (e) => e.code === 'oauth_expired');
  await c.oauthUrl('discord', 'https://ketvoice-web.vercel.app/player');
  tick(16 * 60000);
  await assert.rejects(c.completeOAuth(new URLSearchParams('code=c0de-1234-abcd')), (e) => e.code === 'oauth_expired');
  await assert.rejects(c.completeOAuth(new URLSearchParams('error=access_denied&error_description=The+user+denied')), (e) => e.code === 'oauth_cancelled');
  assert.equal(c.hasOAuthAnswer(new URLSearchParams('')), false);
});

test('public content: only Ketvoice\'s own public files; shared playlists and lyrics', async () => {
  const server = fakeServer();
  const { c } = client(server);
  const found = await c.contentSearch('ketvoice');
  assert.deepEqual(found.map((t) => t.id), ['kv:upload:3f1c2d4e-1111-4a2b-9c3d-5e6f7a8b9c0d']);
  assert.equal(found[0].streamUrl.startsWith(ROOT + '/storage/v1/object/public/ketvoice-public-media/'), true);
  assert.deepEqual(await c.contentSearch('k'), []);
  const one = await c.resolveUpload('3f1c2d4e-1111-4a2b-9c3d-5e6f7a8b9c0d');
  assert.equal(one.title, 'Ketvoice Theme');
  assert.equal(await c.resolveUpload('../x'), null);
  await c.signIn('listener@example.invalid', 'right');
  const lists = await c.sharedLists();
  assert.equal(lists[0].name, 'Soirée de vendredi');
  const tracks = await c.sharedTracks(lists[0].id);
  assert.deepEqual(tracks.map((t) => t.title), ['Colisée', 'Blinding Lights']);
  const lyr = await c.lyrics({ title: 'Sunset on Ocean Drive', artist: 'Vice FM', durationMs: 214000 });
  assert.equal(lyr.synced, true);
  assert.equal(lyr.lines[1].text, 'Neon on the water, the night is coming in');
  const lrcCalls = server.calls.filter((x) => x.path.startsWith('/api/search')).length;
  await c.lyrics({ title: 'Sunset on Ocean Drive', artist: 'Vice FM', durationMs: 214000 });
  assert.equal(server.calls.filter((x) => x.path.startsWith('/api/search')).length, lrcCalls);
  assert.match(await c.avatarUrl(USER + '/avatar-1795000000000.jpg'), /^https:\/\/xodklrunqlzyeiqtovgx\.supabase\.co\/storage\/v1\/object\/sign\//);
  assert.equal(await c.avatarUrl('../../etc'), null);
});

test('sign-out forgets the session', async () => {
  const server = fakeServer();
  const { c, storage } = client(server);
  await c.signIn('listener@example.invalid', 'right');
  await c.signOut();
  assert.equal(c.session, null);
  assert.equal(storage.getItem(KVApi.SESSION_KEY), null);
  assert.equal(server.calls.at(-1).path, '/auth/v1/logout?scope=local');
  await assert.rejects(c.fetchKind('favorites'), (e) => e.code === 'signed_out');
});
