// 3D engine: scene, model loading, per-part visual state, picking, camera.
// Everything the UI needs is exposed through the `app` object and the
// `on` / `emit` event helpers.

import * as THREE from '../vendor/three.module.min.js';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { MeshoptDecoder } from '../vendor/meshopt_decoder.module.js';

const bus = new EventTarget();
export const emit = (type, detail) => bus.dispatchEvent(new CustomEvent(type, { detail }));
export const on = (type, fn) => bus.addEventListener(type, (e) => fn(e.detail));

export const NORMAL = 0, GHOST = 1, HIDDEN = 2;
export const GROUP_IDS = ['skin', 'm1', 'm2', 'm3', 'bone', 'joint', 'organ', 'vessel', 'nerve'];

const SELECT_COLOR = new THREE.Color('#35b8ff');
const GHOST_OPACITY = 0.07;

export const app = {
  THREE,
  parts: [],
  byId: new Map(),
  byKey: new Map(), // key -> [parts]
  info: {},
  ready: false,
  state: {
    groups: {
      skin: { on: false, op: 1 }, m1: { on: true, op: 1 }, m2: { on: true, op: 1 }, m3: { on: true, op: 1 },
      bone: { on: true, op: 1 }, joint: { on: true, op: 1 }, organ: { on: false, op: 1 },
      vessel: { on: false, op: 1 }, nerve: { on: false, op: 1 },
    },
    side: 'all',
    regionOnly: null, // Set of region ids, or null
    xray: false,
    explode: 0,
    clip: { on: false, axis: 'x', pos: 0.5, flip: false },
    labels: true,
    multi: false,
    selection: new Set(),
    overlay: null, // function(part) -> { visible?, opacity?, tint?, pickable? } | null
  },
  insets: { left: 0, bottom: 0 },
  bounds: new THREE.Box3(),
};

let renderer, scene, camera, controls, canvas, labelLayer;
let needsRender = true;
const raycaster = new THREE.Raycaster();
const clipPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
let pickables = [];
const undoStack = [];
const frameHooks = new Set();

export const requestRender = () => { needsRender = true; };
export const addFrameHook = (fn) => { frameHooks.add(fn); requestRender(); };
export const removeFrameHook = (fn) => frameHooks.delete(fn);

// ---------------------------------------------------------------- colours

function hash01(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 1000) / 1000;
}
const hsl = (h, s, l) => new THREE.Color().setHSL(((h % 360) + 360) % 360 / 360, s, l);

const ORGAN_COLORS = [
  [/liver/, '#8a3d2f'], [/lung/, '#d7a09c'], [/kidney/, '#8e4b3d'], [/spleen/, '#6f3040'],
  [/gallbladder/, '#6b8a3c'], [/stomach/, '#d8998a'], [/pancrea/, '#e2c38c'], [/bladder|ureter|urethra/, '#dcbf8e'],
  [/trachea|bronchus|cartilage/, '#c4d3da'], [/eyeball/, '#f1efe9'], [/ear\b/, '#dfae8f'],
  [/thymus|thyroid|adrenal|pituitary|pineal/, '#d9b26a'], [/colon|taenia|appendix|rectum/, '#c98d79'],
  [/jejunum|ileum|duodenum|esophagus/, '#dba593'],
];

function baseColor(p) {
  const j = hash01(p.key) - 0.5;
  switch (p.sys) {
    case 'bone': return /tooth/.test(p.key) ? hsl(48, 0.2, 0.9) : hsl(42 + j * 6, 0.3, 0.8 + j * 0.05);
    case 'joint':
      if (/gingiva/.test(p.key)) return hsl(355, 0.45, 0.68);
      if (/disk/.test(p.key)) return hsl(205, 0.3, 0.66);
      return hsl(195 + j * 10, 0.28, 0.78);
    case 'muscle': {
      const base = { 1: [6, 0.6, 0.43], 2: [1, 0.58, 0.38], 3: [354, 0.54, 0.33] }[p.layer] || [0, 0.55, 0.4];
      return hsl(base[0] + j * 12, base[1] + j * 0.08, base[2] + j * 0.07);
    }
    case 'tendon': return hsl(42 + j * 8, 0.28, 0.84);
    case 'organ': {
      for (const [re, c] of ORGAN_COLORS) if (re.test(p.key)) return new THREE.Color(c);
      return hsl(12 + j * 10, 0.42, 0.66);
    }
    case 'vessel': {
      const k = p.key;
      if (/valve/.test(k)) return hsl(36, 0.35, 0.82);
      if (/wall of heart|papillary/.test(k)) return hsl(2, 0.5, 0.4);
      if (/pulmonary artery/.test(k)) return hsl(222, 0.48, 0.5);
      if (/pulmonary vein/.test(k)) return hsl(3, 0.68, 0.5);
      if (/vein|vena|sinus/.test(k)) return hsl(222 + j * 8, 0.5, 0.48);
      return hsl(3 + j * 6, 0.7, 0.47);
    }
    case 'nerve': return hsl(46 + j * 14, 0.42, 0.7 + j * 0.08);
    case 'skin': return /hair|eyebrow/.test(p.key) ? hsl(25, 0.3, 0.17) : /labial/.test(p.key) ? hsl(5, 0.45, 0.6) : hsl(24, 0.5, 0.72);
    default: return new THREE.Color('#bbbbbb');
  }
}

export function groupOf(p) {
  if (p.sys === 'muscle' || p.sys === 'tendon') return 'm' + p.layer;
  return p.sys;
}

// ---------------------------------------------------------------- set-up

export function init(canvasEl, labelEl) {
  canvas = canvasEl; labelLayer = labelEl;
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.localClippingEnabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene = new THREE.Scene();
  const root = new THREE.Group(); // every part mesh lives in here
  root.matrixAutoUpdate = false;
  scene.add(root);
  app.root = root;
  camera = new THREE.PerspectiveCamera(32, 1, 0.01, 30);
  camera.position.set(0, 0.95, 4.4);
  scene.add(camera);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x3a322c, 0.95));
  const key = new THREE.DirectionalLight(0xffffff, 1.75);
  key.position.set(0.6, 0.9, 1.6);
  camera.add(key); // head-light: the lit side always faces the viewer
  const rim = new THREE.DirectionalLight(0xbfd4ff, 0.7);
  rim.position.set(-1.2, 0.4, -1.5);
  camera.add(rim);

  controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0.9, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.12;
  controls.rotateSpeed = 0.9;
  controls.zoomSpeed = 1.1;
  controls.minDistance = 0.06;
  controls.maxDistance = 9;
  controls.zoomToCursor = true;
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  controls.addEventListener('change', requestRender);

  Object.assign(app, { renderer, scene, camera, controls, canvas });

  setupPointer();
  new ResizeObserver(resize).observe(canvas.parentElement);
  resize();
  renderer.setAnimationLoop(frame);
}

function resize() {
  const w = canvas.parentElement.clientWidth, h = canvas.parentElement.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  camera.aspect = w / h;
  applyInsets();
  requestRender();
}

// Keep the model centred in the part of the screen that is not covered by
// panels (bottom sheet on phones, side panel on desktop).
export function setInsets(left, bottom) {
  if (app.insets.left === left && app.insets.bottom === bottom) return;
  // Keep what was visible on screen visible: step back when the free
  // height shrinks, step closer when it grows.
  const h = canvas.clientHeight || 1;
  const k = Math.max(0.3 * h, h - app.insets.bottom) / Math.max(0.3 * h, h - bottom);
  if (app.ready && Math.abs(k - 1) > 0.01 && !flight) {
    camera.position.sub(controls.target).multiplyScalar(k).add(controls.target);
  }
  app.insets = { left, bottom };
  applyInsets();
  requestRender();
}
function applyInsets() {
  const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
  const { left, bottom } = app.insets;
  if (left || bottom) camera.setViewOffset(w, h, -left / 2, bottom / 2, w, h);
  else camera.clearViewOffset();
  camera.updateProjectionMatrix();
}

let lastT = 0;
function frame(t) {
  const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016); lastT = t;
  for (const fn of frameHooks) fn(dt, t);
  if (flight) stepFlight(t);
  controls.update();
  if (needsRender) {
    needsRender = false;
    renderer.render(scene, camera);
    updateLabels();
  }
}

// ---------------------------------------------------------------- loading

export async function load(onProgress) {
  const [anatomy, manifest] = await Promise.all([
    fetch('data/anatomy.json').then((r) => r.json()),
    fetch('models/manifest.json').then((r) => r.json()),
  ]);
  app.info = anatomy.info;
  const meta = new Map(anatomy.parts.map((p) => [p.id, p]));

  const loader = new GLTFLoader().setMeshoptDecoder(await pickDecoder());
  const files = ['skeleton', 'muscles', 'other'];
  const total = files.reduce((s, f) => s + manifest[f].bytes, 0);
  const loaded = {};
  const report = () => onProgress?.(Math.min(1, Object.values(loaded).reduce((a, b) => a + b, 0) / total));

  await Promise.all(files.map(async (f) => {
    const buffer = await fetchModel(f, (n) => { loaded[f] = Math.min(n, manifest[f].bytes); report(); });
    loaded[f] = manifest[f].bytes; report();
    const gltf = await loader.parseAsync(buffer, '');
    addParts(gltf.scene, meta);
    refresh();
    emit('partsAdded', f);
  }));

  app.bounds.makeEmpty();
  for (const p of app.parts) app.bounds.union(p.box);
  app.ready = true;
  refresh();
  emit('ready');
}

// Download one model file, reporting progress. Hosts that cannot serve
// binary .glb files can set `window.BD_MODELS_BASE64 = true` and provide the
// same file base64-encoded as models/<name>.glb.txt instead.
async function fetchModel(name, onBytes) {
  const b64 = !!window.BD_MODELS_BASE64;
  const res = await fetch(`models/${name}.glb${b64 ? '.txt' : ''}`);
  if (!res.ok) throw new Error(`models/${name}: HTTP ${res.status}`);
  let bytes;
  if (res.body?.getReader) {
    const reader = res.body.getReader();
    const chunks = []; let n = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value); n += value.length;
      onBytes(b64 ? n * 0.75 : n);
    }
    bytes = new Uint8Array(n);
    let o = 0; for (const c of chunks) { bytes.set(c, o); o += c.length; }
  } else {
    bytes = new Uint8Array(await res.arrayBuffer());
  }
  if (!b64) return bytes.buffer;
  const bin = atob(new TextDecoder().decode(bytes).trim());
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

// The fast decoder needs WebAssembly. Where that is switched off (some
// locked-down browsers), use the slower plain-JavaScript decoder instead.
async function pickDecoder() {
  try {
    if (MeshoptDecoder.supported && !/[?&]nowasm\b/.test(location.search)) {
      await MeshoptDecoder.ready;
      return MeshoptDecoder;
    }
  } catch { /* fall through */ }
  return (await import('../vendor/meshopt_decoder_reference.js')).MeshoptDecoder;
}

function addParts(root, meta) {
  root.updateMatrixWorld(true);
  const v = new THREE.Vector3();
  const found = [];
  root.traverse((o) => { if (o.isMesh) found.push(o); });
  for (const src of found) {
    const id = src.name || src.parent?.name;
    const m = meta.get(id);
    if (!m) continue;
    // Bake to plain world-space float geometry (metres, y up, z front).
    const srcPos = src.geometry.attributes.position;
    const pos = new Float32Array(srcPos.count * 3);
    for (let i = 0; i < srcPos.count; i++) {
      v.fromBufferAttribute(srcPos, i).applyMatrix4(src.matrixWorld);
      pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setIndex(new THREE.BufferAttribute(src.geometry.index.array.slice(), 1));
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
    src.geometry.dispose();

    const info = app.info[m.key];
    const part = {
      id, en: m.en, key: m.key, side: m.side, info,
      sys: info.sys, layer: info.layer || 0, region: info.region,
      zh: (m.side === 'R' ? '右' : m.side === 'L' ? '左' : '') + info.zh,
      user: NORMAL, tint: null,
      box: geo.boundingBox.clone(),
      center: geo.boundingBox.getCenter(new THREE.Vector3()),
    };
    // A better "middle" for labels and camera targets than the box centre.
    part.center.copy(centroidOf(pos));
    part.color = baseColor(part);
    part.group = groupOf(part);
    const mat = new THREE.MeshStandardMaterial({
      color: part.color, roughness: part.sys === 'bone' ? 0.72 : 0.56, metalness: 0,
    });
    part.mesh = new THREE.Mesh(geo, mat);
    part.mesh.userData.part = part;
    part.mesh.matrixAutoUpdate = false;
    app.root.add(part.mesh);
    app.parts.push(part);
    app.byId.set(id, part);
    if (!app.byKey.has(part.key)) app.byKey.set(part.key, []);
    app.byKey.get(part.key).push(part);
  }
}

function centroidOf(pos) {
  let x = 0, y = 0, z = 0;
  const n = pos.length / 3;
  for (let i = 0; i < pos.length; i += 3) { x += pos[i]; y += pos[i + 1]; z += pos[i + 2]; }
  return new THREE.Vector3(x / n, y / n, z / n);
}

// ---------------------------------------------------------------- visuals

const tmpColor = new THREE.Color();

// Recompute every part's visibility / opacity / colour from the state.
export function refresh() {
  const s = app.state;
  pickables = [];
  for (const p of app.parts) {
    const g = s.groups[p.group];
    const selected = s.selection.has(p.id);
    let visible = g.on && p.user !== HIDDEN;
    if (s.side !== 'all' && p.side && p.side !== s.side) visible = false;
    if (s.regionOnly && !s.regionOnly.has(p.region) && p.sys !== 'skin') visible = false;
    let opacity = g.op * (p.user === GHOST ? GHOST_OPACITY : 1);
    if (selected && visible) opacity = Math.max(opacity, 0.92);
    let tint = p.tint;
    let pickable = true;
    if (s.overlay) {
      const o = s.overlay(p);
      if (o) {
        if (o.visible !== undefined) visible = o.visible;
        if (o.opacity !== undefined) opacity = o.opacity;
        if (o.tint !== undefined) tint = o.tint;
        if (o.pickable !== undefined) pickable = o.pickable;
      }
    }
    if (s.xray && !selected && !tint) opacity = Math.min(opacity, 0.16);

    const mesh = p.mesh, mat = mesh.material;
    mesh.visible = visible && opacity > 0.01;
    if (!mesh.visible) continue;
    const transparent = opacity < 0.995;
    if (mat.transparent !== transparent) { mat.transparent = transparent; mat.needsUpdate = true; }
    mat.opacity = opacity;
    mat.depthWrite = opacity > 0.6;
    mesh.renderOrder = transparent ? (opacity > 0.6 ? 1 : 2) : 0;
    const side = s.clip.on || p.sys === 'skin' && transparent ? THREE.DoubleSide : THREE.FrontSide;
    if (mat.side !== side) { mat.side = side; mat.needsUpdate = true; }

    if (!p.painted) {
      if (selected) {
        mat.color.copy(tmpColor.copy(p.color).lerp(SELECT_COLOR, 0.82));
        mat.emissive.copy(SELECT_COLOR).multiplyScalar(0.22);
      } else if (tint) {
        mat.color.copy(tmpColor.copy(p.color).lerp(tint, 0.85));
        mat.emissive.copy(tint).multiplyScalar(0.16);
      } else {
        mat.color.copy(p.color);
        mat.emissive.setRGB(0, 0, 0);
      }
    }
    if (pickable && opacity > 0.3) pickables.push(mesh);
  }
  applyClip();
  requestRender();
}

function applyClip() {
  const c = app.state.clip;
  if (!c.on || app.bounds.isEmpty()) { renderer.clippingPlanes = []; return; }
  const b = app.bounds;
  const i = { x: 0, y: 1, z: 2 }[c.axis];
  const min = b.min.getComponent(i), max = b.max.getComponent(i);
  const at = min + (max - min) * c.pos;
  const sign = c.flip ? 1 : -1;
  clipPlane.normal.set(0, 0, 0).setComponent(i, sign);
  clipPlane.constant = -sign * at;
  renderer.clippingPlanes = [clipPlane];
}

// Push parts away from a pivot ("exploded view").
export function setExplode(k) {
  app.state.explode = k;
  const box = new THREE.Box3();
  for (const p of app.parts) if (p.mesh.visible) box.expandByPoint(p.center);
  const pivot = box.isEmpty() ? new THREE.Vector3(0, 0.9, 0) : box.getCenter(new THREE.Vector3());
  for (const p of app.parts) {
    const m = p.mesh;
    m.position.copy(p.center).sub(pivot).multiplyScalar(k * 1.6);
    m.updateMatrix();
  }
  requestRender();
}

// ---------------------------------------------------------------- undo

function snapshot() {
  return {
    user: Uint8Array.from(app.parts, (p) => p.user),
    groups: JSON.parse(JSON.stringify(app.state.groups)),
    side: app.state.side,
    regionOnly: app.state.regionOnly ? [...app.state.regionOnly] : null,
  };
}
export function pushUndo() {
  undoStack.push(snapshot());
  if (undoStack.length > 60) undoStack.shift();
  emit('undo', undoStack.length);
}
export function undo() {
  const s = undoStack.pop();
  if (!s) return false;
  app.parts.forEach((p, i) => { p.user = s.user[i] ?? NORMAL; });
  app.state.groups = s.groups;
  app.state.side = s.side;
  app.state.regionOnly = s.regionOnly ? new Set(s.regionOnly) : null;
  refresh();
  emit('undo', undoStack.length);
  emit('groups');
  return true;
}
export const canUndo = () => undoStack.length > 0;

// ---------------------------------------------------------------- selection + tools

export function select(ids, { add = false, silent = false } = {}) {
  const sel = app.state.selection;
  if (!add) sel.clear();
  for (const id of ids) sel.add(id);
  refresh();
  if (!silent) emit('selection', [...sel]);
}
export function toggleSelect(id) {
  const sel = app.state.selection;
  if (sel.has(id)) sel.delete(id); else sel.add(id);
  refresh();
  emit('selection', [...sel]);
}
export const selectedParts = () => [...app.state.selection].map((id) => app.byId.get(id)).filter(Boolean);

export function setUser(parts, value) {
  pushUndo();
  for (const p of parts) p.user = value;
  refresh();
}
export function hideSelected() {
  const parts = selectedParts(); if (!parts.length) return;
  setUser(parts, HIDDEN);
  select([]);
}
export function ghostSelected() {
  const parts = selectedParts(); if (!parts.length) return;
  const allGhost = parts.every((p) => p.user === GHOST);
  setUser(parts, allGhost ? NORMAL : GHOST);
  if (!allGhost) select([]);
}
export function isolateSelected(mode /* HIDDEN | GHOST */) {
  const sel = app.state.selection; if (!sel.size) return;
  pushUndo();
  for (const p of app.parts) {
    if (sel.has(p.id)) p.user = NORMAL;
    else if (p.mesh.visible || p.user !== HIDDEN) p.user = mode;
  }
  refresh();
}
export function showAll() {
  pushUndo();
  for (const p of app.parts) p.user = NORMAL;
  app.state.side = 'all';
  app.state.regionOnly = null;
  refresh();
  emit('groups');
}
export function setGroup(id, patch, { undoable = true } = {}) {
  if (undoable) pushUndo();
  Object.assign(app.state.groups[id], patch);
  refresh();
  emit('groups');
}
// Peel level: 0 = skin on, 1 = superficial muscles, 2 = intermediate, 3 = deep, 4 = bones only
export function setPeel(level) {
  pushUndo();
  const g = app.state.groups;
  g.skin.on = level === 0;
  g.m1.on = level <= 1; g.m2.on = level <= 2; g.m3.on = level <= 3;
  g.bone.on = true; g.joint.on = true;
  refresh();
  emit('groups');
}
export function peelLevel() {
  const g = app.state.groups;
  if (g.skin.on) return 0;
  if (g.m1.on) return 1;
  if (g.m2.on) return 2;
  if (g.m3.on) return 3;
  return 4;
}
// Make sure the given parts can be seen: switch their layer on and un-hide them.
export function reveal(parts) {
  const g = app.state.groups;
  let changed = false;
  for (const p of parts) {
    if (!g[p.group].on) { g[p.group].on = true; changed = true; }
    if (p.user !== NORMAL) { p.user = NORMAL; changed = true; }
    if (app.state.side !== 'all' && p.side && p.side !== app.state.side) { app.state.side = 'all'; changed = true; }
    if (app.state.regionOnly && !app.state.regionOnly.has(p.region)) { app.state.regionOnly = null; changed = true; }
  }
  if (changed) { refresh(); emit('groups'); }
}

// ---------------------------------------------------------------- picking

function pickAt(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  const ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(pickables, false);
  const clipOn = app.state.clip.on;
  for (const h of hits) {
    if (clipOn && clipPlane.distanceToPoint(h.point) < 0) continue;
    return { part: h.object.userData.part, point: h.point };
  }
  return null;
}

function setupPointer() {
  let down = null;
  canvas.addEventListener('pointerdown', (e) => {
    down = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId, multi: false };
  });
  canvas.addEventListener('pointermove', (e) => {
    if (down && e.pointerId !== down.id) down.multi = true;
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!down || e.pointerId !== down.id) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    const quick = performance.now() - down.t < 450;
    const multiTouch = down.multi;
    down = null;
    if (moved > 7 || !quick || multiTouch) return;
    const hit = pickAt(e.clientX, e.clientY);
    emit('tap', { part: hit?.part || null, point: hit?.point || null, shift: e.shiftKey || e.ctrlKey || e.metaKey });
  });
  canvas.addEventListener('pointercancel', () => { down = null; });
  canvas.addEventListener('dblclick', (e) => {
    const hit = pickAt(e.clientX, e.clientY);
    if (hit) focusParts([hit.part]);
  });
}

// ---------------------------------------------------------------- camera

let flight = null;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function stepFlight(now) {
  const t = Math.min(1, (now - flight.start) / flight.ms);
  const k = ease(t);
  camera.position.lerpVectors(flight.p0, flight.p1, k);
  controls.target.lerpVectors(flight.t0, flight.t1, k);
  requestRender();
  if (t >= 1) flight = null;
}

export function flyTo(position, target, ms = 650) {
  flight = { start: performance.now(), ms, p0: camera.position.clone(), p1: position.clone(), t0: controls.target.clone(), t1: target.clone() };
  if (ms <= 0) { camera.position.copy(position); controls.target.copy(target); flight = null; }
  requestRender();
}

// Frame a box. `dir` = direction from the target towards the camera
// (defaults to the current viewing direction).
export function frameBox(box, dir, { pad = 1.15, ms = 650 } = {}) {
  if (box.isEmpty()) return;
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const radius = Math.max(0.035, size.length() / 2);
  const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
  const usableH = Math.max(0.3, (h - app.insets.bottom) / h), usableW = Math.max(0.3, (w - app.insets.left) / w);
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const tanV = Math.tan(vFov / 2) * usableH, tanH = Math.tan(vFov / 2) * camera.aspect * usableW;
  const d = (dir ? dir.clone() : camera.position.clone().sub(controls.target)).normalize();
  let dist;
  if (Math.abs(d.y) > 0.6) {
    dist = radius / Math.sin(Math.atan(Math.min(tanV, tanH)));
  } else {
    // Looking roughly horizontally: fit height and width separately so a
    // tall body fills a tall phone screen.
    const halfW = Math.max(0.03, Math.hypot(size.x, size.z) / 2), halfH = Math.max(0.03, size.y / 2);
    dist = Math.max(halfH / tanV, halfW / tanH) + halfW * 0.6;
  }
  dist *= pad;
  flyTo(center.clone().addScaledVector(d, dist), center, ms);
}

export function boxOfParts(parts) {
  const box = new THREE.Box3();
  for (const p of parts) box.union(p.box);
  return box;
}
export function focusParts(parts, dir, opts) {
  if (parts.length) frameBox(boxOfParts(parts), dir, opts);
}

const VIEW_DIRS = {
  front: [0, 0.05, 1], back: [0, 0.05, -1], left: [1, 0.05, 0], right: [-1, 0.05, 0], top: [0, 1, 0.001], bottom: [0, -1, 0.001],
};
export const viewDir = (name) => new THREE.Vector3(...VIEW_DIRS[name]).normalize();
export function setView(name) {
  const target = controls.target.clone();
  const dist = camera.position.distanceTo(target);
  flyTo(target.clone().addScaledVector(viewDir(name), dist), target, 500);
}
export function resetView() {
  const visible = app.parts.filter((p) => p.mesh.visible);
  frameBox(visible.length ? boxOfParts(visible) : app.bounds, viewDir('front'), { pad: 1.12 });
}

export function cameraState() {
  return { p: camera.position.toArray(), t: controls.target.toArray() };
}
export function applyCameraState(s, ms = 600) {
  if (!s) return;
  flyTo(new THREE.Vector3(...s.p), new THREE.Vector3(...s.t), ms);
}

// ---------------------------------------------------------------- labels

const labelPool = [];
const projected = new THREE.Vector3();
let extraLabels = []; // [{ part, text, cls }]
export function setExtraLabels(list) { extraLabels = list || []; requestRender(); }

function updateLabels() {
  if (!labelLayer) return;
  const s = app.state;
  const items = [];
  if (s.labels && s.selection.size <= 4) for (const p of selectedParts()) if (p.mesh.visible) items.push({ part: p, text: p.zh, cls: 'sel' });
  for (const e of extraLabels) if (e.part.mesh.visible) items.push(e);
  while (labelPool.length < items.length) {
    const el = document.createElement('div');
    el.className = 'label3d';
    el.innerHTML = '<i></i><span></span>';
    labelLayer.appendChild(el);
    labelPool.push(el);
  }
  const w = canvas.clientWidth, h = canvas.clientHeight;
  labelPool.forEach((el, i) => {
    const it = items[i];
    if (!it) { el.hidden = true; return; }
    projected.copy(it.part.center).add(it.part.mesh.position).project(camera);
    if (projected.z > 1) { el.hidden = true; return; }
    el.hidden = false;
    el.dataset.cls = it.cls || '';
    el.lastChild.textContent = it.text;
    el.style.transform = `translate(${((projected.x + 1) / 2 * w).toFixed(1)}px, ${((1 - projected.y) / 2 * h).toFixed(1)}px)`;
  });
}

// ---------------------------------------------------------------- screenshot

export function screenshot(background) {
  renderer.render(scene, camera);
  const out = document.createElement('canvas');
  out.width = canvas.width; out.height = canvas.height;
  const ctx = out.getContext('2d');
  ctx.fillStyle = background || '#11161d';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(canvas, 0, 0);
  const scale = out.width / canvas.clientWidth;
  ctx.font = `${12 * scale}px system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.fillText('Body Decomposition · 模型：BodyParts3D © DBCLS (CC BY-SA 2.1 JP)', 12 * scale, out.height - 12 * scale);
  return new Promise((res) => out.toBlob(res, 'image/png'));
}
