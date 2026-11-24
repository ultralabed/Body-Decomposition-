// Step 1 of the model pipeline.
// Reads the raw BodyParts3D binary STL files (one per anatomical part),
// welds duplicate vertices, simplifies each mesh to a mobile-friendly
// triangle budget and writes a small binary cache per part.
//
//   node 01-simplify.mjs <stlDir> <cacheDir> [density] [shard/total]
//
// Coordinates are converted from BodyParts3D (mm, +x = body left, -y = front,
// +z = up) to the viewer convention (metres, +x = body left, +y = up,
// +z = front).

import fs from 'node:fs';
import path from 'node:path';
import { MeshoptSimplifier } from 'meshoptimizer';

const [stlDir, cacheDir, densityArg, shardArg] = process.argv.slice(2);
if (!stlDir || !cacheDir) {
  console.error('usage: node 01-simplify.mjs <stlDir> <cacheDir> [mm2PerTriangle] [shard/total]');
  process.exit(1);
}
const MM2_PER_TRI = Number(densityArg || 9); // lower = more detail
const [shard, shards] = (shardArg || '0/1').split('/').map(Number);
const MIN_TRIS = 120;
const MAX_TRIS = 26000;

fs.mkdirSync(cacheDir, { recursive: true });
await MeshoptSimplifier.ready;

function readStl(file) {
  const buf = fs.readFileSync(file);
  const n = buf.readUInt32LE(80);
  const pos = new Float32Array(n * 9);
  let o = 84;
  for (let t = 0; t < n; t++) {
    o += 12; // skip facet normal
    for (let k = 0; k < 9; k++) { pos[t * 9 + k] = buf.readFloatLE(o); o += 4; }
    o += 2;
  }
  return pos;
}

// Weld vertices that share the exact same position (open addressing hash).
function weld(soup) {
  const nv = soup.length / 3;
  const bits = new Uint32Array(soup.buffer, soup.byteOffset, soup.length);
  let cap = 1; while (cap < nv * 2) cap <<= 1;
  const table = new Int32Array(cap).fill(-1);
  const out = new Float32Array(soup.length);
  const index = new Uint32Array(nv);
  let count = 0;
  for (let i = 0; i < nv; i++) {
    const a = bits[i * 3], b = bits[i * 3 + 1], c = bits[i * 3 + 2];
    let h = (Math.imul(a, 73856093) ^ Math.imul(b, 19349663) ^ Math.imul(c, 83492791)) & (cap - 1);
    for (;;) {
      const j = table[h];
      if (j === -1) {
        table[h] = count;
        out[count * 3] = soup[i * 3]; out[count * 3 + 1] = soup[i * 3 + 1]; out[count * 3 + 2] = soup[i * 3 + 2];
        index[i] = count++;
        break;
      }
      const ob = new Uint32Array(out.buffer, j * 12, 3);
      if (ob[0] === a && ob[1] === b && ob[2] === c) { index[i] = j; break; }
      h = (h + 1) & (cap - 1);
    }
  }
  return { positions: out.slice(0, count * 3), indices: index };
}

function dropDegenerate(indices) {
  const out = new Uint32Array(indices.length);
  let n = 0;
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i], b = indices[i + 1], c = indices[i + 2];
    if (a === b || b === c || a === c) continue;
    out[n++] = a; out[n++] = b; out[n++] = c;
  }
  return out.slice(0, n);
}

function surfaceArea(pos, idx) {
  let area = 0;
  for (let i = 0; i < idx.length; i += 3) {
    const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    area += Math.sqrt(nx * nx + ny * ny + nz * nz) / 2;
  }
  return area;
}

function compact(pos, idx) {
  const remap = new Int32Array(pos.length / 3).fill(-1);
  const outPos = new Float32Array(pos.length);
  const outIdx = new Uint32Array(idx.length);
  let n = 0;
  for (let i = 0; i < idx.length; i++) {
    let r = remap[idx[i]];
    if (r === -1) {
      r = remap[idx[i]] = n++;
      outPos[r * 3] = pos[idx[i] * 3]; outPos[r * 3 + 1] = pos[idx[i] * 3 + 1]; outPos[r * 3 + 2] = pos[idx[i] * 3 + 2];
    }
    outIdx[i] = r;
  }
  return { positions: outPos.slice(0, n * 3), indices: outIdx };
}

const files = fs.readdirSync(stlDir).filter((f) => f.endsWith('.stl')).sort();
let totalIn = 0, totalOut = 0, done = 0;
for (let fi = 0; fi < files.length; fi++) {
  if (fi % shards !== shard) continue;
  const id = files[fi].slice(0, -4);
  const outFile = path.join(cacheDir, id + '.bin');
  if (fs.existsSync(outFile)) continue;

  const soup = readStl(path.join(stlDir, files[fi]));
  const welded = weld(soup);
  let idx = dropDegenerate(welded.indices);
  let pos = welded.positions;
  const trisIn = idx.length / 3;
  const area = surfaceArea(pos, idx);

  let target = Math.round(area / MM2_PER_TRI);
  target = Math.max(MIN_TRIS, Math.min(MAX_TRIS, target));
  if (id === 'FMA7163') target = 36000; // skin: one big smooth surface

  if (trisIn > target * 1.15) {
    // Pass 1: respect topology. Pass 2 (only if still far above budget):
    // allow pruning of tiny disconnected islands.
    let [res] = MeshoptSimplifier.simplify(idx, pos, 3, target * 3, 0.02);
    if (res.length / 3 > target * 1.6) {
      try {
        [res] = MeshoptSimplifier.simplify(res, pos, 3, target * 3, 0.03, ['Prune']);
      } catch { /* flag unsupported: keep pass 1 */ }
    }
    idx = res;
  }
  ({ positions: pos, indices: idx } = compact(pos, idx));

  // mm (x left, -y front, z up)  ->  m (x left, y up, z front)
  const conv = new Float32Array(pos.length);
  for (let i = 0; i < pos.length; i += 3) {
    conv[i] = pos[i] * 0.001;
    conv[i + 1] = pos[i + 2] * 0.001;
    conv[i + 2] = -pos[i + 1] * 0.001;
  }

  const header = Buffer.alloc(16);
  header.writeUInt32LE(conv.length / 3, 0);
  header.writeUInt32LE(idx.length / 3, 4);
  header.writeFloatLE(area, 8);
  header.writeUInt32LE(trisIn, 12);
  fs.writeFileSync(outFile, Buffer.concat([header, Buffer.from(conv.buffer), Buffer.from(idx.buffer)]));

  totalIn += trisIn; totalOut += idx.length / 3; done++;
  if (done % 25 === 0) console.log(`[${shard}] ${done} parts, ${totalIn} -> ${totalOut} tris`);
}
console.log(`[${shard}] finished ${done} parts, ${totalIn} -> ${totalOut} tris`);
