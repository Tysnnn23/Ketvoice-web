#!/usr/bin/env node
/* Refreshes data/releases.json, the copy /changelog falls back on when the GitHub API is rate limited.
 *   gh api 'repos/Tysnnn23/Ketvoice/releases?per_page=100&page=1' > /tmp/p1.json   (and page=2, 3… until empty)
 *   node tools/update-releases-cache.cjs /tmp/p1.json /tmp/p2.json …
 * Only the fields the page reads are kept (js/changelog-data.js → slim). */
const fs = require('node:fs');
const path = require('node:path');
const { slim } = require('../js/changelog-data.js');
const files = process.argv.slice(2);
if (!files.length) { console.error('usage: node tools/update-releases-cache.cjs page1.json [page2.json …]'); process.exit(1); }
const all = files.flatMap(f => JSON.parse(fs.readFileSync(f, 'utf8')));
const out = { fetched_at: new Date().toISOString(), releases: slim(all) };
fs.writeFileSync(path.join(__dirname, '../data/releases.json'), JSON.stringify(out) + '\n');
console.log(`data/releases.json: ${out.releases.length} releases`);
