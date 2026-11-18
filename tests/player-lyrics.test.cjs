// The web player's word-by-word lyrics (js/player/lyrics.js, core.parseLrc): Apple-style TTML with words,
// syllables and background vocals, enhanced LRC (`<mm:ss.xx>`), NetEase's YRC, LiriQo's answer, the words laid
// back on the line, the missing ends filled in, the instrumental passages, the fill and the glow of a word, and the
// choice between sources (the best timing wins; a function without /catalog/lyrics is asked once).
// Recorded shapes, a fake fetch: no live call. Run: node tests/player-lyrics.test.cjs
const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');
const C = require(path.join(__dirname, '../js/player/core.js'));
const L = require(path.join(__dirname, '../js/player/lyrics.js'));

const TTML = `<tt xmlns="http://www.w3.org/ns/ttml" xmlns:itunes="http://music.apple.com/lyric-ttml-internal" xmlns:ttm="http://www.w3.org/ns/ttml#metadata" itunes:timing="Word" xml:lang="en">
<head><metadata><ttm:agent type="person" xml:id="v1"/><iTunesMetadata xmlns="http://music.apple.com/lyric-ttml-internal"><translations><translation type="subtitle" xml:lang="fr"><text for="L1">Néon sur l'eau</text></translation></translations></iTunesMetadata></metadata></head>
<body dur="3:34.000"><div begin="9.500" end="40.000" itunes:songPart="Verse">
<p begin="9.500" end="12.100" itunes:key="L1" ttm:agent="v1"><span begin="9.500" end="9.900">Ne</span><span begin="9.900" end="10.300">on</span> <span begin="10.300" end="10.600">on</span> <span begin="10.600" end="10.900">the</span> <span begin="10.900" end="12.100">wa</span><span begin="12.100" end="12.100">ter</span></p>
<p begin="12.400" end="16.000" itunes:key="L2" ttm:agent="v1"><span begin="12.400" end="12.900">Rock</span> <span begin="12.900" end="13.400">&amp;</span> <span begin="13.400" end="14.900">roll</span> <span ttm:role="x-bg" begin="15.000" end="16.000"><span begin="15.000" end="15.400">(oh</span> <span begin="15.400" end="16.000">yeah)</span></span><span ttm:role="x-translation" xml:lang="fr">Rock et roll</span></p>
<p begin="0:00:30.000" end="33s">No words here</p>
</div></body></tt>`;

test('TTML: words, syllables, background vocals, translations left out, a DTD refused', () => {
  const lines = L.parseTtml(TTML);
  assert.deepEqual(lines.map((l) => [l.timeMs, l.text]), [[9500, 'Neon on the water'], [12400, 'Rock & roll (oh yeah)'], [30000, 'No words here']]);
  assert.deepEqual(lines[0].words.map((w) => [w.startMs, w.endMs, w.text]),
    [[9500, 9900, 'Ne'], [9900, 10300, 'on '], [10300, 10600, 'on '], [10600, 10900, 'the '], [10900, 12100, 'wa'], [12100, 12400, 'ter']]);
  assert.equal(lines[0].syllable, true);
  assert.equal(lines[0].endMs, 12100);
  assert.equal(lines[0].words.map((w) => w.text).join(''), lines[0].text);
  assert.deepEqual(lines[1].words.map((w) => [w.text, !!w.bg]), [['Rock ', false], ['& ', false], ['roll ', false], ['(oh ', true], ['yeah)', true]]);
  assert.equal(lines[2].words, undefined);
  assert.equal(lines[2].endMs, 33000);
  assert.equal(L.rank(lines), 3);
  assert.deepEqual(L.parseTtml('<!DOCTYPE tt [<!ENTITY x "y">]><tt><body><p begin="1s">a</p></body></tt>'), []);
  assert.deepEqual(L.parseTtml('not xml'), []);
  assert.deepEqual([L.timeMs('12.5s'), L.timeMs('1500ms'), L.timeMs('1:02.345'), L.timeMs('0:01:02.345'), L.timeMs(''), L.timeMs('x')], [12500, 1500, 62345, 62345, null, null]);
});

test('enhanced LRC: the word tags become words, a time alone ends the line, plain LRC as before', () => {
  const lrc = '[00:01.00]<00:01.00>Hel<00:01.40>lo <00:02.00>world<00:03.50>\n[00:04.00]\n[00:12.00]A line\n[00:13.00]Paroles : X\n[00:14.00]<00:14.00>(ooh) <00:14.50>right';
  assert.deepEqual(C.parseLrc(lrc).map((l) => [l.timeMs, l.text, l.words]), [[1000, 'Hello world', undefined], [12000, 'A line', undefined], [14000, '(ooh) right', undefined]]);
  const lines = L.finish(C.parseLrc(lrc, true));
  assert.deepEqual(lines[0].words, [{ startMs: 1000, endMs: 1400, text: 'Hel' }, { startMs: 1400, endMs: 2000, text: 'lo ' }, { startMs: 2000, endMs: 3500, text: 'world' }]);
  assert.equal(lines[0].endMs, 4000);
  assert.equal(lines[1].words, undefined);
  assert.deepEqual(lines[2].words.map((w) => [w.text, !!w.bg, w.endMs > w.startMs]), [['(ooh) ', true, true], ['right', false, true]]);
  assert.equal(L.rank(lines), 2);
  assert.deepEqual(L.interludes(lines), [{ after: 0, fromMs: 4000, toMs: 12000 }]);
});

test('YRC and LiriQo: word times kept, guessed ones refused, another title refused', () => {
  const yrc = L.parseYrc('[1000,2500](1000,400,0)Bon(1400,600,0)jour (2000,1500,0)toi\n[5000,1000](5000,1000,0)作词 : X\n{"t":0}');
  assert.deepEqual(yrc.map((l) => [l.timeMs, l.endMs, l.text, l.words.length]), [[1000, 3500, 'Bonjour toi', 3]]);
  const answer = { metadata: { title: 'Sunset on Ocean Drive' }, tracks: [
    { provider: 'ytm_line', syncLevel: 'line', timed: [{ text: 'Neon on the water', start: 9500, end: 12000 }], plain: 'Neon on the water' },
    { provider: 'musixmatch_wordsync', ttml: TTML },
    { provider: 'apple_music_liriqo', upstreamProvider: 'Apple Music', syncLevel: 'syllable', ttml: TTML },
    { provider: 'spicylyrics', syncLevel: 'syllable', timed: [{ text: 'Neon lights', start: 100, end: 900, words: [{ text: 'Neon', start: 100, end: 500, syllables: [{ text: 'Ne', start: 100, end: 300 }, { text: 'on', start: 300, end: 500 }] }, { text: 'lights', start: 500, end: 900 }] }] }] };
  const best = L.pickLiriqo(answer, { title: 'Sunset on Ocean Drive (Official Video)' });
  assert.deepEqual([best.source, best.level, best.rank, best.synced, best.lines.length], ['LiriQo · Apple Music', 'syllable', 3, true, 3]);
  assert.equal(L.pickLiriqo(answer, { title: 'Another song' }), null);
  const timed = L.parseTimed(answer.tracks[3].timed, true, true);
  assert.deepEqual(timed[0].words.map((w) => w.text), ['Ne', 'on ', 'lights']);
  assert.equal(timed[0].syllable, true);
  assert.equal(L.parseTimed(answer.tracks[0].timed, false, false)[0].words, undefined);
});

test('words that do not spell the line are dropped; right to left and CJK lines keep their words', () => {
  assert.deepEqual(L.align('Hello world', [{ startMs: 0, endMs: 1, text: 'Hello' }, { startMs: 1, endMs: 2, text: 'there' }]), []);
  const odd = L.finish([{ timeMs: 0, text: 'Hello world', words: [{ startMs: 0, endMs: 1, text: 'Other' }] }]);
  assert.equal(odd[0].words, undefined);
  const ar = L.parseTtml('<tt><body><p begin="1s" end="3s"><span begin="1s" end="2s">مرحبا</span> <span begin="2s" end="3s">بالعالم</span></p><p begin="4s" end="6s"><span begin="4s" end="5s">你好</span><span begin="5s" end="6s">世界</span></p></body></tt>');
  assert.deepEqual(ar[0].words.map((w) => w.text), ['مرحبا ', 'بالعالم']);
  assert.equal(L.isRtl(ar[0].words[0].text), true);
  assert.deepEqual(ar[1].words.map((w) => w.text), ['你好', '世界']);
  assert.equal(L.isRtl(ar[1].text), false);
  assert.equal(L.isRtl('Hello'), false);
});

test('the fill of a word, the glow of a held note, the instrumental passages', () => {
  assert.deepEqual([L.progress(0, 100, 200), L.progress(150, 100, 200), L.progress(200, 100, 200), L.progress(150, 100, 100)], [0, .5, 1, 1]);
  assert.ok(L.progress(125, 100, 200) < .25 && L.progress(175, 100, 200) > .75);
  assert.equal(L.glow(.5, 600), 0);
  assert.equal(L.glow(1, 3000), 0);
  assert.ok(L.glow(.5, 3000) > .99 && L.glow(.5, 900) > .49 && L.glow(.5, 900) < .51);
  const lines = L.parseTtml(TTML);
  const gaps = L.interludes(lines);
  assert.deepEqual(gaps, [{ after: -1, fromMs: 0, toMs: 9500 }, { after: 1, fromMs: 16000, toMs: 30000 }]);
  assert.deepEqual([L.interludeAt(gaps, 0), L.interludeAt(gaps, 9400), L.interludeAt(gaps, 16100), L.interludeAt(gaps, 20000), L.interludeAt(gaps, 29900)], [0, -1, -1, 1, -1]);
  assert.deepEqual(L.interludes([{ timeMs: -1, text: 'plain' }]), []);
});

function fakeFetch(routes, calls) {
  return async (url) => {
    calls.push(url);
    const hit = routes.find((r) => url.startsWith(r[0]));
    const [status, body] = hit ? [hit[1], hit[2]] : [404, { error: 'Not found' }];
    return { status, ok: status >= 200 && status < 300, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) };
  };
}
const TRACK = { id: 'yt:kvTest00001', title: 'Sunset on Ocean Drive (Official Video)', artist: 'Vice FM, Guest', durationMs: 214000, isrc: 'FR-ABC-23-00001' };
const LRCLIB = { synced: true, lines: [{ timeMs: 9500, text: 'Neon on the water' }, { timeMs: 12400, text: 'Rock & roll' }] };

test('sources: the best timing wins, each better answer is heard, a function without the route is asked once', async () => {
  const calls = [], heard = [];
  const client = L.createLyrics({ anonKey: 'anon', now: () => 1000, lrclib: async () => LRCLIB, enabled: (id) => id !== 'lrc-red',
    fetch: fakeFetch([['https://api.liriqo-alfarrizi.my.id/', 200, { tracks: [{ provider: 'apple_music_liriqo', upstreamProvider: 'Apple Music', ttml: TTML }] }],
      [L.CATALOG.replace('ketvoice-catalog', 'ketvoice-content') + '/lyrics', 200, { source: 'Ketvoice API', versions: [] }]], calls) });
  const best = await client.find(TRACK, (r) => heard.push(r.level));
  assert.equal(best.level, 'syllable');
  assert.equal(best.source, 'LiriQo · Apple Music');
  assert.equal(heard[heard.length - 1], 'syllable');
  const liriqo = calls.find((u) => u.includes('liriqo'));
  assert.match(liriqo, /title=Sunset%20on%20Ocean%20Drive&artist=Vice%20FM&duration=214$/);
  assert.equal(calls.some((u) => u.includes('lrc.red')), false);
  assert.match(calls.find((u) => u.includes('/catalog/lyrics')), /\/ketvoice-catalog\/catalog\/lyrics\?title=Sunset%20on%20Ocean%20Drive&artist=Vice%20FM%2C%20Guest&durationMs=214000&isrc=FRABC2300001$/);
  // The same title again: nothing is asked. Another title: the missing route is not asked again for ten minutes.
  const before = calls.length;
  assert.equal(await client.find(TRACK), best);
  assert.equal(calls.length, before);
  await client.find({ title: 'Another', artist: 'Vice FM', durationMs: 1000 });
  assert.equal(calls.slice(before).some((u) => u.includes('/catalog/lyrics')), false);
});

test('sources: the route once deployed, lrc.red by ISRC, lines when nothing better, nothing at all', async () => {
  const calls = [];
  const routes = [[L.CATALOG + '/catalog/lyrics', 200, { lyrics: true, versions: [{ source: 'NetEase Cloud Music', format: 'yrc', content: '[9500,2500](9500,400,0)Ne(9900,600,0)on (10500,1500,0)lights\n[12400,900](12400,400,0)Rock (12800,500,0)on' },
    { source: 'x', format: 'exe', content: 'zz' }] }]];
  const viaRoute = await L.createLyrics({ anonKey: 'anon', lrclib: async () => LRCLIB, fetch: fakeFetch(routes, calls) }).find(TRACK);
  assert.deepEqual([viaRoute.source, viaRoute.level], ['NetEase Cloud Music', 'word']);
  const viaIsrc = await L.createLyrics({ anonKey: 'anon', lrclib: async () => null, fetch: fakeFetch([['https://lrc.red/s/FRABC2300001.ttml', 200, TTML]], calls) }).find(TRACK);
  assert.deepEqual([viaIsrc.source, viaIsrc.level], ['lrc.red', 'syllable']);
  const lineOnly = await L.createLyrics({ anonKey: 'anon', lrclib: async () => LRCLIB, fetch: async () => { throw new Error('offline'); } }).find(TRACK);
  assert.deepEqual([lineOnly.source, lineOnly.level, lineOnly.synced], ['LRCLIB', 'line', true]);
  const plain = await L.createLyrics({ anonKey: 'anon', lrclib: async () => ({ synced: false, lines: [{ timeMs: -1, text: 'Just text' }] }), fetch: fakeFetch([], calls) }).find(TRACK);
  assert.deepEqual([plain.level, plain.synced], ['plain', false]);
  assert.equal(await L.createLyrics({ anonKey: 'anon', lrclib: async () => null, fetch: fakeFetch([], calls) }).find(TRACK), null);
});
