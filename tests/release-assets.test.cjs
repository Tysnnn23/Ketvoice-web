const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Exercise the actual no-bundler site's selector, not a duplicate implementation.
const source = fs.readFileSync(path.join(__dirname, '../js/main.js'), 'utf8');
const selector = source.match(/const apkUrl=([^\n]+)/)[1].replace(/;$/, '');
const apkUrl = vm.runInNewContext(`(${selector})`);
const asset = name => ({ name, browser_download_url: `https://example.invalid/${name}` });
const url = name => `https://example.invalid/${name}`;

test('versioned release payload wins over generic CI rebuilds for both flavors', () => {
  const assets = ['app-mobile-release.apk', 'app-quest-release.apk', 'Ketvoice-4.4.0.apk', 'Ketvoice-4.4.0-Quest.apk'].map(asset);
  assert.equal(apkUrl(assets, false), url('Ketvoice-4.4.0.apk'));
  assert.equal(apkUrl(assets, true), url('Ketvoice-4.4.0-Quest.apk'));
  assert.equal(apkUrl(assets, 'mobile'), url('Ketvoice-4.4.0.apk'));
  assert.equal(apkUrl(assets, 'quest'), url('Ketvoice-4.4.0-Quest.apk'));
});

test('legacy generic assets still work and non-APK payloads are excluded', () => {
  const assets = ['validation.json', 'SHA256SUMS.txt', 'app-mobile-release.apk', 'app-quest-release.apk'].map(asset);
  assert.equal(apkUrl(assets, false), url('app-mobile-release.apk'));
  assert.equal(apkUrl(assets, true), url('app-quest-release.apk'));
  assert.equal(apkUrl([], false), undefined);
  assert.equal(apkUrl(null, true), undefined);
});

test('Lite and Wear assets get their own buttons and never replace the mobile APK', () => {
  const assets = ['Ketvoice-6.1.0-Lite.apk', 'Ketvoice-6.1.0-Wear.apk', 'Ketvoice-6.1.0-Quest.apk', 'Ketvoice-6.1.0.apk',
    'RELEASE-NOTES.md', 'SHA256SUMS.txt', 'validation.json'].map(asset);
  assert.equal(apkUrl(assets, 'mobile'), url('Ketvoice-6.1.0.apk'));
  assert.equal(apkUrl(assets, false), url('Ketvoice-6.1.0.apk'));
  assert.equal(apkUrl(assets, 'quest'), url('Ketvoice-6.1.0-Quest.apk'));
  assert.equal(apkUrl(assets, 'lite'), url('Ketvoice-6.1.0-Lite.apk'));
  assert.equal(apkUrl(assets, 'wear'), url('Ketvoice-6.1.0-Wear.apk'));
  assert.equal(apkUrl(assets, 'Lite'), url('Ketvoice-6.1.0-Lite.apk'));
});

test('Lite and Wear are absent (hidden) when the release does not carry them', () => {
  const assets = ['Ketvoice-6.0.0-beta.5-Quest.apk', 'Ketvoice-6.0.0-beta.5.apk', 'RELEASE-NOTES.md'].map(asset);
  assert.equal(apkUrl(assets, 'lite'), undefined);
  assert.equal(apkUrl(assets, 'wear'), undefined);
  assert.equal(apkUrl(assets, 'mobile'), url('Ketvoice-6.0.0-beta.5.apk'));
});

test('edition names are matched as words, case-insensitively, including generic CI names', () => {
  const assets = ['app-lite-release.apk', 'app-wear-release.apk', 'app-mobile-release.apk', 'ketvoice-6.1.0-LITE.APK'].map(asset);
  assert.equal(apkUrl(assets, 'lite'), url('ketvoice-6.1.0-LITE.APK'));
  assert.equal(apkUrl(assets, 'wear'), url('app-wear-release.apk'));
  assert.equal(apkUrl(assets, 'mobile'), url('app-mobile-release.apk'));
  // "lite" inside another word is not the Lite edition.
  assert.equal(apkUrl([asset('Ketvoice-6.1.0-satellite.apk')], 'lite'), undefined);
  assert.equal(apkUrl([asset('Ketvoice-6.1.0-satellite.apk')], 'mobile'), url('Ketvoice-6.1.0-satellite.apk'));
});

test('a Ketvoice TV APK is never taken for the phone, Quest or Lite APK', () => {
  const assets = ['Ketvoice-TV-1.0.0.apk', 'SHA256SUMS.txt'].map(asset);
  for (const edition of ['mobile', 'quest', 'lite', 'wear', false, true]) assert.equal(apkUrl(assets, edition), undefined);
  assert.equal(apkUrl(assets, 'tv'), url('Ketvoice-TV-1.0.0.apk'));
  // "tv" inside another word is not the TV edition.
  assert.equal(apkUrl([asset('Ketvoice-9.1.1-tvos.apk')], 'mobile'), url('Ketvoice-9.1.1-tvos.apk'));
});

test('the Android TV entries link the tv-v release asset directly', () => {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const tv = 'https://github.com/Tysnnn23/Ketvoice/releases/download/tv-v1.1.0/Ketvoice-TV-1.1.0.apk';
  assert.match(html, /<div class="download-row" id="tv-row">/);
  assert.ok(html.includes(`href="${tv}" id="tv-apk"`));
  assert.ok(html.includes(`<a data-tv="tv" href="${tv}" role="menuitem">Android TV <small>and Google TV</small></a>`));
  // Static links: the latest-release updater ([data-apk]) never rewrites them.
  assert.doesNotMatch(html, /data-apk="tv"/);
});

test('the page has a hidden-by-default row and button for each optional edition', () => {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  for (const edition of ['lite', 'wear']) {
    assert.match(html, new RegExp(`<div class="download-row" id="${edition}-row" hidden>`));
    assert.match(html, new RegExp(`id="${edition}-apk"`));
  }
  for (const id of ['android-apk', 'quest-apk', 'release-version', 'release-notes', 'stat-downloads', 'stat-listeners', 'downloads-caption', 'listeners-caption', 'now-playing']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
});
