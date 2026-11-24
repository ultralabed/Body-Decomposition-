// Step 2 of the pipeline: merge the hand-written content files in
// data/src/*.json into one file the viewer loads: data/anatomy.json
//
//   node 02-build-data.mjs
//
// Output shape:
//   { parts: [ { id, en, key, side } ],          one entry per 3D mesh
//     info:  { [key]: { zh, sys, region, ... } } one entry per structure
//   }
// "key" is the English name without left/right, so both sides share text.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'data', 'src');
const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));

const names = readJson(path.join(src, 'bp3d-names.json'));
const canon = (n) => n.replace(/\b(left|right)\b/g, '').replace(/\s+/g, ' ').trim();

const REGIONS = ['head', 'neck', 'chest', 'abdomen', 'back', 'pelvis', 'shoulder', 'arm', 'forearm', 'hand', 'hip', 'thigh', 'leg', 'foot'];
const SYSTEMS = ['bone', 'joint', 'organ', 'vessel', 'nerve', 'skin'];

const info = {};
const problems = [];
for (const f of fs.readdirSync(src).sort()) {
  const m = /^(muscles|other)-\d+\.json$/.exec(f);
  if (!m) continue;
  const data = readJson(path.join(src, f));
  for (const [key, raw] of Object.entries(data)) {
    const e = { ...raw };
    if (m[1] === 'muscles') {
      e.sys = e.type === 'tendon' ? 'tendon' : 'muscle';
      delete e.type;
      if (![1, 2, 3].includes(e.layer)) { problems.push(`${key}: bad layer`); e.layer = 2; }
      for (const k of ['ob', 'ib']) if (!Array.isArray(e[k])) e[k] = [];
    } else if (!SYSTEMS.includes(e.sys)) {
      problems.push(`${key}: bad sys ${e.sys}`); e.sys = 'organ';
    }
    if (!REGIONS.includes(e.region)) { problems.push(`${key}: bad region ${e.region}`); e.region = 'chest'; }
    if (!e.zh) problems.push(`${key}: no zh`);
    for (const k of Object.keys(e)) if (e[k] === '' || (Array.isArray(e[k]) && !e[k].length)) delete e[k];
    info[key] = e;
  }
}

// Placeholder used only when a structure has no hand-written content yet.
const fallback = (key) => ({ zh: key, sys: 'organ', region: 'chest' });

const parts = [];
for (const [id, en] of Object.entries(names)) {
  const key = canon(en);
  const side = /\bright\b/.test(en) ? 'R' : /\bleft\b/.test(en) ? 'L' : '';
  if (!info[key]) {
    problems.push(`${key}: missing content`);
    info[key] = fallback(key);
  }
  parts.push({ id, en, key, side });
}
for (const key of Object.keys(info)) {
  if (!parts.some((p) => p.key === key)) { problems.push(`${key}: content without mesh`); delete info[key]; }
}

fs.writeFileSync(path.join(root, 'data', 'anatomy.json'), JSON.stringify({ parts, info }));
const count = {};
for (const p of parts) count[info[p.key].sys] = (count[info[p.key].sys] || 0) + 1;
console.log(`${parts.length} meshes, ${Object.keys(info).length} structures`, count);
if (problems.length) console.log(`${problems.length} problems:\n  ` + problems.slice(0, 40).join('\n  '));
