// Step 3 of the pipeline: pack the simplified meshes into three compressed
// GLB files (quantized + meshopt), grouped so the viewer can show bones and
// muscles first and load the rest afterwards.
//
//   node 03-pack.mjs <cacheDir>
//
// Every glTF node is named with its BodyParts3D id (e.g. "FMA24474").

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Document, NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { meshopt, quantize } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cacheDir = process.argv[2];
if (!cacheDir) { console.error('usage: node 03-pack.mjs <cacheDir>'); process.exit(1); }

const { parts, info } = JSON.parse(fs.readFileSync(path.join(root, 'data', 'anatomy.json'), 'utf8'));
const FILE_OF = { bone: 'skeleton', joint: 'skeleton', muscle: 'muscles', tendon: 'muscles', organ: 'other', vessel: 'other', nerve: 'other', skin: 'other' };

await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions([EXTMeshoptCompression, KHRMeshQuantization])
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder });

fs.mkdirSync(path.join(root, 'models'), { recursive: true });
const manifest = {};
for (const file of ['skeleton', 'muscles', 'other']) {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene(file);
  let tris = 0, n = 0;
  for (const p of parts) {
    if (FILE_OF[info[p.key].sys] !== file) continue;
    const buf = fs.readFileSync(path.join(cacheDir, p.id + '.bin'));
    const nv = buf.readUInt32LE(0), nt = buf.readUInt32LE(4);
    const pos = new Float32Array(buf.buffer.slice(buf.byteOffset + 16, buf.byteOffset + 16 + nv * 12));
    const idx32 = new Uint32Array(buf.buffer.slice(buf.byteOffset + 16 + nv * 12, buf.byteOffset + 16 + nv * 12 + nt * 12));
    const idx = nv <= 65535 ? Uint16Array.from(idx32) : idx32;
    const prim = doc.createPrimitive()
      .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(pos).setBuffer(buffer))
      .setIndices(doc.createAccessor().setType('SCALAR').setArray(idx).setBuffer(buffer));
    scene.addChild(doc.createNode(p.id).setMesh(doc.createMesh(p.id).addPrimitive(prim)));
    tris += nt; n++;
  }
  await doc.transform(
    quantize({ quantizePosition: 14, quantizationVolume: 'mesh' }),
    meshopt({ encoder: MeshoptEncoder, level: 'high' }),
  );
  const out = path.join(root, 'models', file + '.glb');
  await io.write(out, doc);
  manifest[file] = { bytes: fs.statSync(out).size, parts: n, triangles: tris };
  console.log(`${file}.glb: ${n} parts, ${tris} triangles, ${(manifest[file].bytes / 1e6).toFixed(2)} MB`);
}
fs.writeFileSync(path.join(root, 'models', 'manifest.json'), JSON.stringify(manifest));
