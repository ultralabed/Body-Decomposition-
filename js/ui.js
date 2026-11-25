// All DOM / interaction code. The 3D work happens in core.js, motion.js and
// attach.js; this file wires buttons and panels to them.
// Every visible string goes through t('中文') so it can be shown in English.

import * as THREE from '../vendor/three.module.min.js';
import * as core from './core.js';
import { app, on, NORMAL, GHOST, HIDDEN } from './core.js';
import { GROUPS, PEEL, SYS, LAYER, REGION, REGION_ORDER, REGIONS, MUSCLE_GROUPS, MOTIONS, OPPOSITE, NERVES, ROOTS, EXERCISES, EXERCISE_CATS } from './catalog.js';
import * as motion from './motion.js';
import * as attach from './attach.js';
import { createQuiz } from './quiz.js';
import { t, L, getLang, setLang, keyName, keyAlt, applyStatic } from './i18n.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const icon = (n) => `<svg class="ic"><use href="#i-${n}"/></svg>`;
const store = {
  get(k, d) { try { const v = localStorage.getItem('bd.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('bd.' + k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};

const root = document.documentElement;
const sheet = $('#sheet'), sheetBody = $('#sheet-body'), sheetTitle = $('#sheet-title');
const selbar = $('#selbar'), tabs = $('#tabs'), peelEl = $('#peel'), toastEl = $('#toast'), langBtn = $('#lang-btn');
const desktop = window.matchMedia('(min-width: 900px)');

const tabTitle = (name) => ({ layers: t('圖層'), regions: t('部位'), groups: t('肌群'), motions: t('關節動作'), quiz: t('測驗'), tools: t('工具'), info: t('說明') })[name];
const PRIME = new THREE.Color('#ffb703'), ASSIST = new THREE.Color('#36c5c0'), ANTAG = new THREE.Color('#a78bfa'), STAB = new THREE.Color('#5b9dff');
const isSoft = (p) => p.sys === 'muscle' || p.sys === 'tendon';
const isHard = (p) => p.sys === 'bone' || p.sys === 'joint';
const info = (key) => app.info[key];

let tab = null;          // open panel name or null
let mode = 'normal';     // normal | attach | motion | quiz
let regionOnly = false;
let activeRegion = 'all';
let searchIndex = [];
let quiz;

// ---------------------------------------------------------------- basics

let toastTimer;
export function toast(msg, ms = 2600) {
  toastEl.textContent = msg; toastEl.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { toastEl.hidden = true; }, ms);
}

function syncLayout() {
  const open = !sheet.hidden;
  root.classList.toggle('sheet-open', open);
  if (desktop.matches) {
    root.style.setProperty('--panel-open', open ? '384px' : '0px');
    root.style.setProperty('--sheet-h', '0px');
    core.setInsets(76 + (open ? 384 : 0), 0);
  } else {
    const h = open ? sheet.offsetHeight : 0;
    root.style.setProperty('--panel-open', '0px');
    root.style.setProperty('--sheet-h', h + 'px');
    core.setInsets(0, h + 58);
  }
}

function openTab(name) {
  tab = name;
  sheet.hidden = false;
  sheetTitle.textContent = tabTitle(name);
  for (const b of tabs.children) b.setAttribute('aria-pressed', String(b.dataset.tab === name));
  render();
  sheetBody.scrollTop = 0;
  syncLayout();
}
function closeSheet() {
  tab = null; sheet.hidden = true;
  for (const b of tabs.children) b.setAttribute('aria-pressed', 'false');
  syncLayout();
}
function render() {
  if (!tab) return;
  if (tab === 'motions') sheetTitle.textContent = activeExercise || (motionView === 'exercise' && !activeMotion) ? t('訓練動作') : t('關節動作');
  const keep = sheetBody.scrollTop;
  sheetBody.innerHTML = ({ layers: layersHtml, regions: regionsHtml, groups: groupsHtml, motions: motionsHtml, quiz: () => quiz.html(), tools: toolsHtml, info: infoHtml })[tab]();
  sheetBody.scrollTop = keep;
}

function setMode(m) {
  if (mode === m) return;
  if (mode === 'attach') attach.clearAttachments();
  if (mode === 'motion') { stopPlayer(); motion.stopMotion(); activeMotion = null; }
  if (mode === 'quiz') quiz.stop();
  if (mode === 'exercise') activeExercise = null;
  app.state.overlay = null;
  core.setExtraLabels([]);
  mode = m;
  core.refresh();
  updateSelbar();
}

// Direction to look from so the given parts face the camera: from the
// middle of the neighbouring bones outwards through the parts.
function outwardDir(parts) {
  // For a left + right pair, judge from the right-hand one and then look
  // straight from the front or the back.
  const pair = parts.some((p) => p.side === 'L') && parts.some((p) => p.side === 'R');
  const use = pair ? parts.filter((p) => p.side !== 'L') : parts;
  const box = core.boxOfParts(use);
  const c = box.getCenter(new THREE.Vector3());
  const ids = new Set(parts.map((p) => p.id));
  // middle of the bone surface that lies inside the parts' own box
  const mid = new THREE.Vector3(); let n = 0;
  const grown = box.clone().expandByScalar(0.01);
  for (const b of app.parts) {
    if (b.sys !== 'bone' || ids.has(b.id) || !b.box.intersectsBox(grown)) continue;
    const a = b.mesh.geometry.attributes.position.array;
    for (let i = 0; i < a.length; i += 3) {
      if (a[i] < grown.min.x || a[i] > grown.max.x || a[i + 1] < grown.min.y || a[i + 1] > grown.max.y || a[i + 2] < grown.min.z || a[i + 2] > grown.max.z) continue;
      mid.x += a[i]; mid.y += a[i + 1]; mid.z += a[i + 2]; n++;
    }
  }
  let d = null;
  if (n) {
    d = c.clone().sub(mid.multiplyScalar(1 / n)); d.y = 0;
    if (d.length() < 0.012) d = null;
  }
  if (!d) {
    const dz = c.z - 0.075;
    d = new THREE.Vector3(c.x * 0.55, 0, Math.sign(dz || 1) * Math.max(Math.abs(dz), 0.05) * 1.7);
  }
  d.normalize();
  if (pair) { d.x *= 0.2; if (Math.abs(d.z) < 0.25) d.z = d.z < 0 ? -0.25 : 0.25; d.normalize(); }
  d.y = 0.1;
  return d.normalize();
}

// Select + reveal + fade everything else + fly there.
function spotlight(parts, focus) {
  if (!parts.length) return;
  setMode('normal');
  core.pushUndo();
  core.reveal(parts);
  const ids = new Set(parts.map((p) => p.id));
  const soft = parts.every(isSoft);
  for (const p of app.parts) {
    if (ids.has(p.id)) p.user = NORMAL;
    else if (soft && isHard(p)) p.user = p.user === HIDDEN ? HIDDEN : NORMAL;
    else if (p.user !== HIDDEN) p.user = GHOST;
  }
  if (soft && !app.state.groups.bone.on) { app.state.groups.bone.on = true; core.emit('groups'); }
  core.select([...ids]);
  const f = focus || parts.filter((p) => p.side !== 'L');
  core.focusParts(f.length ? f : parts, outwardDir(f.length ? f : parts), { pad: 1.9 });
}
function spotlightKey(key) {
  const parts = app.byKey.get(key) || [];
  spotlight(parts);
  if (desktop.matches) openTab('info');
}

function familyKeys(key) {
  const m = /\b(?:head|part|belly) of (.+)$/.exec(key);
  const base = m ? m[1] : key;
  const out = [...app.byKey.keys()].filter((k) => k === base || (k.endsWith(' of ' + base) && /\b(head|part|belly) of /.test(k)));
  return out.length ? out : [key];
}
const familyBase = (key) => key.replace(/^.*\b(?:head|part|belly) of /, '');
function commonPrefix(list) {
  if (!list.length) return '';
  let p = list[0];
  for (const s of list) { let i = 0; while (i < p.length && i < s.length && p[i] === s[i]) i++; p = p.slice(0, i); }
  return p;
}
// Name of a whole muscle made of several heads / parts.
function familyName(keys) {
  const en = familyBase(keys[0]);
  const zh = commonPrefix(keys.map((k) => info(k).zh));
  const enCap = en.charAt(0).toUpperCase() + en.slice(1);
  if (getLang() === 'en') return { name: enCap, alt: zh.length >= 2 ? zh : '' };
  return zh.length >= 2 ? { name: zh, alt: en } : null;
}
function selectionTitle(parts) {
  if (!parts.length) return { name: '', alt: '' };
  if (parts.length === 1) return { name: parts[0].name, alt: parts[0].alt };
  const keys = [...new Set(parts.map((p) => p.key))];
  if (keys.length === 1) return { name: t('{name}（左右兩側）', { name: keyName(keys[0]) }), alt: keyAlt(keys[0]) };
  const fam = familyKeys(keys[0]);
  if (keys.every((k) => fam.includes(k))) {
    const f = familyName(keys);
    if (f) return { name: t('{name}（{n} 個部分）', { name: f.name, n: keys.length }), alt: f.alt };
  }
  return { name: t('已選 {n} 個構造', { n: parts.length }), alt: keys.slice(0, 3).map(keyName).join(t('、')) + (keys.length > 3 ? '…' : '') };
}

// ---------------------------------------------------------------- peel + views

const PEEL_SW = ['#dfae8f', '#c5483c', '#a8383a', '#8a2d38', '#e3d6b8'];
function buildPeel() {
  peelEl.innerHTML = `<div class="cap">${t('剝層')}</div>` + PEEL.map((n, i) => `<button data-peel="${i}" style="--sw:${PEEL_SW[i]}" aria-pressed="false">${L(n)}</button>`).join('');
  syncPeel();
}
peelEl.addEventListener('click', (e) => {
  const b = e.target.closest('[data-peel]'); if (!b) return;
  if (mode !== 'normal') setMode('normal');
  core.setPeel(Number(b.dataset.peel));
});
function syncPeel() {
  const lv = core.peelLevel();
  for (const b of peelEl.querySelectorAll('[data-peel]')) b.setAttribute('aria-pressed', String(Number(b.dataset.peel) === lv));
}

$('#views').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.view) core.setView(b.dataset.view);
  else if (b.dataset.act === 'reset') core.resetView();
  else if (b.dataset.act === 'undo') { if (mode !== 'normal') setMode('normal'); core.undo(); render(); }
  else if (b.dataset.act === 'showall') { setMode('normal'); core.showAll(); core.select([]); regionOnly = false; render(); toast(t('全部都回來了')); }
});

// ---------------------------------------------------------------- search

function buildSearchIndex() {
  searchIndex = [...app.byKey.entries()].map(([key, parts]) => ({
    key, zh: parts[0].info.zh, en: key.toLowerCase(), sys: parts[0].sys, color: '#' + parts[0].color.getHexString(),
    tag: L(SYS[parts[0].sys]).split(/[／/]/)[0].trim() + (parts[0].layer ? ' · ' + L(LAYER[parts[0].layer]) : ''),
  }));
}
function setupSearch() {
  const input = $('#q'), results = $('#results'), clear = $('#q-clear');
  const run = () => {
    const raw = input.value.trim();
    clear.hidden = !raw;
    if (!raw) { results.hidden = true; return; }
    const q = raw.toLowerCase().replace(/^[左右]|^(left|right)\s+/, '') || raw.toLowerCase();
    const scored = [];
    for (const e of searchIndex) {
      let s = -1;
      if (e.zh === q || e.en === q) s = 0;
      else if (e.zh.startsWith(q) || e.en.startsWith(q)) s = 1;
      else if (e.zh.includes(q)) s = 2;
      else if (e.en.includes(q)) s = 3;
      else if (q.split(/\s+/).every((w) => e.en.includes(w))) s = 4;
      if (s >= 0) scored.push([s + (e.sys === 'muscle' || e.sys === 'bone' ? 0 : 0.5), e]);
    }
    scored.sort((a, b) => a[0] - b[0] || a[1].en.length - b[1].en.length);
    results.hidden = false;
    results.innerHTML = scored.length
      ? scored.slice(0, 40).map(([, e]) => `<button class="res" data-key="${esc(e.key)}"><i class="dot" style="background:${e.color}"></i><span><b>${esc(keyName(e.key))}</b><small>${esc(keyAlt(e.key))}</small></span><span class="tag">${esc(e.tag)}</span></button>`).join('')
      : `<div class="res-empty">${t('找不到，換個字試試（例如「二頭」或 biceps）')}</div>`;
  };
  input.addEventListener('input', run);
  input.addEventListener('focus', run);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { results.querySelector('.res')?.click(); }
    if (e.key === 'Escape') { results.hidden = true; input.blur(); }
  });
  clear.addEventListener('click', () => { input.value = ''; run(); input.focus(); });
  results.addEventListener('click', (e) => {
    const b = e.target.closest('.res'); if (!b) return;
    results.hidden = true; input.value = ''; clear.hidden = true; input.blur();
    spotlightKey(b.dataset.key);
    toast(t('其他構造已變淡。按左邊的「全部顯示」可以恢復'));
  });
  document.addEventListener('pointerdown', (e) => { if (!e.target.closest('#top')) results.hidden = true; });
}

// ---------------------------------------------------------------- selection bar

function updateSelbar() {
  const parts = core.selectedParts();
  if (!parts.length || mode === 'quiz') { selbar.hidden = true; return; }
  const s = selectionTitle(parts);
  const btn = (act, ic, label, pressed) => `<button data-act="${act}" title="${label}"${pressed !== undefined ? ` aria-pressed="${pressed}"` : ''}>${icon(ic)}<span>${label}</span></button>`;
  selbar.hidden = false;
  selbar.innerHTML = `<button class="sel-name" data-act="info"><b>${esc(s.name)}</b><small>${esc(s.alt)}</small><span class="more">${t('說明')}${icon('chev')}</span></button>
    <div class="sel-tools">
      ${parts.every(isSoft) ? btn('train', 'motion', t('動作訓練')) : ''}${btn('hide', 'eye-off', t('隱藏'))}${btn('ghost', 'ghost', t('變透明'))}${btn('isolate', 'target', t('只看這個'))}
      ${btn('fade-others', 'contrast', t('其他變淡'))}${btn('focus', 'pin', t('靠近看'))}${btn('multi', 'multi', t('多選'), app.state.multi)}
    </div>`;
}

selbar.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act;
  if (a === 'info') { infoView = 'about'; return openTab('info'); }
  if (a === 'train') { infoView = 'train'; return openTab('info'); }
  if (a === 'multi') { app.state.multi = !app.state.multi; updateSelbar(); toast(app.state.multi ? t('多選開啟：一個一個點，可以選很多個') : t('多選關閉')); return; }
  if (a === 'focus') { const p = core.selectedParts(); return core.focusParts(p, outwardDir(p), { pad: 1.8 }); }
  if (mode !== 'normal') setMode('normal');
  if (a === 'hide') { core.hideSelected(); toast(t('已隱藏。按左邊的復原箭頭可以叫回來')); }
  else if (a === 'ghost') core.ghostSelected();
  else if (a === 'isolate') core.isolateSelected(HIDDEN);
  else if (a === 'fade-others') core.isolateSelected(GHOST);
  render();
});

// ---------------------------------------------------------------- panel: layers

function layersHtml() {
  const g = app.state.groups;
  const rows = GROUPS.map((x) => {
    const s = g[x.id], name = L(x.name);
    return `<div class="layer" data-off="${!s.on}">
      <div class="row"><button class="switch" role="switch" aria-checked="${s.on}" aria-label="${esc(name)}" data-act="group-toggle" data-id="${x.id}"></button>
        <div class="txt"><b>${esc(name)}</b><small>${esc(L(x.hint))}</small></div></div>
      <div class="op"><input type="range" min="5" max="100" step="5" value="${Math.round(s.op * 100)}" data-act="group-op" data-id="${x.id}" aria-label="${esc(t('{name}透明度', { name }))}"><span>${Math.round(s.op * 100)}%</span></div>
    </div>`;
  }).join('');
  const side = app.state.side;
  const counts = {};
  for (const [, parts] of app.byKey) counts[parts[0].sys] = (counts[parts[0].sys] || 0) + 1;
  const tree = ['muscle', 'tendon', 'bone', 'joint', 'organ', 'vessel', 'nerve', 'skin'].map((sys) =>
    `<details class="tree" data-sys="${sys}"><summary>${icon('chev')}${esc(L(SYS[sys]))}<small>${t('{n} 種', { n: counts[sys] || 0 })}</small></summary><div class="tree-body"></div></details>`).join('');
  return `<p class="hint">${t('打開或關掉每一層，拉桿可以讓它變透明。右邊的「剝層」是一鍵版本。')}</p>
    ${rows}
    <div class="h3">${t('只看身體的一邊')}</div>
    <div class="seg">${[['all', t('兩邊')], ['R', t('只看右邊')], ['L', t('只看左邊')]].map(([v, label]) => `<button data-act="side" data-v="${v}" aria-pressed="${side === v}">${label}</button>`).join('')}</div>
    <div class="h3">${t('全部構造清單（點名字會帶你去看）')}</div>
    ${tree}`;
}

function treeBodyHtml(sys) {
  const byRegion = new Map();
  for (const [key, parts] of app.byKey) {
    if (parts[0].sys !== sys) continue;
    const r = parts[0].region;
    if (!byRegion.has(r)) byRegion.set(r, []);
    byRegion.get(r).push([key, parts]);
  }
  const locale = getLang() === 'en' ? 'en' : 'zh-Hant';
  let html = '';
  for (const r of REGION_ORDER) {
    const list = byRegion.get(r); if (!list) continue;
    list.sort((a, b) => keyName(a[0]).localeCompare(keyName(b[0]), locale));
    html += `<div class="tree-sub">${esc(L(REGION[r]))}</div>` + list.map(([key, parts]) => {
      const hidden = parts.every((p) => p.user === HIDDEN);
      return `<div class="tree-item" data-hidden="${hidden}"><button data-act="tree-go" data-key="${esc(key)}"><b>${esc(keyName(key))}</b><small>${esc(keyAlt(key))}</small></button>
        <button class="icon-btn" data-act="tree-eye" data-key="${esc(key)}" aria-label="${t('顯示或隱藏')}">${icon(hidden ? 'eye-off' : 'eye')}</button></div>`;
    }).join('');
  }
  return html;
}

// ---------------------------------------------------------------- panel: regions

function regionBox(r) {
  if (r.anchor) {
    const lm = motion.landmarks('R');
    if (lm) return new THREE.Box3().setFromCenterAndSize(lm[r.anchor], new THREE.Vector3(r.r * 2, r.r * 2, r.r * 2));
  }
  const want = r.frame || r.regions;
  if (!want) return app.bounds.clone();
  return core.boxOfParts(app.parts.filter((p) => want.includes(p.region) && p.sys !== 'skin' && (isSoft(p) || isHard(p))));
}
function goRegion(id) {
  const r = REGIONS.find((x) => x.id === id); if (!r) return;
  activeRegion = id;
  if (mode !== 'normal') setMode('normal');
  if (regionOnly || app.state.regionOnly) {
    core.pushUndo();
    app.state.regionOnly = regionOnly && r.regions ? new Set(r.regions) : null;
    core.refresh();
  }
  core.frameBox(regionBox(r), new THREE.Vector3(...r.dir), { pad: r.anchor ? 1.0 : 1.08 });
  render();
}
function regionsHtml() {
  return `<p class="hint">${t('點一下就飛過去看那個部位（手腳以右邊為主）。')}</p>
    <div class="grid3">${REGIONS.map((r) => `<button class="btn" data-act="region" data-id="${r.id}" aria-pressed="${activeRegion === r.id}">${esc(L(r.name))}</button>`).join('')}</div>
    <div class="opt" style="margin-top:10px"><div class="txt"><b>${t('只顯示這個部位')}</b><small>${t('把其他部位的肌肉骨頭先收起來，畫面比較乾淨')}</small></div>
      <button class="switch" role="switch" aria-checked="${regionOnly}" aria-label="${t('只顯示這個部位')}" data-act="region-only"></button></div>`;
}

// ---------------------------------------------------------------- panel: muscle groups

function groupParts(item) {
  const re = new RegExp(item.match);
  return app.parts.filter((p) => isSoft(p) && re.test(p.key));
}
let groupView = 'func'; // func | nerve | root
const nerveParts = (id) => app.parts.filter((p) => p.info.nv?.includes(id));
const rootParts = (r) => app.parts.filter((p) => p.info.rt?.includes(r));
const countKeys = (parts) => new Set(parts.map((p) => p.key)).size;
const nerveById = (id) => NERVES.flatMap((c) => c.items).find((n) => n.id === id);

function groupsHtml() {
  const other = getLang() === 'en' ? 0 : 1; // show the other language as a small subtitle
  const seg = `<div class="seg" style="margin-bottom:10px">${[['func', t('功能肌群')], ['nerve', t('依神經')], ['root', t('依神經根')]].map(([v, label]) => `<button data-act="gview" data-v="${v}" aria-pressed="${groupView === v}">${label}</button>`).join('')}</div>`;
  if (groupView === 'nerve') {
    return seg + `<p class="hint">${t('選一條神經，它管的肌肉會全部亮起來。這條神經受傷時，這些肌肉可能會沒力。')}</p>` +
      NERVES.map((c) => `<div class="h3">${esc(L(c.cat))}</div>` + c.items.map((n) => {
        const k = countKeys(nerveParts(n.id));
        return k ? `<button class="card-btn" data-act="nerve" data-id="${n.id}"><b>${esc(L(n.name))}</b><em>${t('{n} 條肌肉', { n: k })}</em><small>${esc(n.name[other])}</small></button>` : '';
      }).join('')).join('') + `<p class="fine">${t('模型裡沒有神經本身的 3D 形狀，所以這裡顯示的是「這條神經支配哪些肌肉」，不是神經走的路線。')}</p>`;
  }
  if (groupView === 'root') {
    const chip = (r) => { const k = countKeys(rootParts(r)); return k ? `<button class="btn" data-act="root" data-id="${r}">${r}<em style="font-style:normal;opacity:.6;font-weight:500;margin-left:4px">${k}</em></button>` : ''; };
    const block = (title, re) => `<div class="h3">${title}</div><div class="grid3">${ROOTS.filter((r) => re.test(r)).map(chip).join('')}</div>`;
    return seg + `<p class="hint">${t('選一節神經根（例如 C5），由它支配的肌肉會亮起來，也就是這一節的「肌節」。數字是肌肉數量。')}</p>` +
      block(t('頸神經（C）'), /^C/) + block(t('胸神經（T）'), /^T/) + block(t('腰神經（L）'), /^L/) + block(t('薦神經（S）'), /^S/) +
      `<p class="fine">${t('神經根節是照說明文字裡寫的節數整理的，各教科書略有出入。')}</p>`;
  }
  return seg + `<p class="hint">${t('常一起工作的肌肉。點一下，這群肌肉會亮起來，其他的會變淡。')}</p>` +
    MUSCLE_GROUPS.map((c, ci) => `<div class="h3">${esc(L(c.cat))}</div>` + c.items.map((it, ii) =>
      `<button class="card-btn" data-act="mgroup" data-c="${ci}" data-i="${ii}"><b>${esc(L(it.name))}</b><em>${esc(it.name[other])}</em><small>${esc(L(it.kid))}</small></button>`).join('')).join('');
}

// Which movements each muscle takes part in (built once the model is loaded).
let motionRoles = new Map(); // key -> [{ m, both, role }]
let motionKeys = new Map();  // motion id -> { m, both, prime:Set, assist:Set }
function buildMotionIndex() {
  motionRoles = new Map(); motionKeys = new Map();
  const softKeys = [...app.byKey.entries()].filter(([, parts]) => isSoft(parts[0])).map(([k]) => k);
  const resolve = (list) => { const out = new Set(); for (const spec of list) { const re = new RegExp(spec.replace(/^[RL]:/, '')); for (const k of softKeys) if (re.test(k)) out.add(k); } return out; };
  for (const c of MOTIONS) for (const m of c.items) {
    const prime = resolve(m.prime), assist = resolve(m.assist);
    for (const k of prime) assist.delete(k);
    motionKeys.set(m.id, { m, both: !!c.both, prime, assist });
    for (const [set, role] of [[prime, 'prime'], [assist, 'assist']]) for (const k of set) {
      if (!motionRoles.has(k)) motionRoles.set(k, []);
      motionRoles.get(k).push({ m, both: !!c.both, role });
    }
  }
}
// Helpers (synergists) and opponents (antagonists) of a muscle, worked out
// from the movement table.
function partnersOf(key) {
  const roles = motionRoles.get(key) || [];
  const mine = roles.some((r) => r.role === 'prime') ? roles.filter((r) => r.role === 'prime') : roles;
  const fam = new Set(familyKeys(key));
  const syn = new Set(), ant = new Set();
  for (const { m } of mine) {
    const mk = motionKeys.get(m.id);
    for (const k of mk.prime) syn.add(k);
    if (mine[0].role === 'prime') for (const k of mk.assist) syn.add(k);
    const opp = motionKeys.get(OPPOSITE[m.id]);
    if (opp) for (const k of opp.prime) ant.add(k);
  }
  for (const k of fam) { syn.delete(k); ant.delete(k); }
  for (const k of syn) ant.delete(k);
  return { roles, syn: [...syn].slice(0, 14), ant: [...ant].slice(0, 14) };
}

// ---------------------------------------------------------------- panel: motions

let activeMotion = null, motionBoth = false, motionSide = 'R', motionFocus = true;
let playing = false, playT = 0, playDir = 1, playHold = 0, primeSet = new Set(), assistSet = new Set(), antSet = new Set();

function motionOverlay(p) {
  if (p.sys === 'skin') return { visible: false };
  if (primeSet.has(p)) return { visible: true, opacity: 1, tint: PRIME };
  if (assistSet.has(p)) return { visible: true, opacity: 1, tint: ASSIST };
  if (antSet.has(p)) return { visible: true, opacity: 1, tint: ANTAG };
  if (motionFocus && isSoft(p)) return { opacity: 0.06, pickable: false };
  if (isHard(p)) return { visible: true };
  return null;
}
function motionBox(m, side) {
  const joint = m.steps[m.steps.length - 1].joint;
  if (m.planted) return app.bounds.clone();
  if (joint === 'trunk') { const b = app.bounds.clone(); b.min.y = 0.55; return b; }
  if (joint === 'neck') { const b = app.bounds.clone(); b.min.y = 1.22; b.min.x = -0.2; b.max.x = 0.2; return b; }
  const lm = motion.landmarks(side);
  const r = { shoulder: 0.42, elbow: 0.3, wrist: 0.2, hip: 0.6, knee: 0.48, ankle: 0.24 }[joint] || 0.4;
  const c = lm[joint].clone();
  if (joint === 'shoulder' || joint === 'hip') c.y -= r * 0.35;
  if (joint === 'elbow') c.y += 0.08;
  return new THREE.Box3().setFromCenterAndSize(c, new THREE.Vector3(r * 2, r * 2, r * 2));
}
function startMotion(m, both) {
  setMode('normal');
  mode = 'motion';
  activeMotion = m; motionBoth = !!both;
  core.select([], { silent: true }); updateSelbar();
  const sides = motionBoth ? ['R', 'L'] : [motionSide];
  const mm = motion.motionMuscles(m, sides, motionBoth);
  primeSet = new Set(mm.prime); assistSet = new Set(mm.assist);
  const opp = motionKeys.get(OPPOSITE[m.id]);
  antSet = new Set(opp ? motion.motionMuscles(opp.m, sides, motionBoth).prime.filter((p) => !primeSet.has(p) && !assistSet.has(p)) : []);
  app.state.overlay = motionOverlay;
  motion.startMotion(m, sides);
  core.refresh();
  const sx = motionSide === 'R' ? -1 : 1;
  const dir = m.view === 'side' ? new THREE.Vector3(sx, 0.08, 0.3) : m.view === 'top' ? new THREE.Vector3(sx * 0.25, 1, 0.75) : new THREE.Vector3(sx * 0.15, 0.06, 1);
  core.frameBox(motionBox(m, motionSide), dir, { pad: 1.0 });
  playT = 0; playDir = 1; playHold = 0.4;
  startPlayer();
  render();
  sheetBody.scrollTop = 0;
}
const easeInOut = (x) => x * x * (3 - 2 * x);
function playerTick(dt) {
  if (!playing) return;
  if (playHold > 0) { playHold -= dt; return; }
  playT += playDir * dt / 1.7;
  if (playT >= 1) { playT = 1; playDir = -1; playHold = 0.7; }
  if (playT <= 0) { playT = 0; playDir = 1; playHold = 0.5; }
  motion.setMotionT(easeInOut(playT));
  const s = $('#motion-t'); if (s) { s.value = Math.round(playT * 100); const o = $('#motion-o'); if (o) o.textContent = Math.round(playT * 100) + '%'; }
}
function startPlayer() { playing = true; core.addFrameHook(playerTick); }
function stopPlayer() { playing = false; core.removeFrameHook(playerTick); motion.settleMotion(); }

// ---- training exercises (which muscles work in a lift)
let motionView = 'joint'; // joint | exercise
let activeExercise = null, exSide = 'R', exFocus = true, exSets = { prime: new Set(), assist: new Set(), stab: new Set() };

let activeBoth = false; // true while resolving a two-sided exercise
function resolveEx(list, side) {
  const other = side === 'R' ? 'L' : 'R', out = [];
  for (const spec of list) {
    const m = /^([BO]):(.*)$/.exec(spec);
    const re = new RegExp(m ? m[2] : spec);
    const sides = m ? (m[1] === 'B' ? ['R', 'L'] : [other]) : [side];
    if (activeBoth) sides.splice(0, sides.length, 'R', 'L');
    for (const p of app.parts) if (isSoft(p) && re.test(p.key) && (!p.side || sides.includes(p.side)) && !out.includes(p)) out.push(p);
  }
  return out;
}
function exerciseOverlay(p) {
  if (p.sys === 'skin') return { visible: false };
  if (exSets.prime.has(p)) return { visible: true, opacity: 1, tint: PRIME };
  if (exSets.assist.has(p)) return { visible: true, opacity: 1, tint: ASSIST };
  if (exSets.stab.has(p)) return { visible: true, opacity: 1, tint: STAB };
  if (exFocus && isSoft(p)) return { opacity: 0.06, pickable: false };
  if (isHard(p)) return { visible: true };
  return null;
}
function startExercise(ex) {
  setMode('normal');
  mode = 'exercise';
  activeExercise = ex;
  core.select([], { silent: true }); updateSelbar();
  activeBoth = !!ex.both;
  const prime = resolveEx(ex.prime, exSide);
  const assist = resolveEx(ex.assist, exSide).filter((p) => !prime.includes(p));
  const stab = resolveEx(ex.stab, exSide).filter((p) => !prime.includes(p) && !assist.includes(p));
  exSets = { prime: new Set(prime), assist: new Set(assist), stab: new Set(stab) };
  app.state.overlay = exerciseOverlay;
  openVideo = null;
  loadGuides();
  core.refresh();
  const sx = exSide === 'R' ? -1 : 1;
  const dir = ex.view === 'side' ? new THREE.Vector3(sx, 0.08, 0.45) : ex.view === 'back' ? new THREE.Vector3(sx * 0.45, 0.1, -1) : new THREE.Vector3(sx * 0.45, 0.1, 1);
  core.focusParts([...prime, ...assist], dir, { pad: 1.2 });
  render();
  sheetBody.scrollTop = 0;
}
const exerciseById = (id) => EXERCISES.find((x) => x.id === id);

// How-to text and YouTube videos for the exercises (data/guides.json),
// fetched the first time an exercise is opened.
let guides = null, guidesFailed = false, exView = 'muscles', openVideo = null;
function loadGuides() {
  if (guides || guidesFailed) return;
  fetch('data/guides.json').then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((g) => { guides = g; if (activeExercise) render(); })
    .catch(() => { guidesFailed = true; if (activeExercise) render(); });
}
const videoId = (url) => (/[?&]v=([\w-]{11})/.exec(url) || [])[1];
function guideHtml(ex) {
  const lang = getLang(), name = L(ex.name).split(/[／/]/)[0].trim();
  const search = `https://www.youtube.com/results?search_query=${encodeURIComponent(name + (lang === 'en' ? ' tutorial proper form' : ' 教學 正確姿勢'))}`;
  const searchBtn = `<a class="btn wide" href="${search}" target="_blank" rel="noopener">${icon('search')}${t('在 YouTube 搜尋更多影片')}</a>`;
  if (!guides) {
    return (guidesFailed ? `<p class="hint">${t('教學內容載入失敗，請檢查網路。')}</p>` : `<p class="hint">${t('正在載入教學…')}</p>`) + searchBtn;
  }
  const g = guides[ex.id];
  if (!g) return `<p class="hint">${t('這個動作還沒有教學內容。')}</p>` + searchBtn;
  const li = (list) => list.map((x) => `<li>${esc(x)}</li>`).join('');
  const canEmbed = !window.claude; // the Claude viewer cannot embed other sites
  const row = (v) => {
    const id = videoId(v.url);
    if (canEmbed && openVideo === id) {
      return `<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1" title="${esc(v.title)}" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>
        <div class="video-under"><span>${esc(v.title)}</span><a href="${esc(v.url)}" target="_blank" rel="noopener">${t('在 YouTube 開啟')}</a></div>`;
    }
    return canEmbed
      ? `<button class="video-row" data-act="video" data-id="${id}">${icon('play')}<span>${esc(v.title)}</span></button>`
      : `<a class="video-row" href="${esc(v.url)}" target="_blank" rel="noopener">${icon('play')}<span>${esc(v.title)}</span></a>`;
  };
  const group = (code, title) => { const vs = g.videos.filter((v) => v.lang === code); return vs.length ? `<div class="tree-sub" style="padding-left:0">${title}</div>${vs.map(row).join('')}` : ''; };
  const order = lang === 'en' ? [['en', t('英文影片')], ['zh', t('中文影片')]] : [['zh', t('中文影片')], ['en', t('英文影片')]];
  return `<div class="h3">${t('怎麼做')}</div><ol class="steps">${li(g.steps[lang] || g.steps.zh)}</ol>
    <div class="h3">${t('常見錯誤')}</div><ul class="steps">${li(g.mistakes[lang] || g.mistakes.zh)}</ul>
    <div class="h3">${t('教學影片')}</div>
    ${g.videos.length ? order.map(([c, title]) => group(c, title)).join('') : `<p class="hint">${t('還沒有挑到合適的影片，可以用下面的按鈕自己搜尋。')}</p>`}
    <div style="margin-top:10px">${searchBtn}</div>
    <p class="fine">${t('影片是別人拍的 YouTube 內容，從搜尋結果挑選，不代表本站立場；影片可能被作者下架。')}</p>`;
}
function exerciseCard(ex, role) {
  const other = getLang() === 'en' ? 0 : 1;
  return `<button class="card-btn${role ? ' role-' + role : ''}" data-act="exercise" data-id="${ex.id}"><b>${esc(L(ex.name))}</b><em>${esc(ex.name[other])}</em><small>${esc(L(ex.kid))}</small></button>`;
}
// Exercises that use a muscle, with the role it plays there.
function exercisesOf(key) {
  const out = [];
  for (const ex of EXERCISES) for (const role of ['prime', 'assist', 'stab']) {
    if (ex[role].some((spec) => new RegExp(spec.replace(/^[BO]:/, '')).test(key))) { out.push({ ex, role }); break; }
  }
  return out;
}
function exerciseHtml() {
  const ex = activeExercise, other = getLang() === 'en' ? 0 : 1;
  const seen = new Set();
  const chips = (set, cls) => [...set].filter((p) => !ex.both || (!seen.has(p.key) && seen.add(p.key))).map((p) => `<button class="chip ${cls}" data-act="ex-muscle" data-id="${p.id}">${esc(ex.both ? keyName(p.key) : p.name)}</button>`).join('');
  const joints = ex.joints.map((id) => motionKeys.get(id)).filter(Boolean);
  const musclesBlock = `    ${ex.both ? '' : `<div class="h3">${t('出力的那一邊')}</div>
    <div class="seg" style="margin-bottom:10px">${[['R', t('右邊')], ['L', t('左邊')]].map(([v, s2]) => `<button data-act="ex-side" data-v="${v}" aria-pressed="${exSide === v}">${s2}</button>`).join('')}</div>`}
    <div class="h3">${t('主要出力的肌肉（金色）')}</div><div class="chips">${chips(exSets.prime, 'prime')}</div>
    ${exSets.assist.size ? `<div class="h3">${t('幫忙的肌肉（青色）')}</div><div class="chips">${chips(exSets.assist, 'assist')}</div>` : ''}
    ${exSets.stab.size ? `<div class="h3">${t('負責穩住身體的肌肉（藍色）')}</div><div class="chips">${chips(exSets.stab, 'stab')}</div>` : ''}
    ${ex.note ? `<div class="note"><b>${t('重點')}　</b>${esc(L(ex.note))}</div>` : ''}
    ${joints.length ? `<div class="h3">${t('裡面包含的關節動作（點一下看示範）')}</div><div class="chips">${joints.map((j) => `<button class="chip" data-act="ex-joint" data-id="${j.m.id}">▶ ${esc(L(j.m.name))}</button>`).join('')}</div>` : ''}`;
  return `<div class="info"><h3>${esc(L(ex.name))}</h3><div class="en">${esc(ex.name[other])}</div></div>
    <div class="kid" data-lead="${t('簡單說：')}">${esc(L(ex.kid))}</div>
    <div class="seg" style="margin:10px 0">${[['muscles', t('用到的肌肉')], ['guide', t('教學與影片')]].map(([v, label]) => `<button data-act="ex-view" data-v="${v}" aria-pressed="${exView === v}">${label}</button>`).join('')}</div>
    ${exView === 'guide' ? guideHtml(ex) : musclesBlock}
    <div class="opt" style="margin-top:10px"><div class="txt"><b>${t('其他肌肉變淡')}</b><small>${t('只留下有出力的肌肉，比較好看清楚')}</small></div>
      <button class="switch" role="switch" aria-checked="${exFocus}" aria-label="${t('其他肌肉變淡')}" data-act="ex-focus"></button></div>
    <button class="btn wide" data-act="ex-exit" style="margin-top:12px">${t('結束這個動作')}</button>
    <p class="fine">${t('哪些肌肉出力是依一般肌動學和重量訓練教科書整理的，實際比例會隨姿勢、重量和個人差異改變。')}</p>`;
}

function motionsHtml() {
  if (activeExercise) return exerciseHtml();
  if (!activeMotion) {
    const seg = `<div class="seg" style="margin-bottom:10px">${[['joint', t('關節動作')], ['exercise', t('訓練動作')]].map(([v, label]) => `<button data-act="mview" data-v="${v}" aria-pressed="${motionView === v}">${label}</button>`).join('')}</div>`;
    if (motionView === 'exercise') {
      const other = getLang() === 'en' ? 0 : 1;
      return seg + `<p class="hint">${t('選一個訓練動作，用到的肌肉會亮起來：金色主要出力、青色幫忙、藍色負責穩住身體。')}</p>` +
        EXERCISE_CATS.map((c) => `<div class="h3">${esc(L(c.name))}</div>` + EXERCISES.filter((ex) => ex.cat === c.id).map((ex) => exerciseCard(ex)).join('')).join('');
    }
    return seg + `<p class="hint">${t('選一個動作：模型會動給你看，而且把「負責出力的肌肉」亮起來。')}</p>` +
      MOTIONS.map((c, ci) => `<div class="h3">${esc(L(c.cat))}</div><div class="grid2">` + c.items.map((m, mi) =>
        `<button class="btn" data-act="motion" data-c="${ci}" data-i="${mi}">${esc(L(m.name))}</button>`).join('') + '</div>').join('');
  }
  const m = activeMotion;
  const other = getLang() === 'en' ? 0 : 1;
  const label = (p) => (motionBoth ? keyName(p.key) : p.name);
  const chip = (p, cls) => `<button class="chip ${cls}" data-act="motion-muscle" data-id="${p.id}">${esc(label(p))}</button>`;
  const uniq = (set) => { const seen = new Set(); return [...set].filter((p) => (motionBoth ? !seen.has(p.key) && seen.add(p.key) : true)); };
  return `<div class="info"><h3>${esc(L(m.name))}</h3><div class="en">${esc(m.name[other])}</div></div>
    <div class="kid" data-lead="${t('簡單說：')}">${esc(L(m.kid))}</div>
    <dl class="facts"><dt>${t('正常角度')}</dt><dd>${esc(L(m.rom))}</dd></dl>
    <div class="player"><button class="btn primary" data-act="motion-play" aria-label="${playing ? t('暫停') : t('播放')}">${icon(playing ? 'pause' : 'play')}</button>
      <input id="motion-t" type="range" min="0" max="100" value="${Math.round(playT * 100)}" data-act="motion-t" aria-label="${t('動作進度')}"><output id="motion-o">${Math.round(playT * 100)}%</output></div>
    ${motionBoth ? '' : `<div class="seg" style="margin-bottom:10px">${[['R', t('右邊')], ['L', t('左邊')]].map(([v, s]) => `<button data-act="motion-side" data-v="${v}" aria-pressed="${motionSide === v}">${s}</button>`).join('')}</div>`}
    <div class="h3">${t('主要出力的肌肉（金色）')}</div><div class="chips">${uniq(primeSet).map((p) => chip(p, 'prime')).join('')}</div>
    ${assistSet.size ? `<div class="h3">${t('幫忙的肌肉（青色）')}</div><div class="chips">${uniq(assistSet).map((p) => chip(p, 'assist')).join('')}</div>` : ''}
    ${antSet.size ? `<div class="h3">${t('對手肌肉：做相反的動作，這時會被拉長（紫色）')}</div><div class="chips">${uniq(antSet).map((p) => chip(p, 'antag')).join('')}</div>` : ''}
    <div class="opt" style="margin-top:10px"><div class="txt"><b>${t('其他肌肉變淡')}</b><small>${t('只留下有出力的肌肉，比較好看清楚')}</small></div>
      <button class="switch" role="switch" aria-checked="${motionFocus}" aria-label="${t('其他肌肉變淡')}" data-act="motion-focus"></button></div>
    <button class="btn wide" data-act="motion-exit" style="margin-top:12px">${t('結束這個動作')}</button>
    <p class="fine">${t('動作是用「彎曲變形」模擬的示意動畫，肌肉在關節附近的形狀只是近似，不是精確的生物力學模擬。')}</p>`;
}

// ---------------------------------------------------------------- panel: info

let infoView = 'about'; // about | train
function infoHtml() {
  const sel = core.selectedParts();
  if (sel.length && sel.every(isSoft)) {
    const seg = `<div class="seg" style="margin-bottom:12px">${[['about', t('說明')], ['train', t('動作與訓練')]].map(([v, label]) => `<button data-act="iview" data-v="${v}" aria-pressed="${infoView === v}">${label}</button>`).join('')}</div>`;
    return seg + (infoView === 'train' ? trainHtml(sel) : aboutHtml());
  }
  return aboutHtml();
}

// "What does this muscle do, and how do I train it?" for the selection.
// A single head counts as its whole muscle (e.g. long head -> biceps brachii).
function trainHtml(sel) {
  const keys = [...new Set(sel.flatMap((p) => familyKeys(p.key)))];
  const title = selectionTitle(keys.length > 1 || sel.length > 1 ? keys.flatMap((k) => app.byKey.get(k)).filter((p) => sel.some((q) => q.side === p.side)) : sel);
  const rank = { prime: 0, assist: 1, stab: 2 };
  // joint movements
  const moves = new Map();
  for (const k of keys) for (const r of motionRoles.get(k) || []) {
    const cur = moves.get(r.m.id);
    if (!cur || rank[r.role] < rank[cur.role]) moves.set(r.m.id, r);
  }
  const moveList = [...moves.values()].sort((a, b) => rank[a.role] - rank[b.role]);
  // exercises
  const exs = new Map();
  for (const k of keys) for (const r of exercisesOf(k)) {
    const cur = exs.get(r.ex.id);
    if (!cur || rank[r.role] < rank[cur.role]) exs.set(r.ex.id, r);
  }
  const byRole = (role) => [...exs.values()].filter((r) => r.role === role).map((r) => exerciseCard(r.ex, role)).join('');
  const prime = byRole('prime'), assist = byRole('assist'), stab = byRole('stab');
  const partners = keys.length ? partnersOf(keys[0]) : { syn: [], ant: [] };
  const list = (ks) => ks.map((k) => `<button class="chip" data-act="tree-go" data-key="${esc(k)}">${esc(keyName(k))}</button>`).join('');
  return `<div class="info"><h3>${esc(title.name)}</h3><div class="en">${esc(title.alt)}</div></div>
    <div class="h3">${t('它參與哪些動作（點一下看示範）')}</div>
    ${moveList.length ? `<div class="chips">${moveList.map(({ m, role }) => `<button class="chip ${role}" data-act="info-motion" data-id="${m.id}">▶ ${esc(L(m.name))} · ${role === 'prime' ? t('主要') : t('幫忙')}</button>`).join('')}</div>`
      : `<p class="hint">${t('這塊肌肉不在 app 的 29 個關節動作示範裡。它的動作請看「說明」分頁的文字。')}</p>`}
    <div class="h3">${t('想練它，做這些最直接')}</div>
    ${prime || `<p class="hint">${t('動作庫裡沒有專門練它的動作。')}</p>`}
    ${assist ? `<div class="h3">${t('這些動作也會練到它')}</div>${assist}` : ''}
    ${stab ? `<div class="h3">${t('這些動作裡它負責穩定')}</div>${stab}` : ''}
    ${partners.syn.length ? `<div class="h3">${t('一起出力的夥伴（協同肌）')}</div><div class="chips">${list(partners.syn)}</div>` : ''}
    ${partners.ant.length ? `<div class="h3">${t('做相反動作的對手（拮抗肌）')}</div><div class="chips">${list(partners.ant)}</div>` : ''}
    <p class="fine">${t('訓練動作是一般性的參考，不是個人化的運動處方。有傷或疼痛時請先給專業人員評估。')}</p>`;
}

function aboutHtml() {
  const parts = core.selectedParts();
  if (!parts.length) return `<p class="hint">${t('還沒選東西。在模型上點一塊肌肉或骨頭，這裡就會出現它的說明。')}</p>`;
  const keys = [...new Set(parts.map((p) => p.key))];
  const lead = t('簡單說：');
  if (keys.length > 1) {
    return `<p class="hint">${t('你選了 {n} 個構造。點名字看單一個的說明。', { n: parts.length })}</p>` +
      keys.map((k) => `<button class="card-btn" data-act="info-one" data-key="${esc(k)}"><b>${esc(keyName(k))}</b><em>${esc(keyAlt(k))}</em><small>${esc(core.text(k).kid || '')}</small></button>`).join('') +
      (parts.every(isSoft) ? `<button class="btn wide" data-act="attach" aria-pressed="${mode === 'attach'}">${icon('pin')}${mode === 'attach' ? t('關閉起點／止點') : t('在骨頭上顯示起點／止點')}</button>${mode === 'attach' ? attachLegend() : ''}` : '');
  }
  const p = parts[0], key = p.key, tx = core.text(key);
  const title = parts.length === 1 ? p.name : keyName(key);
  const alt = parts.length === 1 ? p.alt : keyAlt(key);
  const chips = [L(SYS[p.sys]), p.layer ? L(LAYER[p.layer]) : null, L(REGION[p.region]), parts.length > 1 ? t('左右兩側') : p.side === 'R' ? t('右側') : p.side === 'L' ? t('左側') : null]
    .filter(Boolean).map((c) => `<span class="chip">${esc(c)}</span>`).join('');
  const fact = (label, value, dot) => (value ? `<dt>${dot ? `<i style="background:var(--${dot})"></i>` : ''}${label}</dt><dd>${esc(value)}</dd>` : '');
  const facts = isSoft(p)
    ? `<dl class="facts">${fact(t('起點'), tx.o, 'origin')}${fact(t('止點'), tx.i, 'insert')}${fact(t('動作'), tx.a)}${fact(t('神經支配'), tx.n)}${fact(t('血液供應'), tx.b)}</dl>`
    : '';
  const fam = familyKeys(key);
  const both = app.byKey.get(key).length > 1;
  const note = store.get('notes', {})[key] || '';
  const actions = [
    isSoft(p) ? `<button class="btn" data-act="attach" aria-pressed="${mode === 'attach'}">${icon('pin')}${mode === 'attach' ? t('關閉起止點') : t('看起點／止點')}</button>` : '',
    both ? `<button class="btn" data-act="info-both">${parts.length > 1 ? t('只選右邊') : t('左右一起選')}</button>` : '',
    fam.length > 1 ? `<button class="btn" data-act="info-family" data-key="${esc(key)}">${t('選整塊肌肉（{n} 部分）', { n: fam.length })}</button>` : '',
    `<button class="btn" data-act="info-focus">${icon('target')}${t('靠近看')}</button>`,
  ].filter(Boolean).join('');
  return `<div class="info">
    <h3>${esc(title)}</h3>
    <div class="en">${esc(alt)}<button class="icon-btn" data-act="speak" data-text="${esc(key)}" aria-label="${t('唸出英文名稱')}" title="${t('唸出英文名稱')}">${icon('speak')}</button></div>
    <div class="chips">${chips}</div>
    ${tx.kid ? `<div class="kid" data-lead="${lead}">${esc(tx.kid)}</div>` : ''}
    ${facts}
    ${isSoft(p) ? relatedHtml(p) : ''}
    ${tx.d ? `<div class="note">${esc(tx.d)}</div>` : ''}
    ${tx.c ? `<div class="note"><b>${t('臨床重點')}　</b>${esc(tx.c)}</div>` : ''}
    <div class="grid2" style="margin:10px 0">${actions}</div>
    ${mode === 'attach' ? attachLegend() : ''}
    <div class="h3">${t('我的筆記（只存在這台裝置）')}</div>
    <textarea data-act="note" data-key="${esc(key)}" placeholder="${t('例如：觸診位置、牽拉方式、上課重點…')}">${esc(note)}</textarea>
    <p class="fine">${t('模型編號')} ${parts.map((x) => x.id).join(', ')}</p>
  </div>`;
}
// Extra blocks on a muscle's card: same-nerve muscles, movements it does,
// helpers and opponents.
function relatedHtml(p) {
  const inf = p.info, key = p.key;
  let html = '';
  if (inf.nv?.length || inf.rt?.length) {
    html += `<div class="h3">${t('同一條神經管的肌肉（點一下全部亮起來）')}</div><div class="chips">` +
      (inf.nv || []).map((id) => `<button class="chip" data-act="nerve" data-id="${id}">${esc(L(nerveById(id).name))} · ${countKeys(nerveParts(id))}</button>`).join('') +
      (inf.rt || []).map((r) => `<button class="chip" data-act="root" data-id="${r}">${r}</button>`).join('') + '</div>';
  }
  html += `<button class="btn wide" data-act="iview" data-v="train" style="margin-top:12px">${icon('motion')}${t('看它參與的動作和怎麼鍛鍊')}</button>`;
  return html;
}
function attachLegend() {
  return `<div class="legend"><span><i style="background:var(--origin)"></i>${t('紅色＝起點')}</span><span><i style="background:var(--insert)"></i>${t('藍色＝止點')}</span><span><i style="background:var(--both)"></i>${t('紫色＝兩端都在這塊骨頭')}</span></div>
    <p class="fine">${t('顏色是用「肌肉離骨頭表面夠近的地方」自動算出來的，是大概位置；附在筋膜或其他肌肉上的部分不會顯示。')}</p>`;
}
function toggleAttach() {
  if (mode === 'attach') { setMode('normal'); render(); return; }
  const muscles = core.selectedParts().filter(isSoft);
  if (!muscles.length) return;
  setMode('normal');
  mode = 'attach';
  const ids = new Set(muscles.map((p) => p.id));
  app.state.overlay = (p) => {
    if (p.sys === 'skin') return { visible: false };
    if (isHard(p)) return { visible: true, opacity: 1 };
    if (isSoft(p)) return ids.has(p.id) ? { visible: true, opacity: 0.38 } : { visible: false };
    return { visible: false };
  };
  const n = attach.showAttachments(muscles);
  const total = n.o + n.i + n.b;
  toast(total ? t('在 {n} 塊骨頭上標出了附著位置', { n: total }) : t('這條肌肉沒有貼在骨頭上的部分（或模型上離骨頭太遠），所以沒有顏色'));
  const right = (list) => { const r = list.filter((p) => p.side !== 'L'); return r.length ? r : list; };
  const m = right(muscles), bones = right(attach.paintedBones());
  core.focusParts(m, outwardDir(m), { pad: bones.length ? 1.7 : 1.5 });
  render();
}

// ---------------------------------------------------------------- panel: tools

function savedViews() { return store.get('views', []); }
function captureView(name) {
  const s = app.state;
  return {
    name, cam: core.cameraState(), groups: JSON.parse(JSON.stringify(s.groups)), side: s.side,
    hidden: app.parts.filter((p) => p.user === HIDDEN).map((p) => p.id),
    ghost: app.parts.filter((p) => p.user === GHOST).map((p) => p.id),
    sel: [...s.selection],
  };
}
function applyView(v) {
  setMode('normal');
  core.pushUndo();
  const hidden = new Set(v.hidden), ghost = new Set(v.ghost);
  for (const p of app.parts) p.user = hidden.has(p.id) ? HIDDEN : ghost.has(p.id) ? GHOST : NORMAL;
  for (const id of Object.keys(app.state.groups)) if (v.groups[id]) Object.assign(app.state.groups[id], v.groups[id]);
  app.state.side = v.side || 'all'; app.state.regionOnly = null;
  core.select((v.sel || []).filter((id) => app.byId.has(id)));
  core.applyCameraState(v.cam);
  core.emit('groups');
}
function shareLink() {
  const s = app.state, c = core.cameraState();
  const q = new URLSearchParams({
    g: GROUPS.map((x) => (s.groups[x.id].on ? 1 : 0)).join(''),
    c: [...c.p, ...c.t].map((n) => n.toFixed(3)).join(','),
    lang: getLang(),
  });
  if (s.selection.size) q.set('s', [...s.selection].slice(0, 30).join('.'));
  return location.origin + location.pathname + '#' + q.toString();
}
export function applyHash() {
  if (location.hash.length < 3) return false;
  const q = new URLSearchParams(location.hash.slice(1));
  const g = q.get('g'), c = q.get('c'), s = q.get('s');
  if (g && g.length === GROUPS.length) GROUPS.forEach((x, i) => { app.state.groups[x.id].on = g[i] === '1'; });
  core.refresh(); core.emit('groups');
  if (s) { const parts = s.split('.').map((id) => app.byId.get(id)).filter(Boolean); core.reveal(parts); core.select(parts.map((p) => p.id)); }
  const n = c ? c.split(',').map(Number) : [];
  if (n.length === 6 && n.every(Number.isFinite)) { core.applyCameraState({ p: n.slice(0, 3), t: n.slice(3) }, 0); return true; }
  return false;
}

// Light when chosen here, otherwise whatever the device / host page uses.
function isLight() {
  const th = root.dataset.theme;
  return th ? th === 'light' : window.matchMedia('(prefers-color-scheme: light)').matches;
}

function toolsHtml() {
  const s = app.state, c = s.clip;
  const sw = (act, on, label) => `<button class="switch" role="switch" aria-checked="${on}" aria-label="${esc(label)}" data-act="${act}"></button>`;
  const opt = (act, on, title, sub) => `<div class="opt"><div class="txt"><b>${title}</b><small>${sub}</small></div>${sw(act, on, title)}</div>`;
  const views = savedViews();
  const notes = Object.entries(store.get('notes', {})).filter(([k, v]) => v && app.info[k]);
  return `
    <div class="h3" style="margin-top:4px">語言 · Language</div>
    <div class="seg">${[['zh', '繁體中文'], ['en', 'English']].map(([v, label]) => `<button data-act="lang" data-v="${v}" aria-pressed="${getLang() === v}">${label}</button>`).join('')}</div>

    <div class="h3">${t('顯示')}</div>
    ${opt('xray', s.xray, t('X 光模式'), t('全部變成半透明，一次看穿裡面'))}
    ${opt('labels', s.labels, t('名稱標籤'), t('選到的構造旁邊顯示名字'))}
    ${opt('autorotate', app.controls.autoRotate, t('自動旋轉'), t('模型自己慢慢轉'))}
    ${opt('theme', isLight(), t('淺色背景'), t('白天或投影時比較清楚'))}

    <div class="h3">${t('切開來看（切面）')}</div>
    <div class="opt"><div class="txt"><b>${t('打開切面')}</b><small>${t('像切蛋糕一樣把身體切開，看裡面一層一層')}</small></div>${sw('clip-on', c.on, t('打開切面'))}</div>
    <div ${c.on ? '' : 'style="opacity:.4;pointer-events:none"'}>
      <div class="seg" style="margin:8px 0">${[['x', t('左右切')], ['y', t('上下切')], ['z', t('前後切')]].map(([v, label]) => `<button data-act="clip-axis" data-v="${v}" aria-pressed="${c.axis === v}">${label}</button>`).join('')}</div>
      <input type="range" min="0" max="100" value="${Math.round(c.pos * 100)}" data-act="clip-pos" aria-label="${t('切面位置')}">
      <button class="btn wide" data-act="clip-flip">${t('換看另一邊')}</button>
    </div>

    <div class="h3">${t('分解圖（把零件散開）')}</div>
    <input type="range" min="0" max="100" value="${Math.round(s.explode * 100)}" data-act="explode" aria-label="${t('分解程度')}">

    <div class="h3">${t('儲存與分享')}</div>
    <div class="grid3">
      <button class="btn" data-act="shot">${icon('camera')}${t('截圖')}</button>
      ${window.claude ? '' : `<button class="btn" data-act="share">${icon('share')}${t('分享')}</button>`}
      <button class="btn" data-act="save-view">${icon('bookmark')}${t('存畫面')}</button>
    </div>
    ${views.length ? `<div class="h3">${t('我存的畫面')}</div>` + views.map((v, i) => `<div class="saved"><button data-act="load-view" data-i="${i}">${esc(v.name)}</button><button class="icon-btn" data-act="del-view" data-i="${i}" aria-label="${t('刪除')}">${icon('x')}</button></div>`).join('') : ''}
    ${notes.length ? `<div class="h3">${t('我寫過筆記的構造')}</div><div class="chips">${notes.map(([k]) => `<button class="chip" data-act="tree-go" data-key="${esc(k)}">${esc(keyName(k))}</button>`).join('')}</div>` : ''}

    <div class="h3">${t('其他')}</div>
    <div class="grid2"><button class="btn" data-act="help">${icon('help')}${t('操作教學')}</button><button class="btn" data-act="about">${icon('info')}${t('關於與授權')}</button></div>`;
}

function showHelp() {
  modal(`<h2>${t('怎麼玩')}</h2>
    <div class="gesture">
      <b>${t('一根手指')}</b><span>${t('在模型上滑：轉動模型')}</span>
      <b>${t('兩根手指')}</b><span>${t('張開或捏合：放大縮小；一起移動：搬動模型')}</span>
      <b>${t('點一下')}</b><span>${t('選一塊肌肉或骨頭，它會變亮藍色')}</span>
      <b>${t('點兩下')}</b><span>${t('飛過去靠近看')}</span>
      <b>${t('右邊剝層')}</b><span>${t('像剝洋蔥，一層一層往裡面看')}</span>
      <b>${t('滑鼠')}</b><span>${t('左鍵轉、右鍵搬、滾輪放大縮小')}</span>
    </div>
    <p class="hint">${t('選到東西後，下面會出現工具：隱藏、變透明、只看這個、其他變淡。左邊的箭頭可以復原上一步。')}</p>
    <div class="grid2"><button class="btn" data-act-lang="${getLang() === 'en' ? 'zh' : 'en'}">${getLang() === 'en' ? '繁體中文' : 'English'}</button><button class="btn primary" data-close>${t('開始')}</button></div>`);
}
function showAbout() {
  modal(`<h2>${t('關於')}</h2>
    <p>${t('Body Decomposition 是給物理治療學習用的 3D 肌肉骨骼分層圖，共 {n} 個可以點選的構造。', { n: app.parts.length })}</p>
    <p class="hint"><b>${t('3D 模型')}</b>${t('：')}${t('BodyParts3D, © The Database Center for Life Science（日本生命科學資料庫中心），以 CC 姓名標示-相同方式分享 2.1 日本 授權。本專案將原始模型簡化、壓縮後使用，衍生的模型檔沿用相同授權。')}</p>
    <p class="hint"><b>${t('文字說明')}</b>${t('：')}${t('依一般解剖學教科書內容整理，僅供學習參考，不能取代專業醫療判斷。神經根節與附著點細節各教科書略有出入。')}</p>
    <p class="hint"><b>${t('程式')}</b>${t('：')}${t('使用 three.js（MIT 授權）。')}</p>
    <button class="btn primary wide" data-close>${t('關閉')}</button>`);
}
function modal(html) {
  const el = document.createElement('div');
  el.className = 'modal';
  el.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true">${html}</div>`;
  el.addEventListener('click', (e) => {
    const lb = e.target.closest('[data-act-lang]');
    if (lb) { el.remove(); changeLang(lb.dataset.actLang).then(showHelp); return; }
    if (e.target === el || e.target.closest('[data-close]')) el.remove();
  });
  document.body.appendChild(el);
  el.querySelector('[data-close]')?.focus();
}

let rotateHook = null;
function setAutoRotate(v) {
  app.controls.autoRotate = v; app.controls.autoRotateSpeed = 1.2;
  if (v && !rotateHook) { rotateHook = () => core.requestRender(); core.addFrameHook(rotateHook); }
  if (!v && rotateHook) { core.removeFrameHook(rotateHook); rotateHook = null; }
}

// ---------------------------------------------------------------- language

function applyLangToPage() {
  root.lang = getLang() === 'en' ? 'en' : 'zh-Hant';
  applyStatic();
  langBtn.textContent = getLang() === 'en' ? '中' : 'EN';
  langBtn.setAttribute('aria-label', getLang() === 'en' ? '切換成繁體中文' : 'Switch to English');
  buildPeel();
  if (app.ready) buildSearchIndex();
  if (tab) sheetTitle.textContent = tabTitle(tab);
  render();
  updateSelbar();
  core.requestRender();
}
async function changeLang(l) {
  if (l === getLang()) return;
  try { await core.loadText(l); } catch { toast(l === 'en' ? 'Could not load the English text. Check your connection.' : '中文說明載入失敗，請檢查網路。'); return; }
  setLang(l);
  store.set('lang', l);
  applyLangToPage();
}
langBtn.addEventListener('click', () => changeLang(getLang() === 'en' ? 'zh' : 'en'));

// ---------------------------------------------------------------- actions

const actions = {
  'group-toggle': (el) => { if (mode !== 'normal') setMode('normal'); core.setGroup(el.dataset.id, { on: el.getAttribute('aria-checked') !== 'true' }); },
  side: (el) => { core.pushUndo(); app.state.side = el.dataset.v; core.refresh(); render(); },
  'tree-go': (el) => spotlightKey(el.dataset.key),
  'tree-eye': (el) => {
    const parts = app.byKey.get(el.dataset.key) || [];
    const hidden = parts.every((p) => p.user === HIDDEN);
    core.setUser(parts, hidden ? NORMAL : HIDDEN);
    if (hidden) core.reveal(parts);
    const item = el.closest('.tree-item');
    item.dataset.hidden = String(!hidden);
    el.innerHTML = icon(hidden ? 'eye' : 'eye-off');
  },
  region: (el) => goRegion(el.dataset.id),
  'region-only': () => { regionOnly = !regionOnly; goRegion(activeRegion); },
  mgroup: (el) => {
    const it = MUSCLE_GROUPS[el.dataset.c].items[el.dataset.i];
    const parts = groupParts(it);
    spotlight(parts);
    toast(t('{name}：亮起來的就是（共 {n} 條）', { name: L(it.name), n: new Set(parts.map((p) => p.key)).size }));
  },
  gview: (el) => { groupView = el.dataset.v; render(); sheetBody.scrollTop = 0; },
  nerve: (el) => {
    const n = nerveById(el.dataset.id), parts = nerveParts(n.id);
    spotlight(parts);
    toast(t('{name}：亮起來的就是（共 {n} 條）', { name: L(n.name), n: countKeys(parts) }));
  },
  root: (el) => {
    const parts = rootParts(el.dataset.id);
    spotlight(parts);
    toast(t('{name}：亮起來的就是（共 {n} 條）', { name: el.dataset.id, n: countKeys(parts) }));
  },
  'info-motion': (el) => {
    const mk = motionKeys.get(el.dataset.id); if (!mk) return;
    const side = core.selectedParts()[0]?.side;
    if (side === 'L' || side === 'R') motionSide = side;
    startMotion(mk.m, mk.both);
    openTab('motions');
  },
  iview: (el) => { infoView = el.dataset.v; render(); sheetBody.scrollTop = 0; },
  mview: (el) => { motionView = el.dataset.v; render(); sheetBody.scrollTop = 0; },
  exercise: (el) => {
    const ex = exerciseById(el.dataset.id); if (!ex) return;
    const side = core.selectedParts()[0]?.side;
    if (side === 'L' || side === 'R') exSide = side;
    motionView = 'exercise';
    startExercise(ex);
    openTab('motions');
  },
  'ex-side': (el) => { exSide = el.dataset.v; startExercise(activeExercise); },
  'ex-view': (el) => { exView = el.dataset.v; openVideo = null; render(); },
  video: (el) => { openVideo = el.dataset.id; render(); },
  'ex-focus': () => { exFocus = !exFocus; core.refresh(); render(); },
  'ex-exit': () => { setMode('normal'); render(); sheetBody.scrollTop = 0; },
  'ex-muscle': (el) => { const p = app.byId.get(el.dataset.id); const both = activeExercise?.both; setMode('normal'); spotlight(both ? app.byKey.get(p.key) : [p]); openTab('info'); },
  'ex-joint': (el) => { const mk = motionKeys.get(el.dataset.id); if (!mk) return; motionSide = exSide; motionView = 'joint'; startMotion(mk.m, mk.both); render(); sheetBody.scrollTop = 0; },
  motion: (el) => { const c = MOTIONS[el.dataset.c]; startMotion(c.items[el.dataset.i], c.both); },
  'motion-play': () => { if (playing) stopPlayer(); else startPlayer(); render(); },
  'motion-side': (el) => { motionSide = el.dataset.v; startMotion(activeMotion, motionBoth); },
  'motion-focus': () => { motionFocus = !motionFocus; core.refresh(); render(); },
  'motion-exit': () => { setMode('normal'); render(); sheetBody.scrollTop = 0; },
  'motion-muscle': (el) => { const p = app.byId.get(el.dataset.id); const both = motionBoth; setMode('normal'); spotlight(both ? app.byKey.get(p.key) : [p]); openTab('info'); },
  info: () => openTab('info'),
  'info-one': (el) => { core.select((app.byKey.get(el.dataset.key) || []).filter((p) => app.state.selection.has(p.id)).map((p) => p.id)); },
  'info-both': () => {
    const parts = core.selectedParts(); const all = app.byKey.get(parts[0].key);
    core.select(parts.length > 1 ? [(all.find((p) => p.side === 'R') || all[0]).id] : all.map((p) => p.id));
  },
  'info-family': (el) => {
    const sel = core.selectedParts(); const sides = new Set(sel.map((p) => p.side));
    const parts = familyKeys(el.dataset.key).flatMap((k) => app.byKey.get(k)).filter((p) => sides.has(p.side));
    core.select(parts.map((p) => p.id));
    core.focusParts(parts, outwardDir(parts), { pad: 1.7 });
  },
  'info-focus': () => { const p = core.selectedParts(); core.focusParts(p, outwardDir(p), { pad: 1.8 }); },
  attach: () => toggleAttach(),
  speak: (el) => {
    if (!('speechSynthesis' in window)) return toast(t('這個瀏覽器不支援朗讀'));
    const u = new SpeechSynthesisUtterance(el.dataset.text); u.lang = 'en-US'; u.rate = 0.9;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  },
  lang: (el) => changeLang(el.dataset.v),
  xray: () => { app.state.xray = !app.state.xray; core.refresh(); render(); },
  labels: () => { app.state.labels = !app.state.labels; core.requestRender(); render(); },
  autorotate: () => { setAutoRotate(!app.controls.autoRotate); render(); },
  theme: () => { const th = isLight() ? 'dark' : 'light'; root.dataset.theme = th; store.set('theme', th); render(); },
  'clip-on': () => { app.state.clip.on = !app.state.clip.on; core.refresh(); render(); },
  'clip-axis': (el) => { app.state.clip.axis = el.dataset.v; app.state.clip.pos = 0.5; core.refresh(); render(); },
  'clip-flip': () => { app.state.clip.flip = !app.state.clip.flip; core.refresh(); },
  shot: async () => {
    const blob = await core.screenshot(getComputedStyle(root).getPropertyValue('--bg0').trim());
    const url = URL.createObjectURL(blob);
    modal(`<h2>${t('截圖')}</h2><img src="${url}" alt="${t('目前畫面的截圖')}" style="max-width:100%;max-height:52vh;border-radius:10px;display:block;margin:10px auto">
      <p class="hint">${t('手機：長按圖片就能儲存或分享。電腦：按下面的按鈕下載。')}</p>
      <div class="grid2"><a class="btn primary" href="${url}" download="body-decomposition-${Date.now()}.png">${t('下載圖片')}</a><button class="btn" data-close>${t('關閉')}</button></div>`);
  },
  share: async () => {
    const url = shareLink();
    try {
      if (navigator.share) await navigator.share({ title: 'Body Decomposition', url });
      else { await navigator.clipboard.writeText(url); toast(t('連結已複製，貼給別人就能看到同一個畫面')); }
    } catch { history.replaceState(null, '', url); toast(t('連結已放到網址列，可以直接複製')); }
  },
  'save-view': () => {
    const views = savedViews();
    const name = selectionTitle(core.selectedParts()).name || L(REGIONS.find((r) => r.id === activeRegion)?.name || ['畫面', 'View']);
    const when = new Date().toLocaleString(getLang() === 'en' ? 'en' : 'zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    views.unshift(captureView(`${name} · ${when}`));
    store.set('views', views.slice(0, 30)); render(); toast(t('畫面存好了，在下面的清單裡'));
  },
  'load-view': (el) => { const v = savedViews()[el.dataset.i]; if (v) { applyView(v); render(); } },
  'del-view': (el) => { const views = savedViews(); views.splice(el.dataset.i, 1); store.set('views', views); render(); },
  help: showHelp,
  about: showAbout,
};

sheetBody.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]'); if (!el || el.matches('input, textarea')) return;
  const a = el.dataset.act;
  if (a.startsWith('quiz-')) return quiz.act(a, el);
  actions[a]?.(el, e);
});
sheetBody.addEventListener('input', (e) => {
  const el = e.target; const a = el.dataset?.act;
  if (a === 'group-op') {
    core.setGroup(el.dataset.id, { op: el.value / 100 }, { undoable: false });
    el.nextElementSibling.textContent = el.value + '%';
  } else if (a === 'clip-pos') { app.state.clip.pos = el.value / 100; core.refresh(); }
  else if (a === 'explode') core.setExplode(el.value / 100);
  else if (a === 'motion-t') {
    if (playing) { stopPlayer(); render(); }
    playT = el.value / 100; motion.setMotionT(playT);
    const o = $('#motion-o'); if (o) o.textContent = el.value + '%';
  } else if (a === 'note') {
    const notes = store.get('notes', {});
    if (el.value.trim()) notes[el.dataset.key] = el.value; else delete notes[el.dataset.key];
    store.set('notes', notes);
  }
});
sheetBody.addEventListener('change', (e) => { if (e.target.dataset?.act === 'motion-t') motion.settleMotion(); });
sheetBody.addEventListener('toggle', (e) => {
  const d = e.target;
  if (d.matches?.('details.tree') && d.open) d.querySelector('.tree-body').innerHTML = treeBodyHtml(d.dataset.sys);
}, true);

tabs.addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]'); if (!b) return;
  if (tab === b.dataset.tab) closeSheet(); else openTab(b.dataset.tab);
});
$('#sheet-close').addEventListener('click', closeSheet);
desktop.addEventListener('change', syncLayout);
window.addEventListener('resize', syncLayout);

document.addEventListener('keydown', (e) => {
  if (e.target.matches('input, textarea')) return;
  const k = e.key.toLowerCase();
  if (k === '/') { e.preventDefault(); $('#q').focus(); }
  else if (k === 'escape') { if (app.state.selection.size) core.select([]); else closeSheet(); }
  else if (k === 'z' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); core.undo(); render(); }
  else if (mode === 'normal' && app.state.selection.size) {
    if (k === 'h') core.hideSelected();
    else if (k === 't') core.ghostSelected();
    else if (k === 'i') core.isolateSelected(HIDDEN);
    else if (k === 'f') { const p = core.selectedParts(); core.focusParts(p, outwardDir(p), { pad: 1.8 }); }
  }
});

// ---------------------------------------------------------------- start

// Language to start in: a shared link, then the saved choice, then the
// browser's own language.
export function initialLang() {
  const fromUrl = new URLSearchParams(location.hash.slice(1)).get('lang') || new URLSearchParams(location.search).get('lang');
  const saved = store.get('lang', null);
  const pick = fromUrl || saved || ((navigator.language || 'zh').toLowerCase().startsWith('zh') ? 'zh' : 'en');
  return pick === 'en' ? 'en' : 'zh';
}

export function initUI() {
  const savedTheme = store.get('theme', null);
  if (savedTheme === 'light' || savedTheme === 'dark') root.dataset.theme = savedTheme;
  applyLangToPage();
  setupSearch();
  quiz = createQuiz({
    store, toast, outwardDir, spotlightKey,
    rerender: () => { if (tab === 'quiz') render(); },
    enter: () => { setMode('normal'); mode = 'quiz'; core.select([], { silent: true }); updateSelbar(); },
    leave: () => { mode = 'normal'; updateSelbar(); },
  });

  on('tap', ({ part, shift }) => {
    if (mode === 'quiz') { if (quiz.running()) quiz.tap(part); return; }
    if (!part) { if (!app.state.multi) core.select([]); return; }
    if (app.state.multi || shift) core.toggleSelect(part.id);
    else core.select([part.id]);
  });
  on('selection', () => {
    if (mode === 'attach') { attach.clearAttachments(); app.state.overlay = null; mode = 'normal'; core.refresh(); }
    updateSelbar();
    if (tab === 'info') render();
    else if (desktop.matches && app.state.selection.size && (tab === null || tab === 'layers') && mode === 'normal') openTab('info');
  });
  on('groups', () => { syncPeel(); if (tab === 'layers') render(); });
  const tip = $('#tip');
  on('hover', ({ part, x, y }) => {
    if (mode === 'quiz' || !part) { core.setHover(null); tip.hidden = true; return; }
    core.setHover(part.id);
    tip.textContent = part.name; tip.hidden = false;
    tip.style.transform = `translate(${x + 14}px, ${y + 16}px)`;
  });
  on('undo', (n) => { $('#views [data-act="undo"]').disabled = !n; });
  on('ready', () => {
    buildSearchIndex();
    buildMotionIndex();
    syncPeel();
    const fromLink = applyHash();
    if (!fromLink) core.resetView();
    if (desktop.matches) openTab('layers');
    if (!store.get('seenHelp', false)) { showHelp(); store.set('seenHelp', true); }
  });
  syncLayout();
}
