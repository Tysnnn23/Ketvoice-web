// The web player's synced-library rules against the app's (sync/SyncDoc.kt, SyncKinds.kt, LibrarySync.kt,
// NowPlayingSync.kt), with rows shaped like the ones the app writes (tests/fixtures/player-library.json).
// Run: node tests/player-sync.test.cjs
const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');

const C = require(path.join(__dirname, '../js/player/core.js'));
const fixture = require(path.join(__dirname, 'fixtures/player-library.json'));
const row = (kind) => fixture.rows.find((r) => r.kind === kind);
const T0 = 1795000000000;

test('canonical JSON sorts keys at every depth, like Canonical.text', () => {
  assert.equal(C.canonical({ b: 1, a: { d: [3, { z: true, y: null }], c: 'x' } }), '{"a":{"c":"x","d":[3,{"y":null,"z":true}]},"b":1}');
  assert.equal(C.canonical('é"\n'), '"é\\"\\n"');
});

test('a document decodes and encodes back to the same JSON (tombstones kept, broken items dropped)', () => {
  const raw = row('favorites').doc;
  const doc = C.decodeDoc(raw);
  assert.equal(doc.size, 10);
  assert.deepEqual(doc.get('yt:kvTestGone1'), { value: null, t: T0 - 86400000, deleted: true });
  assert.deepEqual(C.encodeDoc(doc), JSON.parse(JSON.stringify({ v: 1, items: Object.fromEntries(Object.keys(raw.items).sort().map((k) => [k, raw.items[k]])) })));
  const broken = C.decodeDoc({ v: 1, items: { '': { t: 1, v: 1 }, a: { t: -1, v: 1 }, b: { v: 1 }, c: { t: 5 }, d: { t: 5, v: null }, ['x'.repeat(257)]: { t: 1, v: 1 }, ok: { t: '7', v: 2 } } });
  assert.deepEqual([...broken.keys()], ['ok']);
  assert.equal(broken.get('ok').t, 7);
  assert.equal(C.decodeDoc(null).size, 0);
  assert.equal(C.decodeDoc({ items: [] }).size, 0);
});

test('merge: union, newest per key, the cloud wins a tie (SyncMerge.merge)', () => {
  const local = new Map([['a', { value: '1', t: 10, deleted: false }], ['b', { value: '2', t: 30, deleted: false }], ['c', { value: null, t: 50, deleted: true }]]);
  const cloud = new Map([['a', { value: '9', t: 10, deleted: false }], ['b', { value: null, t: 20, deleted: true }], ['d', { value: '4', t: 1, deleted: false }]]);
  const m = C.mergeDocs(local, cloud);
  assert.equal(m.get('a').value, '9');
  assert.equal(m.get('b').value, '2');
  assert.equal(m.get('c').deleted, true);
  assert.equal(m.get('d').value, '4');
});

test('tombstones older than 90 days are pruned', () => {
  const now = T0;
  const doc = new Map([['old', { value: null, t: now - C.TOMBSTONE_KEEP_MS, deleted: true }], ['new', { value: null, t: now - 1000, deleted: true }], ['v', { value: '1', t: 0, deleted: false }]]);
  assert.deepEqual([...C.pruneDoc(doc, now).keys()], ['new', 'v']);
});

test('titles: the fields of DownloadQueue.trackToJson, cleaned like SyncTracks.clean', () => {
  const t = C.trackFromJson({ id: ' yt:abcdefghijk ', title: ' Song ', artist: 'A', durationMs: '1000', streamUrl: 'https://x/y.mp3', downloadUrl: 'https://x', canvasUrl: 'https://c', coverUrl: 'http://insecure', videoId: 'abcdefghijk', extra: 1 });
  assert.equal(t.id, 'yt:abcdefghijk');
  assert.equal(t.durationMs, 1000);
  assert.deepEqual(C.trackJson(t), { id: 'yt:abcdefghijk', title: 'Song', artist: 'A', album: '', durationMs: 1000, lyricsProvider: 'LRCLIB', explicit: false, youtubeCatalogVerified: false, videoId: 'abcdefghijk' });
  assert.equal(C.trackFromJson({ id: 'x', title: '  ' }), null);
  assert.equal(C.parseTrack({ id: 'x'.repeat(257), title: 't' }), null);
  // A local file keeps its content:// address (that is how the app finds it); nothing else keeps a stream.
  assert.equal(C.cleanTrack({ id: 'local:1', title: 't', streamUrl: 'content://media/1' }).streamUrl, 'content://media/1');
});

test('what the web can play: YouTube ids and Ketvoice publications; addon titles stay in the app', () => {
  assert.equal(C.playable({ id: 'yt:kvTestChi01' }), 'youtube');
  assert.equal(C.youtubeId({ id: 'kv:um:1', videoId: 'kvTestChi01' }), 'kvTestChi01');
  assert.equal(C.playable({ id: 'kv:upload:3f1c2d4e-1111-4a2b-9c3d-5e6f7a8b9c0d' }), 'upload');
  assert.equal(C.playable({ id: 'kv:um:774411' }), null);
  assert.equal(C.playable({ id: 'yt:short' }), null);
});

test('favourites to show: newest first, tombstones hidden, a bare id kept as a placeholder', () => {
  const list = C.favorites(C.decodeDoc(row('favorites').doc));
  assert.deepEqual(list.map((t) => t.id).slice(0, 3), ['kv:upload:3f1c2d4e-1111-4a2b-9c3d-5e6f7a8b9c0d', 'kv:um:774411', 'yt:kvDemoSun01']);
  assert.equal(list.length, 9);
  const bare = list.find((t) => t.id === 'yt:kvTestBare1');
  assert.equal(bare.bare, true);
  assert.ok(!list.some((t) => t.id === 'yt:kvTestGone1'));
});

test('liking stamps a value newer than the cloud\'s; a synced value is kept; unliking leaves a tombstone', () => {
  const doc = C.decodeDoc(row('favorites').doc);
  const track = { id: 'yt:kvNewSong01', title: 'New', artist: 'A', album: '', durationMs: 1, coverUrl: 'https://i.example/c.jpg', streamUrl: 'https://s/x.mp3' };
  const liked = C.setFavorite(doc, track, true, T0 + 10);
  assert.notEqual(liked, doc);
  assert.equal(liked.get(track.id).t, T0 + 10);
  assert.equal(liked.get(track.id).value, C.canonical(C.trackJson(track)));
  assert.ok(!liked.get(track.id).value.includes('streamUrl'));
  // Already a favourite with its title: nothing changes (FavoritesKind keeps a synced value as it is).
  assert.equal(C.setFavorite(liked, Object.assign({}, track, { title: 'Renamed' }), true, T0 + 20), liked);
  // A device clock behind the cloud's stamp still wins: the stamp is at least the cloud's + 1.
  const unliked = C.setFavorite(liked, track, false, T0 - 5000);
  assert.deepEqual(unliked.get(track.id), { value: null, t: T0 + 11, deleted: true });
  assert.equal(C.setFavorite(unliked, track, false, T0 + 30), unliked);
  // A bare id completes once the title is known.
  const completed = C.setFavorite(doc, { id: 'yt:kvTestBare1', title: 'Now known', artist: 'X' }, true, T0 + 40);
  assert.ok(completed.get('yt:kvTestBare1').value.includes('Now known'));
  // Device-only titles never enter the account.
  assert.equal(C.setFavorite(doc, { id: 'local:42', title: 'mine' }, true, T0), doc);
});

test('the phone sees the web\'s change: its merge picks the web\'s newer item', () => {
  const cloud = C.decodeDoc(row('favorites').doc);
  // The phone's copy as last agreed (same as the cloud before the web's change), stamped unchanged.
  const phone = new Map(cloud);
  const afterWeb = C.setFavorite(cloud, { id: 'yt:kvTestChi01', title: 'Chicago' }, false, T0 + 1);
  const phoneMerged = C.mergeDocs(phone, afterWeb);
  assert.equal(phoneMerged.get('yt:kvTestChi01').deleted, true);
  assert.ok(!C.live(phoneMerged).has('yt:kvTestChi01'));
});

test('playlists in the account\'s order, entries without a stored title kept by id, deleted ones gone', () => {
  const lists = C.playlists(C.decodeDoc(row('playlists').doc));
  assert.deepEqual(lists.map((l) => l.name), ['Vice City FM', 'Night drive']);
  const night = lists[1];
  assert.equal(night.tracks.length, 5);
  assert.deepEqual(night.tracks[4], { id: 'yt:kvTestNoT01', title: 'Ocean Drive', artist: 'Duke Dumont', album: '', durationMs: 0 });
  assert.equal(C.playable(night.tracks[4]), 'youtube');
  // An entry the app would refuse makes the whole playlist unreadable, as in PlaylistsKind.decode.
  assert.equal(C.decodePlaylist('x', JSON.stringify({ name: 'a', entries: [{ id: '', title: 't' }] })), null);
  // Unplaced lists come first, newest first.
  const doc = C.decodeDoc({ v: 1, items: { 'pl:a': { t: 1, v: { name: 'A', createdAt: 1, entries: [] } }, 'pl:b': { t: 1, v: { name: 'B', createdAt: 2, entries: [] } }, 'pl:c': { t: 1, v: { name: 'C', createdAt: 3, entries: [] } }, order: { t: 1, v: ['a'] } } });
  assert.deepEqual(C.playlists(doc).map((l) => l.name), ['C', 'B', 'A']);
});

test('followed artists: favourites only, blocked ones left out', () => {
  const a = C.artists(C.decodeDoc(row('artists').doc));
  assert.deepEqual(a.map((x) => x.name), ['Michael Jackson', 'The Weeknd', 'Vice FM']);
  assert.equal(a[2].photo, null);
});

test('shared playlist rows: extra fields merged back, ordered by position', () => {
  const rows = C.sharedRows(fixture.sharedTracks);
  assert.deepEqual(rows.map((r) => r.track.title), ['Colisée', 'Blinding Lights']);
  assert.equal(rows[1].track.videoId, 'kvTestBli01');
  assert.equal(C.playable(rows[0].track), 'youtube');
});

test('now playing: the app\'s document, its window of 50 titles, the moving position and the offer', () => {
  const s = C.decodeNowPlaying(row('now_playing').doc);
  assert.equal(s.deviceName, 'Pixel 9');
  assert.equal(s.queue[s.index].title, 'Sunset on Ocean Drive');
  assert.equal(C.positionAt(s, s.at + 10000), 72000);
  assert.equal(C.positionAt(s, s.at + 3600000), 213000);
  assert.equal(C.positionAt(Object.assign({}, s, { playing: false }), s.at + 10000), 62000);
  assert.equal(C.isLive(s, s.at + 59000), true);
  assert.equal(C.isLive(s, s.at + 61000), false);
  assert.equal(C.offer(s, 'web-me', s.at + 1000, { playing: false, currentId: null }, 0), s);
  assert.equal(C.offer(s, s.deviceId, s.at + 1000, {}, 0), null);
  assert.equal(C.offer(s, 'web-me', s.at + C.OFFER_FOR_MS, {}, 0), null);
  assert.equal(C.offer(s, 'web-me', s.at + 1000, { playing: true }, 0), null);
  assert.equal(C.offer(s, 'web-me', s.at + 1000, { currentId: 'yt:kvDemoSun01' }, 0), null);
  assert.equal(C.offer(s, 'web-me', s.at + 1000, {}, s.at), null);

  const queue = Array.from({ length: 80 }, (_, i) => ({ id: i === 3 ? 'local:9' : 'yt:kvTest' + String(i).padStart(4, '0'), title: 'T' + i, artist: '', album: '', durationMs: 0 }));
  const doc = C.encodeNowPlaying({ queue, index: 60, playing: true, positionMs: 1234.6, at: 99, deviceId: 'web-x', deviceName: 'Web · Safari · iPhone' });
  assert.equal(doc.queue.length, 50);
  assert.equal(doc.queue[doc.index].title, 'T60');
  // 79 playable titles: the window is clamped to the end (from = min(at - 5, size - 50)), as in NowPlayingDoc.window.
  assert.equal(doc.index, 30);
  assert.equal(doc.position_ms, 1234);
  assert.ok(!doc.queue.some((t) => t.id.startsWith('local:')));
  assert.deepEqual(Object.keys(doc).sort(), ['at', 'device_id', 'device_name', 'index', 'playing', 'position_ms', 'queue']);
  const back = C.decodeNowPlaying(JSON.parse(JSON.stringify(doc)));
  assert.equal(back.queue[back.index].title, 'T60');
  const end = C.encodeNowPlaying({ queue, index: 79, playing: false, positionMs: 0, at: 1, deviceId: 'web-x', deviceName: 'n' });
  assert.equal(end.queue[end.index].title, 'T79');
  assert.equal(C.encodeNowPlaying({ queue: [{ id: 'local:1', title: 'x' }], index: 0, at: 1 }), null);
});

test('a name for the browser, at most 40 characters', () => {
  assert.equal(C.deviceName('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'), 'Web · Safari · iPhone');
  assert.equal(C.deviceName('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36'), 'Web · Chrome · Windows');
  assert.equal(C.deviceName('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15', 'MacIntel', true), 'Web · Safari · iPad');
  assert.ok(C.deviceName('x'.repeat(80)).length <= 40);
});

test('LRC: timed lines, credits dropped, LRCLIB\'s closest answer picked', () => {
  const lines = C.parseLrc('[00:01.5]a\n[00:00.20]<00:00.20>Word <00:00.50>tags\n[01:02.345]b\n[00:03.00]Paroles : X\n[01:02.345]b\nnot a line');
  assert.deepEqual(lines, [{ timeMs: 200, text: 'Word tags' }, { timeMs: 1500, text: 'a' }, { timeMs: 62345, text: 'b' }]);
  assert.equal(C.activeLine(lines, 0), -1);
  assert.equal(C.activeLine(lines, 1500), 1);
  assert.equal(C.activeLine(lines, 999999), 2);
  const track = { title: 'Sunset on Ocean Drive', artist: 'Vice FM', durationMs: 214000 };
  const pick = C.pickLyrics(fixture.lrclib, track);
  assert.equal(pick.synced, true);
  assert.ok(pick.lines.length >= 10);
  assert.ok(!pick.lines.some((l) => /^Paroles/.test(l.text)));
  assert.equal(C.pickLyrics([{ trackName: 'Other', artistName: 'Vice FM', syncedLyrics: '[00:01.00]x' }], track), null);
  assert.deepEqual(C.lyricQueries({ title: 'Song - Remix', artist: 'A' }), ['Song - Remix A', 'Song - Remix', 'Song A']);
});

test('PKCE challenge (RFC 7636, appendix B) and JWT claims', async () => {
  assert.equal(await C.pkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk', globalThis.crypto.subtle), 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  const v = C.newVerifier((b) => globalThis.crypto.getRandomValues(b));
  assert.match(v, /^[A-Za-z0-9_-]{64}$/);
  const payload = Buffer.from(JSON.stringify({ iat: 1795000000, sub: 'é' })).toString('base64url');
  assert.deepEqual(C.jwtClaims('h.' + payload + '.s'), { iat: 1795000000, sub: 'é' });
  assert.equal(C.jwtClaims('nope'), null);
});

test('search folds accents and case', () => {
  assert.equal(C.matches({ title: 'Colisée', artist: 'Werenoi' }, 'colisee wer'), true);
  assert.equal(C.matches({ title: 'Colisée', artist: 'Werenoi' }, 'chicago'), false);
  assert.equal(C.clock(3723000), '1:02:03');
  assert.equal(C.clock(65000), '1:05');
});
