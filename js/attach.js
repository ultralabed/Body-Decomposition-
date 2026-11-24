// Origin / insertion maps.
// For the chosen muscle(s) we look for bone surface that lies within a few
// millimetres of the muscle and paint it: red = origin, blue = insertion,
// purple = both ends sit on this bone. Which bone counts as origin or
// insertion comes from the `ob` / `ib` keywords in the content data.

import * as THREE from 'three';
import { app, refresh } from './core.js';

const NEAR = 0.005; // metres
const TOUCH2 = 0.0012 * 0.0012;
const COLORS = { o: new THREE.Color('#ff3b30'), i: new THREE.Color('#2f7bff'), b: new THREE.Color('#b44dff') };
const painted = new Set();

function keywordMatch(boneKey, words) {
  if (!words) return false;
  return words.some((w) => {
    if (w === 'rib') return /\brib\b|costal cartilage/.test(boneKey);
    if (w === 'vertebra') return /vertebra|^atlas$|^axis$/.test(boneKey);
    if (w === 'sternum') return /sternum|manubrium|xiphoid/.test(boneKey);
    return boneKey.includes(w);
  });
}

// Sample points on the muscle surface (vertices, edge midpoints and face
// centres) into a hash grid so "is there muscle near this spot?" is fast.
function buildGrid(parts) {
  const grid = new Map();
  const pts = [];
  const add = (x, y, z) => {
    const k = `${Math.floor(x / NEAR)},${Math.floor(y / NEAR)},${Math.floor(z / NEAR)}`;
    let cell = grid.get(k);
    if (!cell) grid.set(k, (cell = []));
    cell.push(pts.length);
    pts.push(x, y, z);
  };
  for (const p of parts) {
    const a = p.mesh.geometry.attributes.position.array;
    const idx = p.mesh.geometry.index.array;
    for (let i = 0; i < a.length; i += 3) add(a[i], a[i + 1], a[i + 2]);
    for (let t = 0; t < idx.length; t += 3) {
      const i = idx[t] * 3, j = idx[t + 1] * 3, k = idx[t + 2] * 3;
      add((a[i] + a[j]) / 2, (a[i + 1] + a[j + 1]) / 2, (a[i + 2] + a[j + 2]) / 2);
      add((a[j] + a[k]) / 2, (a[j + 1] + a[k + 1]) / 2, (a[j + 2] + a[k + 2]) / 2);
      add((a[i] + a[j] + a[k]) / 3, (a[i + 1] + a[j + 1] + a[k + 1]) / 3, (a[i + 2] + a[j + 2] + a[k + 2]) / 3);
    }
  }
  return { grid, pts };
}

// Returns { o, i, b } = number of bones painted per kind.
export function showAttachments(muscles) {
  clearAttachments();
  const count = { o: 0, i: 0, b: 0 };
  if (!muscles.length) return count;
  const box = new THREE.Box3();
  for (const m of muscles) box.union(m.box);
  box.expandByScalar(NEAR);
  const { grid, pts } = buildGrid(muscles);
  const ob = [...new Set(muscles.flatMap((m) => m.info.ob || []))];
  const ib = [...new Set(muscles.flatMap((m) => m.info.ib || []))];
  const near2 = NEAR * NEAR;

  for (const bone of app.parts) {
    if (bone.sys !== 'bone' && bone.sys !== 'joint') continue;
    if (!bone.box.intersectsBox(box)) continue;
    const isO = keywordMatch(bone.key, ob), isI = keywordMatch(bone.key, ib);
    if (!isO && !isI) continue;
    const kind = isO && isI ? 'b' : isO ? 'o' : 'i';
    const a = bone.mesh.geometry.attributes.position.array;
    const nrm = bone.mesh.geometry.attributes.normal.array;
    const n = a.length / 3;
    let colors = null;
    for (let v = 0; v < n; v++) {
      const x = a[v * 3], y = a[v * 3 + 1], z = a[v * 3 + 2];
      if (x < box.min.x || x > box.max.x || y < box.min.y || y > box.max.y || z < box.min.z || z > box.max.z) continue;
      const nx = nrm[v * 3], ny = nrm[v * 3 + 1], nz = nrm[v * 3 + 2];
      const cx = Math.floor(x / NEAR), cy = Math.floor(y / NEAR), cz = Math.floor(z / NEAR);
      let hit = false;
      for (let dx = -1; dx <= 1 && !hit; dx++) for (let dy = -1; dy <= 1 && !hit; dy++) for (let dz = -1; dz <= 1 && !hit; dz++) {
        const cell = grid.get(`${cx + dx},${cy + dy},${cz + dz}`);
        if (!cell) continue;
        for (const pi of cell) {
          const ex = pts[pi] - x, ey = pts[pi + 1] - y, ez = pts[pi + 2] - z;
          const d2 = ex * ex + ey * ey + ez * ez;
          if (d2 >= near2) continue;
          // The muscle must sit on the outside of this bone surface, so the
          // far side of a thin bone (e.g. the hip blade) is not painted.
          if (d2 < TOUCH2 || ex * nx + ey * ny + ez * nz > 0) { hit = true; break; }
        }
      }
      if (!hit) continue;
      if (!colors) {
        colors = new Float32Array(n * 3);
        for (let k = 0; k < n; k++) { colors[k * 3] = bone.color.r; colors[k * 3 + 1] = bone.color.g; colors[k * 3 + 2] = bone.color.b; }
      }
      const c = COLORS[kind];
      colors[v * 3] = c.r; colors[v * 3 + 1] = c.g; colors[v * 3 + 2] = c.b;
    }
    if (!colors) continue;
    bone.mesh.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = bone.mesh.material;
    mat.vertexColors = true; mat.color.setRGB(1, 1, 1); mat.emissive.setRGB(0, 0, 0); mat.needsUpdate = true;
    bone.painted = true;
    painted.add(bone);
    count[kind]++;
  }
  refresh();
  return count;
}

export function clearAttachments() {
  for (const bone of painted) {
    bone.mesh.geometry.deleteAttribute('color');
    bone.mesh.material.vertexColors = false;
    bone.mesh.material.needsUpdate = true;
    bone.painted = false;
  }
  const had = painted.size > 0;
  painted.clear();
  if (had) refresh();
}

export const paintedBones = () => [...painted];
