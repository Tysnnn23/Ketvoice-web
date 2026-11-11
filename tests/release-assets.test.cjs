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

test('versioned release payload wins over generic CI rebuilds for both flavors', () => {
  const assets = ['app-mobile-release.apk', 'app-quest-release.apk', 'Ketvoice-4.4.0.apk', 'Ketvoice-4.4.0-Quest.apk'].map(asset);
  assert.equal(apkUrl(assets, false), 'https://example.invalid/Ketvoice-4.4.0.apk');
  assert.equal(apkUrl(assets, true), 'https://example.invalid/Ketvoice-4.4.0-Quest.apk');
});

test('legacy generic assets still work and non-APK payloads are excluded', () => {
  const assets = ['validation.json', 'SHA256SUMS.txt', 'app-mobile-release.apk', 'app-quest-release.apk'].map(asset);
  assert.equal(apkUrl(assets, false), 'https://example.invalid/app-mobile-release.apk');
  assert.equal(apkUrl(assets, true), 'https://example.invalid/app-quest-release.apk');
  assert.equal(apkUrl([], false), undefined);
  assert.equal(apkUrl(null, true), undefined);
});
