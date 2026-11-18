// The catalogue proxy's mapping (ketvoice-api /catalog/*), run on hand-written InnerTube answers.
// The mapping lives in the Edge Function itself (Ketvoice repository, supabase/functions/ketvoice-api/index.ts,
// between « >>> catalog mapping » and « <<< catalog mapping »): this test reads that part, strips its
// TypeScript types with Node's own stripTypeScriptTypes and runs it, so the code tested is the code deployed.
// Set KETVOICE_API_TS to the file's path when the two repositories are not side by side (skipped otherwise).
// Run: node tests/catalog-mapping.test.cjs
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const F = require(path.join(__dirname, 'fixtures/innertube.cjs'));

const SOURCE = process.env.KETVOICE_API_TS || path.join(__dirname, '../../Ketvoice/supabase/functions/ketvoice-api/index.ts');
const available = fs.existsSync(SOURCE);

function load() {
  const text = fs.readFileSync(SOURCE, 'utf8');
  const from = text.indexOf('// >>> catalog mapping'), to = text.indexOf('// <<< catalog mapping');
  assert.ok(from > 0 && to > from, 'the mapping markers are in index.ts');
  const { stripTypeScriptTypes } = require('node:module');
  const js = stripTypeScriptTypes(text.slice(from, to));
  const names = ['ytSongs', 'ytRows', 'ytSearchArtists', 'ytSearchAlbums', 'ytAlbumsOfSongs', 'ytArtistPage', 'ytAlbumPage',
    'ytRadio', 'ytQuery', 'ytCleanVideoTitle', 'ytText', 'ytImage', 'YT_CHANNEL', 'YT_ALBUM', 'YT_VIDEO'];
  // Only plain JavaScript built-ins reach it: no fetch, no Deno, no network.
  const sandbox = vm.createContext({});
  return vm.runInContext('(function(){' + js + '\nreturn {' + names.join(',') + '};})()', sandbox);
}
const M = available ? load() : null;
const opts = { skip: available ? false : 'index.ts not found (set KETVOICE_API_TS)' };
const plain = (v) => JSON.parse(JSON.stringify(v));

test('songs: album versions only, variants and mismatched rows dropped, menu fallback, explicit badge', opts, () => {
  const songs = plain(M.ytSongs(F.searchSongs, 'one more time'));
  assert.deepEqual(songs.map((t) => t.videoId), ['kvTestOMT01', 'kvTestDaF01', 'kvTestDLv01']);
  assert.deepEqual(songs[0], { id: 'yt:kvTestOMT01', videoId: 'kvTestOMT01', title: 'One More Time', artist: 'Daft Punk', album: 'Discovery',
    durationMs: 320000, youtubeCatalogVerified: true, coverUrl: 'https://lh3.googleusercontent.com/kvtest-kvTestOMT01=w120-h120',
    albumId: F.DISCOVERY, artistId: F.DAFT });
  // Plain text « Daft Punk • Homework • 5:28 »: artist and album from the row's menu, duration from the text.
  assert.equal(songs[1].artist, 'Daft Punk'); assert.equal(songs[1].album, 'Homework'); assert.equal(songs[1].albumId, F.HOMEWORK);
  assert.equal(songs[1].durationMs, 328000);
  assert.equal(songs[2].explicit, true);
  // A variant is kept when the listener asked for it.
  assert.ok(M.ytSongs(F.searchSongs, 'one more time nightcore').some((t) => t.videoId === 'kvTestOMT02'));
});

test('search artists: artist rows and the top card, profiles left out, no duplicates', opts, () => {
  assert.deepEqual(plain(M.ytSearchArtists(F.searchArtists)), [
    { id: F.DAFT, name: 'Daft Punk', photo: 'https://lh3.googleusercontent.com/kvtest-daft=w544-h544' },
    { id: F.JUSTICE, name: 'Justice' }
  ]);
  assert.deepEqual(plain(M.ytSearchArtists(F.searchPlain)).map((a) => a.id), [F.DAFT]);
});

test('search albums and the unfiltered fallback rows', opts, () => {
  assert.deepEqual(plain(M.ytSearchAlbums(F.searchPlain)), [
    { id: F.DISCOVERY, title: 'Discovery', artist: 'Daft Punk', type: 'Album', artistId: F.DAFT, year: '2001', cover: 'https://lh3.googleusercontent.com/kvtest-discovery=w226-h226' },
    { id: 'MPREkvTestGetLucky01', title: 'Get Lucky', artist: 'Daft Punk', type: 'Single', artistId: F.DAFT, year: '2013' }
  ]);
  // No song row in the unfiltered answer: the official video is what the fallback keeps, the podcast is not.
  assert.deepEqual(M.ytSongs(F.searchPlain, 'daft punk').length, 0);
  assert.deepEqual(plain(M.ytRows(F.searchPlain, { officialOnly: true })).map((t) => t.videoId), ['kvTestOMTv1']);
  // Albums named by the songs, when the search listed none.
  assert.deepEqual(plain(M.ytAlbumsOfSongs(M.ytSongs(F.searchSongs, ''))).map((a) => a.id), [F.DISCOVERY, F.HOMEWORK]);
});

test('artist page: portrait photo, listeners, titles, albums apart from singles and EPs, close artists without itself', opts, () => {
  const page = plain(M.ytArtistPage(F.artistFull, F.DAFT));
  assert.deepEqual(page.artist, { id: F.DAFT, name: 'Daft Punk', photo: 'https://lh3.googleusercontent.com/kvtest-daft-square=w540-h540', listeners: '12,3 M auditeurs mensuels' });
  assert.equal(page.description, 'Duo français de musique électronique.');
  assert.deepEqual(page.tracks.map((t) => [t.videoId, t.artist]), [['kvTestGLk01', 'Daft Punk, Pharrell Williams'], ['kvTestATW01', 'Daft Punk']]);
  assert.equal(page.tracks[0].album, 'Random Access Memories');
  assert.deepEqual(page.albums.map((a) => [a.id, a.type, a.year]), [[F.DISCOVERY, 'Album', '2001'], [F.HOMEWORK, 'Album', '1997']]);
  assert.deepEqual(page.singles.map((a) => [a.title, a.type]), [['Get Lucky', 'Single'], ['Random Remixes', 'EP']]);
  assert.deepEqual(page.related, [{ id: F.JUSTICE, name: 'Justice', photo: 'https://lh3.googleusercontent.com/kvtest-justice=w544-h544' }]);
});

test('artist page with videos only: official videos become its titles, cleaned; fan uploads and playlists are not', opts, () => {
  const page = plain(M.ytArtistPage(F.artistVideosOnly, F.DAFT));
  assert.equal(page.artist.listeners, '7,22 M');
  assert.equal(page.artist.photo, 'https://lh3.googleusercontent.com/kvtest-daft-wide=w1440-h600');
  assert.deepEqual(page.tracks.map((t) => [t.videoId, t.title, t.artist, t.artistId]), [['kvTestOMTv1', 'One More Time', 'Daft Punk', F.DAFT]]);
  assert.deepEqual([page.albums, page.singles, page.related], [[], [], []]);
  assert.equal(M.ytArtistPage({ contents: {} }, F.DAFT), null);
});

test('album page: header, artist link, year, the album cover on rows without their own, rows without a video skipped', opts, () => {
  const page = plain(M.ytAlbumPage(F.album, F.DISCOVERY));
  assert.deepEqual(page.album, { id: F.DISCOVERY, title: 'Discovery', artist: 'Daft Punk', artistId: F.DAFT, type: 'Album', year: '2001',
    cover: 'https://lh3.googleusercontent.com/kvtest-discovery=w544-h544' });
  assert.deepEqual(page.tracks.map((t) => [t.title, t.durationMs, t.album, t.albumId, t.artist]), [
    ['One More Time', 320000, 'Discovery', F.DISCOVERY, 'Daft Punk'], ['Aerodynamic', 207000, 'Discovery', F.DISCOVERY, 'Daft Punk'],
    ['Digital Love', 298000, 'Discovery', F.DISCOVERY, 'Daft Punk']]);
  assert.ok(page.tracks.every((t) => t.coverUrl === page.album.cover));
  assert.equal(M.ytAlbumPage({}, F.DISCOVERY), null);
});

test('radio: the seed first, podcasts and repeats out, official video titles cleaned', opts, () => {
  const tracks = plain(M.ytRadio(F.next, 'kvTestOMT01'));
  assert.deepEqual(tracks.map((t) => [t.videoId, t.title, t.artist]), [
    ['kvTestOMT01', 'One More Time', 'Daft Punk'], ['kvTestVQo01', 'Veridis Quo', 'Daft Punk'], ['kvTestJus01', 'D.A.N.C.E.', 'Justice']]);
  assert.equal(tracks[0].albumId, F.DISCOVERY);
  assert.equal(tracks[1].durationMs, 407000);
  assert.equal(tracks[1].artistId, undefined, 'a user channel is not an artist page');
});

test('ids and queries are validated before anything is asked', opts, () => {
  assert.ok(M.YT_CHANNEL.test(F.DAFT)); assert.ok(!M.YT_CHANNEL.test('UC/../../x')); assert.ok(!M.YT_CHANNEL.test('probe'));
  assert.ok(M.YT_ALBUM.test(F.DISCOVERY)); assert.ok(!M.YT_ALBUM.test('VLPLxyz12345'));
  assert.ok(M.YT_VIDEO.test('kvTestOMT01')); assert.ok(!M.YT_VIDEO.test('kvTestOMT01x')); assert.ok(!M.YT_VIDEO.test('kvTest/MT01'));
  assert.equal(M.ytQuery(' daft\u0000  punk '), 'daft punk');
  assert.equal(M.ytQuery('a'), null); assert.equal(M.ytQuery('x'.repeat(101)), null); assert.equal(M.ytQuery(null), null);
  assert.equal(M.ytCleanVideoTitle('Justice - D.A.N.C.E. [Official Music Video]', 'Justice'), 'D.A.N.C.E.');
  assert.equal(M.ytCleanVideoTitle('Live (Remastered 2012)', 'X'), 'Live (Remastered 2012)');
});
