// Step 2 of the pipeline: merge the hand-written content files in
// data/src/*.json into one file the viewer loads: data/anatomy.json
//
//   node 02-build-data.mjs
//
// Output:
//   data/anatomy.json  { parts: [ { id, en, key, side } ],            one per 3D mesh
//                        info:  { [key]: { zh, sys, layer, region, ob, ib } } }
//   data/text-zh.json  { [key]: { kid, o, i, a, n, b, c, d } }        Chinese text
//   data/text-en.json  same fields in English (from data/src/en/*.json)
// "key" is the English name without left/right, so both sides share text.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NERVES, ROOTS } from '../js/catalog.js';

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

// Split: structure facts the 3D code needs (anatomy.json) and the
// descriptive text, one file per language (text-zh.json, text-en.json).
const TEXT_FIELDS = ['kid', 'o', 'i', 'a', 'n', 'b', 'c', 'd'];
const core = {}, zh = {}, en = {};
const enSrc = {};
const enDir = path.join(src, 'en');
if (fs.existsSync(enDir)) for (const f of fs.readdirSync(enDir)) if (f.endsWith('.json')) Object.assign(enSrc, readJson(path.join(enDir, f)));
// Which peripheral nerves and spinal roots supply a muscle, read from the
// English innervation text. Clauses about sensation are ignored.
const nerveList = NERVES.flatMap((c) => c.items).map((n) => ({ id: n.id, re: new RegExp(n.match, 'i') }));
function nerveFacts(text) {
  const clauses = text.split(';').filter((c) => !/proprioception|sensation/i.test(c)).join(';');
  const nv = nerveList.filter((n) => n.re.test(clauses)).map((n) => n.id);
  const rt = new Set();
  for (const m of clauses.matchAll(/\b([CTLS])(\d{1,2})(?:\s*[–-]\s*([CTLS])?(\d{1,2}))?/g)) {
    const a = ROOTS.indexOf(m[1] + m[2]);
    const b = m[4] ? ROOTS.indexOf((m[3] || m[1]) + m[4]) : a;
    if (a < 0 || b < a) continue;
    for (let i = a; i <= b; i++) rt.add(ROOTS[i]);
  }
  return { nv, rt: ROOTS.filter((r) => rt.has(r)) };
}
const noNerve = [];
for (const [key, e] of Object.entries(info)) {
  core[key] = {}; zh[key] = {}; en[key] = {};
  if (e.sys === 'muscle' && enSrc[key]?.n) {
    const f = nerveFacts(enSrc[key].n);
    if (f.nv.length) e.nv = f.nv; else noNerve.push(`${key}: ${enSrc[key].n}`);
    if (f.rt.length) e.rt = f.rt;
  }
  for (const [k, v] of Object.entries(e)) (TEXT_FIELDS.includes(k) ? zh[key] : core[key])[k] = v;
  for (const k of TEXT_FIELDS) {
    const v = enSrc[key]?.[k];
    if (v) en[key][k] = v;
    else if (zh[key][k]) problems.push(`${key}: no English for "${k}"`);
  }
}
fs.writeFileSync(path.join(root, 'data', 'anatomy.json'), JSON.stringify({ parts, info: core }));
fs.writeFileSync(path.join(root, 'data', 'text-zh.json'), JSON.stringify(zh));
fs.writeFileSync(path.join(root, 'data', 'text-en.json'), JSON.stringify(en));
const count = {};
for (const p of parts) count[info[p.key].sys] = (count[info[p.key].sys] || 0) + 1;
console.log(`${parts.length} meshes, ${Object.keys(info).length} structures`, count);
if (noNerve.length) console.log(`${noNerve.length} muscles without a nerve group:\n  ` + noNerve.join('\n  '));
if (problems.length) console.log(`${problems.length} problems:\n  ` + problems.slice(0, 40).join('\n  '));
