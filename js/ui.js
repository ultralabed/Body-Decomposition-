// All DOM / interaction code. The 3D work happens in core.js, motion.js and
// attach.js; this file wires buttons and panels to them.

import * as THREE from '../vendor/three.module.min.js';
import * as core from './core.js';
import { app, on, NORMAL, GHOST, HIDDEN } from './core.js';
import { GROUPS, PEEL, SYS_ZH, LAYER_ZH, REGION_ZH, REGION_ORDER, REGIONS, MUSCLE_GROUPS, MOTIONS } from './catalog.js';
import * as motion from './motion.js';
import * as attach from './attach.js';
import { createQuiz } from './quiz.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const icon = (n) => `<svg class="ic"><use href="#i-${n}"/></svg>`;
const store = {
  get(k, d) { try { const v = localStorage.getItem('bd.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('bd.' + k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};

const root = document.documentElement;
const sheet = $('#sheet'), sheetBody = $('#sheet-body'), sheetTitle = $('#sheet-title');
const selbar = $('#selbar'), tabs = $('#tabs'), peelEl = $('#peel'), toastEl = $('#toast');
const desktop = window.matchMedia('(min-width: 900px)');

const TAB_TITLES = { layers: '圖層', regions: '部位', groups: '肌群', motions: '關節動作', quiz: '測驗', tools: '工具', info: '說明' };
const PRIME = new THREE.Color('#ffb703'), ASSIST = new THREE.Color('#36c5c0');
const isSoft = (p) => p.sys === 'muscle' || p.sys === 'tendon';
const isHard = (p) => p.sys === 'bone' || p.sys === 'joint';

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
  sheetTitle.textContent = TAB_TITLES[name];
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
  const keep = sheetBody.scrollTop;
  sheetBody.innerHTML = ({ layers: layersHtml, regions: regionsHtml, groups: groupsHtml, motions: motionsHtml, quiz: () => quiz.html(), tools: toolsHtml, info: infoHtml })[tab]();
  sheetBody.scrollTop = keep;
}

function setMode(m) {
  if (mode === m) return;
  if (mode === 'attach') attach.clearAttachments();
  if (mode === 'motion') { stopPlayer(); motion.stopMotion(); activeMotion = null; }
  if (mode === 'quiz') quiz.stop();
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
function commonPrefix(list) {
  if (!list.length) return '';
  let p = list[0];
  for (const s of list) { let i = 0; while (i < p.length && i < s.length && p[i] === s[i]) i++; p = p.slice(0, i); }
  return p;
}
function selectionTitle(parts) {
  if (!parts.length) return { zh: '', en: '' };
  if (parts.length === 1) return { zh: parts[0].zh, en: parts[0].en };
  const keys = [...new Set(parts.map((p) => p.key))];
  if (keys.length === 1) return { zh: parts[0].info.zh + '（左右兩側）', en: keys[0] };
  const fam = familyKeys(keys[0]);
  if (keys.every((k) => fam.includes(k))) {
    const pre = commonPrefix(keys.map((k) => app.info[k].zh));
    if (pre.length >= 2) return { zh: `${pre}（${keys.length} 個部分）`, en: keys[0].replace(/^.*\b(?:head|part|belly) of /, '') };
  }
  return { zh: `已選 ${parts.length} 個構造`, en: keys.slice(0, 3).map((k) => app.info[k].zh).join('、') + (keys.length > 3 ? '…' : '') };
}

// ---------------------------------------------------------------- peel + views

function buildPeel() {
  const sw = ['#dfae8f', '#c5483c', '#a8383a', '#8a2d38', '#e3d6b8'];
  peelEl.innerHTML = '<div class="cap">剝層</div>' + PEEL.map((n, i) => `<button data-peel="${i}" style="--sw:${sw[i]}" aria-pressed="false">${n}</button>`).join('');
  peelEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-peel]'); if (!b) return;
    if (mode !== 'normal') setMode('normal');
    core.setPeel(Number(b.dataset.peel));
  });
}
function syncPeel() {
  const lv = core.peelLevel();
  for (const b of peelEl.querySelectorAll('[data-peel]')) b.setAttribute('aria-pressed', String(Number(b.dataset.peel) === lv));
}

$('#views').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.view) core.setView(b.dataset.view);
  else if (b.dataset.act === 'reset') core.resetView();
  else if (b.dataset.act === 'undo') { if (mode !== 'normal') setMode('normal'); core.undo(); render(); }
  else if (b.dataset.act === 'showall') { setMode('normal'); core.showAll(); core.select([]); regionOnly = false; render(); toast('全部都回來了'); }
});

// ---------------------------------------------------------------- search

function buildSearch() {
  searchIndex = [...app.byKey.entries()].map(([key, parts]) => ({
    key, parts, zh: parts[0].info.zh, en: key.toLowerCase(), sys: parts[0].sys, color: '#' + parts[0].color.getHexString(),
    tag: (SYS_ZH[parts[0].sys] || '').split('／')[0] + (parts[0].layer ? '·' + LAYER_ZH[parts[0].layer] : ''),
  }));
  const input = $('#q'), results = $('#results'), clear = $('#q-clear');
  const run = () => {
    const raw = input.value.trim();
    clear.hidden = !raw;
    if (!raw) { results.hidden = true; return; }
    const q = raw.toLowerCase().replace(/^[左右]/, '') || raw.toLowerCase();
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
    scored.sort((a, b) => a[0] - b[0] || a[1].zh.length - b[1].zh.length);
    results.hidden = false;
    results.innerHTML = scored.length
      ? scored.slice(0, 40).map(([, e]) => `<button class="res" data-key="${esc(e.key)}"><i class="dot" style="background:${e.color}"></i><span><b>${esc(e.zh)}</b><small>${esc(e.key)}</small></span><span class="tag">${e.tag}</span></button>`).join('')
      : '<div class="res-empty">找不到，換個字試試（例如「二頭」或 biceps）</div>';
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
    toast('其他構造已變淡。按左邊的「全部顯示」可以恢復');
  });
  document.addEventListener('pointerdown', (e) => { if (!e.target.closest('#top')) results.hidden = true; });
}

// ---------------------------------------------------------------- selection bar

function updateSelbar() {
  const parts = core.selectedParts();
  if (!parts.length || mode === 'quiz') { selbar.hidden = true; return; }
  const t = selectionTitle(parts);
  const btn = (act, ic, label, pressed) => `<button data-act="${act}"${pressed !== undefined ? ` aria-pressed="${pressed}"` : ''}>${icon(ic)}${label}</button>`;
  selbar.hidden = false;
  selbar.innerHTML = `<button class="sel-name" data-act="info"><b>${esc(t.zh)}</b><small>${esc(t.en)}</small><span class="more">說明${icon('chev')}</span></button>
    <div class="sel-tools">
      ${btn('hide', 'eye-off', '隱藏')}${btn('ghost', 'ghost', '變透明')}${btn('isolate', 'target', '只看這個')}
      ${btn('fade-others', 'contrast', '其他變淡')}${btn('focus', 'pin', '靠近看')}${btn('multi', 'multi', '多選', app.state.multi)}
    </div>`;
}

selbar.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act;
  if (a === 'info') return openTab('info');
  if (a === 'multi') { app.state.multi = !app.state.multi; updateSelbar(); toast(app.state.multi ? '多選開啟：一個一個點，可以選很多個' : '多選關閉'); return; }
  if (a === 'focus') { const p = core.selectedParts(); return core.focusParts(p, outwardDir(p), { pad: 1.8 }); }
  if (mode !== 'normal') setMode('normal');
  if (a === 'hide') { core.hideSelected(); toast('已隱藏。按左邊的復原箭頭可以叫回來'); }
  else if (a === 'ghost') core.ghostSelected();
  else if (a === 'isolate') core.isolateSelected(HIDDEN);
  else if (a === 'fade-others') core.isolateSelected(GHOST);
  render();
});

// ---------------------------------------------------------------- panel: layers

function layersHtml() {
  const g = app.state.groups;
  const rows = GROUPS.map((x) => {
    const s = g[x.id];
    return `<div class="layer" data-off="${!s.on}">
      <div class="row"><button class="switch" role="switch" aria-checked="${s.on}" aria-label="${x.zh}" data-act="group-toggle" data-id="${x.id}"></button>
        <div class="txt"><b>${x.zh}</b><small>${x.hint}</small></div></div>
      <div class="op"><input type="range" min="5" max="100" step="5" value="${Math.round(s.op * 100)}" data-act="group-op" data-id="${x.id}" aria-label="${x.zh}透明度"><span>${Math.round(s.op * 100)}%</span></div>
    </div>`;
  }).join('');
  const side = app.state.side;
  const counts = {};
  for (const [, parts] of app.byKey) counts[parts[0].sys] = (counts[parts[0].sys] || 0) + 1;
  const tree = ['muscle', 'tendon', 'bone', 'joint', 'organ', 'vessel', 'nerve', 'skin'].map((sys) =>
    `<details class="tree" data-sys="${sys}"><summary>${icon('chev')}${SYS_ZH[sys]}<small>${counts[sys] || 0} 種</small></summary><div class="tree-body"></div></details>`).join('');
  return `<p class="hint">打開或關掉每一層，拉桿可以讓它變透明。右邊的「剝層」是一鍵版本。</p>
    ${rows}
    <div class="h3">只看身體的一邊</div>
    <div class="seg">${[['all', '兩邊'], ['R', '只看右邊'], ['L', '只看左邊']].map(([v, t]) => `<button data-act="side" data-v="${v}" aria-pressed="${side === v}">${t}</button>`).join('')}</div>
    <div class="h3">全部構造清單（點名字會帶你去看）</div>
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
  let html = '';
  for (const r of REGION_ORDER) {
    const list = byRegion.get(r); if (!list) continue;
    list.sort((a, b) => a[1][0].info.zh.localeCompare(b[1][0].info.zh, 'zh-Hant'));
    html += `<div class="tree-sub">${REGION_ZH[r]}</div>` + list.map(([key, parts]) => {
      const hidden = parts.every((p) => p.user === HIDDEN);
      return `<div class="tree-item" data-hidden="${hidden}"><button data-act="tree-go" data-key="${esc(key)}"><b>${esc(parts[0].info.zh)}</b><small>${esc(key)}</small></button>
        <button class="icon-btn" data-act="tree-eye" data-key="${esc(key)}" aria-label="顯示或隱藏">${icon(hidden ? 'eye-off' : 'eye')}</button></div>`;
    }).join('');
  }
  return html;
}

// ---------------------------------------------------------------- panel: regions

function regionBox(r) {
  if (r.anchor) {
    const L = motion.landmarks('R');
    if (L) return new THREE.Box3().setFromCenterAndSize(L[r.anchor], new THREE.Vector3(r.r * 2, r.r * 2, r.r * 2));
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
  return `<p class="hint">點一下就飛過去看那個部位（手腳以右邊為主）。</p>
    <div class="grid3">${REGIONS.map((r) => `<button class="btn" data-act="region" data-id="${r.id}" aria-pressed="${activeRegion === r.id}">${r.zh}</button>`).join('')}</div>
    <div class="opt" style="margin-top:10px"><div class="txt"><b>只顯示這個部位</b><small>把其他部位的肌肉骨頭先收起來，畫面比較乾淨</small></div>
      <button class="switch" role="switch" aria-checked="${regionOnly}" aria-label="只顯示這個部位" data-act="region-only"></button></div>`;
}

// ---------------------------------------------------------------- panel: muscle groups

function groupParts(item) {
  const re = new RegExp(item.match);
  return app.parts.filter((p) => isSoft(p) && re.test(p.key));
}
function groupsHtml() {
  return `<p class="hint">常一起工作的肌肉。點一下，這群肌肉會亮起來，其他的會變淡。</p>` +
    MUSCLE_GROUPS.map((c, ci) => `<div class="h3">${c.cat}</div>` + c.items.map((it, ii) =>
      `<button class="card-btn" data-act="mgroup" data-c="${ci}" data-i="${ii}"><b>${it.zh}</b><em>${it.en}</em><small>${it.kid}</small></button>`).join('')).join('');
}

// ---------------------------------------------------------------- panel: motions

let activeMotion = null, motionBoth = false, motionSide = 'R', motionFocus = true;
let playing = false, playT = 0, playDir = 1, playHold = 0, primeSet = new Set(), assistSet = new Set();

function motionOverlay(p) {
  if (p.sys === 'skin') return { visible: false };
  if (primeSet.has(p)) return { visible: true, opacity: 1, tint: PRIME };
  if (assistSet.has(p)) return { visible: true, opacity: 1, tint: ASSIST };
  if (motionFocus && isSoft(p)) return { opacity: 0.06, pickable: false };
  if (isHard(p)) return { visible: true };
  return null;
}
function motionBox(m, side) {
  const joint = m.steps[m.steps.length - 1].joint;
  if (m.planted) return app.bounds.clone();
  if (joint === 'trunk') { const b = app.bounds.clone(); b.min.y = 0.55; return b; }
  if (joint === 'neck') { const b = app.bounds.clone(); b.min.y = 1.22; b.min.x = -0.2; b.max.x = 0.2; return b; }
  const L = motion.landmarks(side);
  const r = { shoulder: 0.42, elbow: 0.3, wrist: 0.2, hip: 0.6, knee: 0.48, ankle: 0.24 }[joint] || 0.4;
  const c = L[joint].clone();
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
const easeInOut = (t) => t * t * (3 - 2 * t);
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

function motionsHtml() {
  if (!activeMotion) {
    return `<p class="hint">選一個動作：模型會動給你看，而且把「負責出力的肌肉」亮起來。</p>` +
      MOTIONS.map((c, ci) => `<div class="h3">${c.cat}</div><div class="grid2">` + c.items.map((m, mi) =>
        `<button class="btn" data-act="motion" data-c="${ci}" data-i="${mi}">${m.zh}</button>`).join('') + '</div>').join('');
  }
  const m = activeMotion;
  const chip = (p, cls) => `<button class="chip ${cls}" data-act="motion-muscle" data-id="${p.id}">${esc(p.zh)}</button>`;
  const uniq = (set) => { const seen = new Set(); return [...set].filter((p) => (motionBoth ? !seen.has(p.key) && seen.add(p.key) : true)); };
  const name = (p) => (motionBoth ? { ...p, zh: p.info.zh } : p);
  return `<div class="info"><h3>${m.zh}</h3><div class="en">${m.en}</div></div>
    <div class="kid">${m.kid}</div>
    <dl class="facts"><dt>正常角度</dt><dd>${m.rom}</dd></dl>
    <div class="player"><button class="btn primary" data-act="motion-play" aria-label="${playing ? '暫停' : '播放'}">${icon(playing ? 'pause' : 'play')}</button>
      <input id="motion-t" type="range" min="0" max="100" value="${Math.round(playT * 100)}" data-act="motion-t" aria-label="動作進度"><output id="motion-o">${Math.round(playT * 100)}%</output></div>
    ${motionBoth ? '' : `<div class="seg" style="margin-bottom:10px">${[['R', '右邊'], ['L', '左邊']].map(([v, t]) => `<button data-act="motion-side" data-v="${v}" aria-pressed="${motionSide === v}">${t}</button>`).join('')}</div>`}
    <div class="h3">主要出力的肌肉（金色）</div><div class="chips">${uniq(primeSet).map((p) => chip(name(p), 'prime')).join('')}</div>
    ${assistSet.size ? `<div class="h3">幫忙的肌肉（青色）</div><div class="chips">${uniq(assistSet).map((p) => chip(name(p), 'assist')).join('')}</div>` : ''}
    <div class="opt" style="margin-top:10px"><div class="txt"><b>其他肌肉變淡</b><small>只留下有出力的肌肉，比較好看清楚</small></div>
      <button class="switch" role="switch" aria-checked="${motionFocus}" aria-label="其他肌肉變淡" data-act="motion-focus"></button></div>
    <button class="btn wide" data-act="motion-exit" style="margin-top:12px">結束這個動作</button>
    <p class="fine">動作是用「彎曲變形」模擬的示意動畫，肌肉在關節附近的形狀只是近似，不是精確的生物力學模擬。</p>`;
}

// ---------------------------------------------------------------- panel: info

function infoHtml() {
  const parts = core.selectedParts();
  if (!parts.length) return `<p class="hint">還沒選東西。在模型上點一塊肌肉或骨頭，這裡就會出現它的說明。</p>`;
  const keys = [...new Set(parts.map((p) => p.key))];
  if (keys.length > 1) {
    return `<p class="hint">你選了 ${parts.length} 個構造。點名字看單一個的說明。</p>` +
      keys.map((k) => `<button class="card-btn" data-act="info-one" data-key="${esc(k)}"><b>${esc(app.info[k].zh)}</b><em>${esc(k)}</em><small>${esc(app.info[k].kid || '')}</small></button>`).join('') +
      (parts.every(isSoft) ? `<button class="btn wide" data-act="attach" aria-pressed="${mode === 'attach'}">${icon('pin')}${mode === 'attach' ? '關閉起點／止點' : '在骨頭上顯示起點／止點'}</button>${mode === 'attach' ? attachLegend() : ''}` : '');
  }
  const p = parts[0], inf = p.info, key = p.key;
  const title = parts.length === 1 ? p.zh : inf.zh;
  const en = parts.length === 1 ? p.en : key;
  const chips = [SYS_ZH[p.sys], p.layer ? LAYER_ZH[p.layer] : null, REGION_ZH[p.region], parts.length > 1 ? '左右兩側' : p.side === 'R' ? '右側' : p.side === 'L' ? '左側' : null]
    .filter(Boolean).map((c) => `<span class="chip">${c}</span>`).join('');
  const fact = (label, value, dot) => (value ? `<dt>${dot ? `<i style="background:var(--${dot})"></i>` : ''}${label}</dt><dd>${esc(value)}</dd>` : '');
  const facts = isSoft(p)
    ? `<dl class="facts">${fact('起點', inf.o, 'origin')}${fact('止點', inf.i, 'insert')}${fact('動作', inf.a)}${fact('神經支配', inf.n)}${fact('血液供應', inf.b)}</dl>`
    : '';
  const fam = familyKeys(key);
  const both = app.byKey.get(key).length > 1;
  const note = store.get('notes', {})[key] || '';
  const actions = [
    isSoft(p) ? `<button class="btn" data-act="attach" aria-pressed="${mode === 'attach'}">${icon('pin')}${mode === 'attach' ? '關閉起止點' : '看起點／止點'}</button>` : '',
    both ? `<button class="btn" data-act="info-both">${parts.length > 1 ? '只選右邊' : '左右一起選'}</button>` : '',
    fam.length > 1 ? `<button class="btn" data-act="info-family" data-key="${esc(key)}">選整塊肌肉（${fam.length} 部分）</button>` : '',
    `<button class="btn" data-act="info-focus">${icon('target')}靠近看</button>`,
  ].filter(Boolean).join('');
  return `<div class="info">
    <h3>${esc(title)}</h3>
    <div class="en">${esc(en)}<button class="icon-btn" data-act="speak" data-text="${esc(key)}" aria-label="唸出英文名稱" title="唸出英文名稱">${icon('speak')}</button></div>
    <div class="chips">${chips}</div>
    ${inf.kid ? `<div class="kid">${esc(inf.kid)}</div>` : ''}
    ${facts}
    ${inf.d ? `<div class="note">${esc(inf.d)}</div>` : ''}
    ${inf.c ? `<div class="note"><b>臨床重點　</b>${esc(inf.c)}</div>` : ''}
    <div class="grid2" style="margin:10px 0">${actions}</div>
    ${mode === 'attach' ? attachLegend() : ''}
    <div class="h3">我的筆記（只存在這台裝置）</div>
    <textarea data-act="note" data-key="${esc(key)}" placeholder="例如：觸診位置、牽拉方式、上課重點…">${esc(note)}</textarea>
    <p class="fine">模型編號 ${parts.map((x) => x.id).join('、')}</p>
  </div>`;
}
function attachLegend() {
  return `<div class="legend"><span><i style="background:var(--origin)"></i>紅色＝起點</span><span><i style="background:var(--insert)"></i>藍色＝止點</span><span><i style="background:var(--both)"></i>紫色＝兩端都在這塊骨頭</span></div>
    <p class="fine">顏色是用「肌肉離骨頭表面夠近的地方」自動算出來的，是大概位置；附在筋膜或其他肌肉上的部分不會顯示。</p>`;
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
  toast(total ? `在 ${total} 塊骨頭上標出了附著位置` : '這條肌肉沒有貼在骨頭上的部分（或模型上離骨頭太遠），所以沒有顏色');
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

function toolsHtml() {
  const s = app.state, c = s.clip;
  const sw = (act, on, label) => `<button class="switch" role="switch" aria-checked="${on}" aria-label="${label}" data-act="${act}"></button>`;
  const opt = (act, on, title, sub) => `<div class="opt"><div class="txt"><b>${title}</b><small>${sub}</small></div>${sw(act, on, title)}</div>`;
  const views = savedViews();
  const notes = Object.entries(store.get('notes', {})).filter(([k, v]) => v && app.info[k]);
  return `
    ${opt('xray', s.xray, 'X 光模式', '全部變成半透明，一次看穿裡面')}
    ${opt('labels', s.labels, '名稱標籤', '選到的構造旁邊顯示名字')}
    ${opt('autorotate', app.controls.autoRotate, '自動旋轉', '模型自己慢慢轉')}
    ${opt('theme', isLight(), '淺色背景', '白天或投影時比較清楚')}

    <div class="h3">切開來看（切面）</div>
    <div class="opt"><div class="txt"><b>打開切面</b><small>像切蛋糕一樣把身體切開，看裡面一層一層</small></div>${sw('clip-on', c.on, '切面')}</div>
    <div ${c.on ? '' : 'style="opacity:.4;pointer-events:none"'}>
      <div class="seg" style="margin:8px 0">${[['x', '左右切'], ['y', '上下切'], ['z', '前後切']].map(([v, t]) => `<button data-act="clip-axis" data-v="${v}" aria-pressed="${c.axis === v}">${t}</button>`).join('')}</div>
      <input type="range" min="0" max="100" value="${Math.round(c.pos * 100)}" data-act="clip-pos" aria-label="切面位置">
      <button class="btn wide" data-act="clip-flip">換看另一邊</button>
    </div>

    <div class="h3">分解圖（把零件散開）</div>
    <input type="range" min="0" max="100" value="${Math.round(s.explode * 100)}" data-act="explode" aria-label="分解程度">

    <div class="h3">儲存與分享</div>
    <div class="grid3">
      <button class="btn" data-act="shot">${icon('camera')}截圖</button>
      <button class="btn" data-act="share">${icon('share')}分享</button>
      <button class="btn" data-act="save-view">${icon('bookmark')}存畫面</button>
    </div>
    ${views.length ? `<div class="h3">我存的畫面</div>` + views.map((v, i) => `<div class="saved"><button data-act="load-view" data-i="${i}">${esc(v.name)}</button><button class="icon-btn" data-act="del-view" data-i="${i}" aria-label="刪除">${icon('x')}</button></div>`).join('') : ''}
    ${notes.length ? `<div class="h3">我寫過筆記的構造</div><div class="chips">${notes.map(([k]) => `<button class="chip" data-act="tree-go" data-key="${esc(k)}">${esc(app.info[k].zh)}</button>`).join('')}</div>` : ''}

    <div class="h3">其他</div>
    <div class="grid2"><button class="btn" data-act="help">${icon('help')}操作教學</button><button class="btn" data-act="about">${icon('info')}關於與授權</button></div>`;
}

function showHelp() {
  modal(`<h2>怎麼玩</h2>
    <div class="gesture">
      <b>一根手指</b><span>在模型上滑：轉動模型</span>
      <b>兩根手指</b><span>張開或捏合：放大縮小；一起移動：搬動模型</span>
      <b>點一下</b><span>選一塊肌肉或骨頭，它會變亮藍色</span>
      <b>點兩下</b><span>飛過去靠近看</span>
      <b>右邊剝層</b><span>像剝洋蔥，一層一層往裡面看</span>
      <b>滑鼠</b><span>左鍵轉、右鍵搬、滾輪放大縮小</span>
    </div>
    <p class="hint">選到東西後，下面會出現工具：隱藏、變透明、只看這個、其他變淡。左邊的箭頭可以復原上一步。</p>
    <button class="btn primary wide" data-close>開始</button>`);
}
function showAbout() {
  modal(`<h2>關於</h2>
    <p>Body Decomposition 是給物理治療學習用的 3D 肌肉骨骼分層圖，共 ${app.parts.length} 個可以點選的構造。</p>
    <p class="hint"><b>3D 模型</b>：BodyParts3D, © The Database Center for Life Science（日本生命科學資料庫中心），以 CC 姓名標示-相同方式分享 2.1 日本 授權。本專案將原始模型簡化、壓縮後使用，衍生的模型檔沿用相同授權。</p>
    <p class="hint"><b>文字說明</b>：依一般解剖學教科書內容整理，僅供學習參考，不能取代專業醫療判斷。神經根節與附著點細節各教科書略有出入。</p>
    <p class="hint"><b>程式</b>：使用 three.js（MIT 授權）。</p>
    <button class="btn primary wide" data-close>關閉</button>`);
}
function modal(html) {
  const el = document.createElement('div');
  el.className = 'modal';
  el.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true">${html}</div>`;
  el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('[data-close]')) el.remove(); });
  document.body.appendChild(el);
  el.querySelector('[data-close]')?.focus();
}

// Light when chosen here, otherwise whatever the device / host page uses.
function isLight() {
  const t = root.dataset.theme;
  return t ? t === 'light' : window.matchMedia('(prefers-color-scheme: light)').matches;
}

let rotateHook = null;
function setAutoRotate(v) {
  app.controls.autoRotate = v; app.controls.autoRotateSpeed = 1.2;
  if (v && !rotateHook) { rotateHook = () => core.requestRender(); core.addFrameHook(rotateHook); }
  if (!v && rotateHook) { core.removeFrameHook(rotateHook); rotateHook = null; }
}

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
    toast(`${it.zh}：亮起來的就是（共 ${new Set(parts.map((p) => p.key)).size} 條）`);
  },
  motion: (el) => { const c = MOTIONS[el.dataset.c]; startMotion(c.items[el.dataset.i], c.both); },
  'motion-play': () => { if (playing) stopPlayer(); else startPlayer(); render(); },
  'motion-side': (el) => { motionSide = el.dataset.v; startMotion(activeMotion, motionBoth); },
  'motion-focus': () => { motionFocus = !motionFocus; core.refresh(); render(); },
  'motion-exit': () => { setMode('normal'); render(); sheetBody.scrollTop = 0; },
  'motion-muscle': (el) => { const p = app.byId.get(el.dataset.id); setMode('normal'); spotlight(motionBoth ? app.byKey.get(p.key) : [p]); openTab('info'); },
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
    if (!('speechSynthesis' in window)) return toast('這個瀏覽器不支援朗讀');
    const u = new SpeechSynthesisUtterance(el.dataset.text); u.lang = 'en-US'; u.rate = 0.9;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  },
  xray: () => { app.state.xray = !app.state.xray; core.refresh(); render(); },
  labels: () => { app.state.labels = !app.state.labels; core.requestRender(); render(); },
  autorotate: () => { setAutoRotate(!app.controls.autoRotate); render(); },
  theme: () => { const t = isLight() ? 'dark' : 'light'; root.dataset.theme = t; store.set('theme', t); render(); },
  'clip-on': () => { app.state.clip.on = !app.state.clip.on; core.refresh(); render(); },
  'clip-axis': (el) => { app.state.clip.axis = el.dataset.v; app.state.clip.pos = 0.5; core.refresh(); render(); },
  'clip-flip': () => { app.state.clip.flip = !app.state.clip.flip; core.refresh(); },
  shot: async () => {
    const blob = await core.screenshot(getComputedStyle(root).getPropertyValue('--bg0').trim());
    const url = URL.createObjectURL(blob);
    modal(`<h2>截圖</h2><img src="${url}" alt="目前畫面的截圖" style="max-width:100%;max-height:52vh;border-radius:10px;display:block;margin:10px auto">
      <p class="hint">手機：長按圖片就能儲存或分享。電腦：按下面的按鈕下載。</p>
      <div class="grid2"><a class="btn primary" href="${url}" download="body-decomposition-${Date.now()}.png">下載圖片</a><button class="btn" data-close>關閉</button></div>`);
  },
  share: async () => {
    const url = shareLink();
    try {
      if (navigator.share) await navigator.share({ title: 'Body Decomposition', url });
      else { await navigator.clipboard.writeText(url); toast('連結已複製，貼給別人就能看到同一個畫面'); }
    } catch { history.replaceState(null, '', url); toast('連結已放到網址列，可以直接複製'); }
  },
  'save-view': () => {
    const views = savedViews();
    const t = selectionTitle(core.selectedParts()).zh || REGIONS.find((r) => r.id === activeRegion)?.zh || '畫面';
    views.unshift(captureView(`${t} · ${new Date().toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`));
    store.set('views', views.slice(0, 30)); render(); toast('畫面存好了，在下面的清單裡');
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

export function initUI() {
  const savedTheme = store.get('theme', null);
  if (savedTheme === 'light' || savedTheme === 'dark') root.dataset.theme = savedTheme;
  buildPeel();
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
  on('undo', (n) => { $('#views [data-act="undo"]').disabled = !n; });
  on('ready', () => {
    buildSearch();
    syncPeel();
    const fromLink = applyHash();
    if (!fromLink) core.resetView();
    if (desktop.matches) openTab('layers');
    if (!store.get('seenHelp', false)) { showHelp(); store.set('seenHelp', true); }
  });
  syncLayout();
}
