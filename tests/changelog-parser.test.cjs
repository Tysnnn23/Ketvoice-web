const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');

// The same file the page loads (js/changelog-data.js), not a copy.
const K = require(path.join(__dirname, '../js/changelog-data.js'));
const saved = require(path.join(__dirname, '../data/releases.json'));

const asset = (name, extra = {}) => ({ name, browser_download_url: `https://example.invalid/${name}`, size: 1048576 * 40, download_count: 3, ...extra });

test('headings become sections, bullets their points, wrapped lines continue a point', () => {
  const notes = K.parseNotes([
    '# Ketvoice 6.1.0',
    '',
    '![Ketvoice](https://raw.githubusercontent.com/Tysnnn23/Ketvoice/main/ketvoice-banner.png)',
    '',
    'Listen together with *Ketogether*.',
    '',
    '## ✨ Ketogether',
    '',
    '- **Listen together**: share a [code](https://example.invalid) or `QR`',
    '  code, and everyone hears the same song.',
    '- Reactions',
    '  - and a live pill',
    '',
    '### Lyrics',
    '1. On the lock screen',
    '',
    '## Install',
    '- Download `Ketvoice-6.1.0.apk`',
    '## Validation',
    '- 1200 tests'
  ].join('\n'));
  assert.equal(notes.title, 'Ketvoice 6.1.0');
  assert.equal(notes.intro, 'Listen together with Ketogether.');
  assert.deepEqual(notes.sections.map(s => s.title), ['Ketogether', 'Lyrics']);
  assert.deepEqual(notes.sections[0].points, [
    '**Listen together**: share a code or QR code, and everyone hears the same song.',
    'Reactions — and a live pill'
  ]);
  assert.deepEqual(notes.sections[1].points, ['On the lock screen']);
  assert.equal(notes.images.length, 1);
});

test('HTML headings, tables, rules and build metadata are not shown as notes', () => {
  const notes = K.parseNotes('<h1 align="center">🗄️ Ketvoice 1.0.0 &mdash; Legacy</h1>\n<p>**Android 12+ · versionCode 1**</p>\n\n| a | b |\n|---|---|\n---\n## ⚠️ IMPORTANT NOTES\n- Legacy &amp; unsupported');
  assert.match(notes.title, /^Ketvoice 1\.0\.0/);
  assert.equal(notes.intro, '');
  assert.deepEqual(notes.sections, [{ title: 'Important notes', points: ['Legacy & unsupported'] }]);
});

test('channels: GitHub pre-releases and beta tags are beta, non-version tags are other', () => {
  assert.equal(K.channel({ tag_name: 'v6.1.2', prerelease: false }), 'stable');
  assert.equal(K.channel({ tag_name: 'v6.0.0-beta.5', prerelease: false }), 'beta');
  assert.equal(K.channel({ tag_name: 'v3.0.0-Beta1', prerelease: true }), 'beta');
  assert.equal(K.channel({ tag_name: 'v3.0.7-ios-alpha.1', prerelease: true }), 'beta');
  assert.equal(K.channel({ tag_name: 'ketmix-stems-v2', prerelease: true }), 'other');
  assert.equal(K.version({ tag_name: 'v6.0.0-beta.5' }), '6.0.0 Beta 5');
  assert.equal(K.version({ tag_name: 'v3.0.0-Beta4' }), '3.0.0 Beta 4');
});

test('feature tags come from headings and bold lead-ins', () => {
  const e = K.toEntry({ tag_name: 'v6.1.0', name: 'Ketvoice 6.1.0', body: '## Ketogether\n- x\n## Ketmix\n- y\n## Vice City edition\n- z\n## Fixes\n- **Lyrics on the lock screen** now wrap', assets: [] });
  assert.deepEqual(e.tags, ['ketogether', 'ketmix', 'lyrics', 'vice-city', 'fixes']);
});

test('downloads: one button per edition, CI rebuilds hidden behind versioned APKs, non-APKs left out', () => {
  const dl = K.downloads({ assets: ['SHA256SUMS.txt', 'app-mobile-release.apk', 'app-quest-release.apk', 'Ketvoice-4.4.0-Quest.apk', 'Ketvoice-4.4.0.apk', 'Ketvoice-4.4.0-Lite.apk', 'Ketvoice-4.4.0-Wear.apk'].map(n => asset(n)) });
  assert.deepEqual(dl.map(d => d.label), ['Android', 'Lite', 'Quest', 'Wear OS']);
  assert.equal(dl[0].url, 'https://example.invalid/Ketvoice-4.4.0.apk');
  assert.deepEqual(K.downloads({ assets: [asset('app-mobile-release.apk')] }).map(d => d.label), ['Android']);
});

test('media: banner and screenshots, without the same file twice', () => {
  const r = {
    body: '![Ketvoice](https://github.com/Tysnnn23/Ketvoice/releases/download/v2.8.0/ketvoice-banner.png)\n![Player](https://github.com/Tysnnn23/Ketvoice/releases/download/v2.8.0/phone-player.png)',
    assets: [asset('ketvoice-banner.png'), asset('phone-player.png'), asset('phone-equalizer.png'), asset('Ketvoice-2.8.0.apk')]
  };
  const m = K.media(r, K.parseNotes(r.body));
  assert.equal(m.banner.name, 'ketvoice-banner.png');
  assert.equal(m.banner.canonical, false);
  assert.deepEqual(m.shots.map(s => s.name), ['phone-player.png', 'phone-equalizer.png']);
  const c = K.media({ body: '![K](https://raw.githubusercontent.com/Tysnnn23/Ketvoice/main/ketvoice-banner.png)', assets: [] }, K.parseNotes('![K](https://raw.githubusercontent.com/Tysnnn23/Ketvoice/main/ketvoice-banner.png)'));
  assert.equal(c.banner.canonical, true);
});

test('filters: channel, feature and every search word', () => {
  const entries = K.normalize([
    { tag_name: 'v6.1.0', published_at: '2026-11-17T10:00:00Z', body: '## Ketogether\n- Listen together by QR code', assets: [] },
    { tag_name: 'v6.0.0-beta.5', published_at: '2026-11-16T10:00:00Z', body: '## Android Auto\n- Voice search in the car', assets: [] },
    { tag_name: 'v5.0.0', draft: true, published_at: '2026-11-18T10:00:00Z', body: '', assets: [] }
  ]);
  assert.deepEqual(entries.map(e => e.tag), ['v6.1.0', 'v6.0.0-beta.5']);
  assert.deepEqual(K.filter(entries, { channel: 'beta' }).map(e => e.tag), ['v6.0.0-beta.5']);
  assert.deepEqual(K.filter(entries, { tag: 'ketogether' }).map(e => e.tag), ['v6.1.0']);
  assert.deepEqual(K.filter(entries, { query: 'QR together' }).map(e => e.tag), ['v6.1.0']);
  assert.deepEqual(K.filter(entries, { query: 'qr car' }), []);
});

test('the saved copy in data/releases.json parses into cards for every release', () => {
  const entries = K.normalize(saved.releases);
  assert.ok(entries.length >= 100, `only ${entries.length} releases in the saved copy`);
  const latest = entries.find(e => e.channel === 'stable');
  assert.ok(latest.downloads.some(d => d.label === 'Android'));
  for (const e of entries) {
    assert.ok(e.version && e.date, e.tag);
    for (const s of e.sections) for (const p of s.points) assert.doesNotMatch(p, /<[a-z][^>]*>|\]\(http/i, e.tag);
  }
  // Install and validation sections never reach a card.
  assert.ok(entries.every(e => e.sections.every(s => !/^(install|validation)/i.test(s.title))));
});
