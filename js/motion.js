// Joint movement demos.
// The model has no skeleton rig, so movements are produced with a "bend
// deformer": every vertex near a joint gets a weight (0 = stays with the
// body, 1 = moves with the limb) and is rotated around the joint centre by
// angle x weight. Bones are rigid, muscles stretch across the joint.

import * as THREE from '../vendor/three.module.min.js';
import { app, requestRender } from './core.js';

const V = THREE.Vector3;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

const ARM_CHAIN = /humerus|radius|ulna|interosseous membrane of forearm|scaphoid|lunate|triquetral|pisiform|trapezium|trapezoid|capitate|hamate|metacarpal|finger|thumb/;
const FOREARM_CHAIN = /radius|ulna|interosseous membrane of forearm|scaphoid|lunate|triquetral|pisiform|trapezium|trapezoid|capitate|hamate|metacarpal|finger|thumb/;
const HAND_CHAIN = /scaphoid|lunate|triquetral|pisiform|trapezium|trapezoid|capitate|hamate|metacarpal|finger|thumb/;
const LEG_CHAIN = /femur|patella|tibia|fibula|interosseous membrane of leg|talus|calcaneus|navicular|cuboid|cuneiform|metatarsal|toe|sesamoid|plantar ligament/;
const SHANK_CHAIN = /patella|tibia|fibula|interosseous membrane of leg|talus|calcaneus|navicular|cuboid|cuneiform|metatarsal|toe|sesamoid|plantar ligament/;
const FOOT_CHAIN = /talus|calcaneus|navicular|cuboid|cuneiform|metatarsal|toe|sesamoid|plantar ligament/;
const SHOULDER_SOFT = /deltoid|supraspinatus|infraspinatus|teres|subscapularis|pectoralis major|latissimus dorsi|coracobrachialis/;
const HIP_SOFT = /psoas|iliacus|piriformis|obturator|gemellus|quadratus femoris|gluteus|tensor fasciae|pectineus/;

const isHard = (p) => p.sys === 'bone' || p.sys === 'joint';
const isSoft = (p) => p.sys === 'muscle' || p.sys === 'tendon';
const positions = (p) => p.mesh.geometry.attributes.position.array;
const find = (en) => app.parts.find((p) => p.en === en);

function centroidWhere(part, pred) {
  const a = positions(part);
  let x = 0, y = 0, z = 0, n = 0;
  for (let i = 0; i < a.length; i += 3) {
    if (!pred(a[i], a[i + 1], a[i + 2])) continue;
    x += a[i]; y += a[i + 1]; z += a[i + 2]; n++;
  }
  return n ? new V(x / n, y / n, z / n) : part.center.clone();
}

// Joint centres estimated from the bone shapes (rest pose only).
const landmarkCache = {};
export function landmarks(side) {
  if (landmarkCache[side]) return landmarkCache[side];
  const w = side === 'R' ? 'right' : 'left';
  const hum = find(`${w} humerus`), fem = find(`${w} femur`), talus = find(`${w} talus`);
  if (!hum || !fem || !talus) return null;
  const L = {};
  L.shoulder = centroidWhere(hum, (x, y) => y > hum.box.max.y - 0.045);
  L.elbow = centroidWhere(hum, (x, y) => y < hum.box.min.y + 0.022);
  const carp = ['scaphoid', 'lunate', 'triquetral'].map((n) => find(`${w} ${n}`)).filter(Boolean);
  L.wrist = carp.reduce((s, p) => s.add(p.center), new V()).multiplyScalar(1 / Math.max(1, carp.length));
  // femoral head = the medial part of the top of the femur
  const top = fem.box.max.y;
  let minX = Infinity, maxX = -Infinity;
  const fa = positions(fem);
  for (let i = 0; i < fa.length; i += 3) if (fa[i + 1] > top - 0.05) { minX = Math.min(minX, fa[i]); maxX = Math.max(maxX, fa[i]); }
  const cut = side === 'R' ? maxX - (maxX - minX) * 0.42 : minX + (maxX - minX) * 0.42;
  L.hip = centroidWhere(fem, (x, y) => y > top - 0.05 && (side === 'R' ? x > cut : x < cut));
  L.knee = centroidWhere(fem, (x, y) => y < fem.box.min.y + 0.03);
  L.ankle = talus.center.clone(); L.ankle.y = talus.box.max.y - 0.012;
  return (landmarkCache[side] = L);
}

function spineLevels() {
  const y = (en) => find(en)?.center.y;
  const sac = find('sacrum');
  return {
    lumbarLow: sac ? sac.box.max.y - 0.01 : 0.95,
    lumbarHigh: y('tenth thoracic vertebra') ?? 1.15,
    lumbarZ: find('third lumbar vertebra')?.center.z ?? 0,
    neckLow: y('first thoracic vertebra') ?? 1.38,
    neckHigh: y('atlas') ?? 1.5,
    neckZ: find('fourth cervical vertebra')?.center.z ?? 0,
  };
}

// Build one joint: centre, rotation axis and a function giving, for a part,
// either null (not affected), a number (rigid weight) or a per-vertex array.
function buildJoint(name, side, axisName) {
  const L = landmarks(side);
  const lat = new V(side === 'R' ? -1 : 1, 0, 0);
  const sideSign = side === 'R' ? 1 : -1;
  const X = new V(1, 0, 0), Z = new V(0, 0, 1);
  const perVertex = (p, fn) => {
    const a = positions(p), out = new Float32Array(a.length / 3);
    let max = 0;
    for (let i = 0, j = 0; i < a.length; i += 3, j++) { out[j] = fn(a[i], a[i + 1], a[i + 2]); if (out[j] > max) max = out[j]; }
    return max < 0.002 ? null : out;
  };
  const perp = (axis, along) => axis.clone().addScaledVector(along, -axis.dot(along)).normalize();
  let C, axis, weights;

  if (name === 'shoulder') {
    C = L.shoulder; const D = L.elbow.clone().sub(C).normalize();
    axis = axisName === 'flex' ? perp(X.clone().negate(), D) : axisName === 'abd' ? Z.clone().multiplyScalar(-sideSign) : D.clone().multiplyScalar(sideSign);
    weights = (p) => {
      if (p.side !== side) return null;
      if (isHard(p)) return ARM_CHAIN.test(p.key) ? 1 : null;
      if (!isSoft(p)) return null;
      if (!(['arm', 'forearm', 'hand'].includes(p.region) || SHOULDER_SOFT.test(p.key))) return null;
      return perVertex(p, (x, y, z) => {
        const dx = x - C.x, dy = y - C.y, dz = z - C.z;
        return smooth(-0.055, 0.012, dx * lat.x) * smooth(-0.035, 0.03, dx * D.x + dy * D.y + dz * D.z);
      });
    };
  } else if (name === 'elbow' || name === 'wrist') {
    const D = L.wrist.clone().sub(L.elbow).normalize();
    C = name === 'elbow' ? L.elbow : L.wrist;
    axis = perp(X.clone().negate(), D);
    const chain = name === 'elbow' ? FOREARM_CHAIN : HAND_CHAIN;
    const regions = name === 'elbow' ? ['arm', 'forearm', 'hand'] : ['forearm', 'hand'];
    const blend = name === 'elbow' ? 0.035 : 0.02;
    weights = (p) => {
      if (p.side !== side) return null;
      if (isHard(p)) return chain.test(p.key) ? 1 : null;
      if (!isSoft(p) || !regions.includes(p.region)) return null;
      return perVertex(p, (x, y, z) => smooth(-blend, blend, (x - C.x) * D.x + (y - C.y) * D.y + (z - C.z) * D.z));
    };
  } else if (name === 'hip') {
    C = L.hip; const D = L.knee.clone().sub(C).normalize();
    axis = axisName === 'flex' ? X.clone().negate() : axisName === 'abd' ? Z.clone().multiplyScalar(-sideSign) : D.clone().multiplyScalar(sideSign);
    weights = (p) => {
      if (p.side !== side) return null;
      if (isHard(p)) return LEG_CHAIN.test(p.key) ? 1 : null;
      if (!isSoft(p)) return null;
      if (!(['hip', 'thigh', 'leg', 'foot'].includes(p.region) || HIP_SOFT.test(p.key))) return null;
      return perVertex(p, (x, y) => {
        const down = C.y - y, medial = -(x - C.x) * lat.x;
        return smooth(-0.03, 0.04, down - 0.09 * smooth(0, 0.05, medial));
      });
    };
  } else if (name === 'knee') {
    C = L.knee; const D = L.ankle.clone().sub(C).normalize();
    axis = X.clone();
    weights = (p) => {
      if (p.side !== side) return null;
      if (isHard(p)) return SHANK_CHAIN.test(p.key) ? 1 : null;
      if (!isSoft(p) || !['thigh', 'leg', 'foot'].includes(p.region)) return null;
      return perVertex(p, (x, y, z) => smooth(-0.04, 0.04, (x - C.x) * D.x + (y - C.y) * D.y + (z - C.z) * D.z));
    };
  } else if (name === 'ankle') {
    C = L.ankle;
    axis = X.clone().negate();
    weights = (p) => {
      if (p.side !== side) return null;
      if (isHard(p)) return FOOT_CHAIN.test(p.key) ? 1 : null;
      if (!isSoft(p) || !['leg', 'foot'].includes(p.region)) return null;
      return perVertex(p, (x, y, z) => Math.max(smooth(-0.04, 0, C.y - y), smooth(0.015, 0.045, z - C.z)));
    };
  } else { // trunk / neck: one bend zone across the whole body
    const s = spineLevels();
    const [y0, y1, cz] = name === 'trunk' ? [s.lumbarLow, s.lumbarHigh, s.lumbarZ] : [s.neckLow, s.neckHigh, s.neckZ];
    C = new V(0, (y0 + y1) / 2, cz);
    axis = axisName === 'flex' ? X.clone() : axisName === 'side' ? Z.clone() : new V(0, 1, 0);
    weights = (p) => {
      if (p.sys === 'skin') return null;
      if (p.box.max.y < y0) return null;
      if (LEG_CHAIN.test(p.key) || ['thigh', 'leg', 'foot'].includes(p.region)) return null;
      if (name === 'trunk' && (ARM_CHAIN.test(p.key) || ['arm', 'forearm', 'hand'].includes(p.region))) return 1;
      if (isHard(p)) { const w = smooth(y0, y1, p.center.y); return w < 0.002 ? null : w; }
      if (p.box.min.y > y1) return 1;
      return perVertex(p, (x, y) => smooth(y0, y1, y));
    };
  }
  return { C, axis, weights };
}

// ---------------------------------------------------------------- rig

let rig = null;

export function startMotion(motion, sides) {
  stopMotion();
  const steps = [];
  const sideless = motion.steps.some((s) => s.joint === 'trunk' || s.joint === 'neck');
  for (const side of sideless ? [sides[0]] : sides) {
    for (const s of motion.steps) steps.push({ ...buildJoint(s.joint, side, s.axis), from: s.from, to: s.to, side });
  }
  const affected = new Map(); // part -> { rest, restN, steps: [[step, w]] }
  for (const st of steps) {
    for (const p of app.parts) {
      const w = st.weights(p);
      if (w === null || w === undefined) continue;
      if (!affected.has(p)) {
        const g = p.mesh.geometry;
        affected.set(p, { rest: g.attributes.position.array.slice(), restN: g.attributes.normal.array.slice(), steps: [] });
        p.mesh.frustumCulled = false;
      }
      affected.get(p).steps.push([st, w]);
    }
  }
  rig = { motion, steps, affected, t: 0, planted: motion.planted ? steps.filter((s) => s.side === sides[0]) : null };
  setMotionT(0);
  return rig;
}

const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), tmp = new THREE.Matrix4();
function rotationAbout(C, axis, angle) {
  q.setFromAxisAngle(axis, angle);
  return new THREE.Matrix4().makeTranslation(C.x, C.y, C.z).multiply(tmp.makeRotationFromQuaternion(q)).multiply(m4.makeTranslation(-C.x, -C.y, -C.z));
}

export function setMotionT(t) {
  if (!rig) return;
  rig.t = t;
  const rad = Math.PI / 180;
  for (const st of rig.steps) st.angle = (st.from + (st.to - st.from) * t) * rad;

  for (const [p, a] of rig.affected) {
    const g = p.mesh.geometry;
    const pos = g.attributes.position.array, nor = g.attributes.normal.array;
    pos.set(a.rest); nor.set(a.restN);
    for (const [st, w] of a.steps) {
      if (st.angle === 0) continue;
      const ax = st.axis.x, ay = st.axis.y, az = st.axis.z, cx = st.C.x, cy = st.C.y, cz = st.C.z;
      const rigid = typeof w === 'number';
      let sin = rigid ? Math.sin(st.angle * w) : 0, cos = rigid ? Math.cos(st.angle * w) : 1;
      for (let i = 0, j = 0; i < pos.length; i += 3, j++) {
        if (!rigid) {
          const wj = w[j];
          if (wj === 0) continue;
          const th = st.angle * wj; sin = Math.sin(th); cos = Math.cos(th);
        }
        const k = 1 - cos;
        let x = pos[i] - cx, y = pos[i + 1] - cy, z = pos[i + 2] - cz;
        let d = ax * x + ay * y + az * z;
        pos[i] = cx + x * cos + (ay * z - az * y) * sin + ax * d * k;
        pos[i + 1] = cy + y * cos + (az * x - ax * z) * sin + ay * d * k;
        pos[i + 2] = cz + z * cos + (ax * y - ay * x) * sin + az * d * k;
        x = nor[i]; y = nor[i + 1]; z = nor[i + 2];
        d = ax * x + ay * y + az * z;
        nor[i] = x * cos + (ay * z - az * y) * sin + ax * d * k;
        nor[i + 1] = y * cos + (az * x - ax * z) * sin + ay * d * k;
        nor[i + 2] = z * cos + (ax * y - ay * x) * sin + az * d * k;
      }
    }
    g.attributes.position.needsUpdate = true;
    g.attributes.normal.needsUpdate = true;
  }

  // Feet stay on the floor: move the whole body by the inverse of the
  // foot's motion (used for the squat).
  if (rig.planted) {
    const foot = new THREE.Matrix4();
    for (const st of rig.planted) foot.premultiply(rotationAbout(st.C, st.axis, st.angle));
    app.root.matrix.copy(foot).invert();
  } else {
    app.root.matrix.identity();
  }
  app.root.matrixWorldNeedsUpdate = true;
  requestRender();
}

// Keep picking accurate after the pose changed.
export function settleMotion() {
  if (!rig) return;
  for (const [p] of rig.affected) { p.mesh.geometry.computeBoundingSphere(); p.mesh.geometry.computeBoundingBox(); }
}

export function stopMotion() {
  if (!rig) return;
  for (const [p, a] of rig.affected) {
    const g = p.mesh.geometry;
    g.attributes.position.array.set(a.rest); g.attributes.normal.array.set(a.restN);
    g.attributes.position.needsUpdate = true; g.attributes.normal.needsUpdate = true;
    g.computeBoundingSphere(); g.computeBoundingBox();
    p.mesh.frustumCulled = true;
  }
  app.root.matrix.identity();
  app.root.matrixWorldNeedsUpdate = true;
  rig = null;
  requestRender();
}

export const motionActive = () => !!rig;

// Resolve "R:pattern" strings into parts.
export function motionMuscles(motion, sides, both) {
  const resolve = (list) => {
    const out = [];
    for (const spec of list) {
      const m = /^([RL]):(.*)$/.exec(spec);
      const re = new RegExp(m ? m[2] : spec);
      const wantSides = m ? [m[1]] : both ? ['R', 'L'] : sides;
      for (const p of app.parts) {
        if (p.sys !== 'muscle' && p.sys !== 'tendon') continue;
        if (!re.test(p.key)) continue;
        if (p.side && !wantSides.includes(p.side)) continue;
        if (!out.includes(p)) out.push(p);
      }
    }
    return out;
  };
  const prime = resolve(motion.prime);
  const assist = resolve(motion.assist).filter((p) => !prime.includes(p));
  return { prime, assist };
}
