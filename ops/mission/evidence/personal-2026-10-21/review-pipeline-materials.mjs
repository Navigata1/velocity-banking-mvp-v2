import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const repo = new URL('../../../', import.meta.url), req = createRequire(new URL('apps/media/package.json', repo));
const sharp = req('sharp'), read = p => readFileSync(new URL(p, repo));
const sha = b => createHash('sha256').update(b).digest('hex');
const source = read('apps/media/scripts/build-refined-personal.mjs'), configBytes = read('apps/media/sources/personal/materials.json'), config = JSON.parse(configBytes);
const bytes = read('apps/web/public/heroes/personal.glb'), jsonLength = bytes.readUInt32LE(12), gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength));
const bin = bytes.subarray(28 + jsonLength), records = JSON.parse(read('apps/media/hero-imported.json')), inventory = JSON.parse(read('apps/media/hero-models.json'));
const record = records.find(r => r.id === 'personal');
const hashes = { model: sha(bytes), sourceLF: sha(source.toString().replace(/\r\n/g, '\n')), sourceRaw: sha(source), configCanonical: sha(JSON.stringify(config)), configRaw: sha(configBytes) };
assert.deepEqual(record, inventory.find(r => r.id === 'personal'));
assert.equal(record.sha256, hashes.model); assert.equal(record.sourceSha256, hashes.sourceLF); assert.equal(record.materialSourceSha256, hashes.configCanonical); assert.equal(record.bytes, bytes.length);
const retained = read('apps/media/sources/student-loan/leather.png'), original = JSON.parse(read('apps/media/sources/student-loan/materials.json')).images.find(i => i.file === 'leather.png');
assert.equal(config.images.length, 1); assert.equal(config.images[0].file, '../student-loan/leather.png'); assert.equal(sha(retained), config.images[0].sha256); assert.equal(original.sha256, sha(retained)); assert.equal(original.originalOutput, config.images[0].originalOutput);
assert.match(record.license, /retained original generated leather/); assert.match(config.limitations, /not photographed scans or measured/); assert.match(gltf.asset.copyright, /approximate PBR, not measured/);
const rendered = new Set(), materials = new Set();
function visit(i) { rendered.add(i); const n = gltf.nodes[i]; for (const p of gltf.meshes[n.mesh]?.primitives ?? []) materials.add(p.material); (n.children ?? []).forEach(visit); }
for (const scene of gltf.scenes) scene.nodes.forEach(visit);
const uses = new Map();
for (const i of materials) {
  const m = gltf.materials[i], p = m.pbrMetallicRoughness;
  assert.ok(!(m.emissiveFactor ?? [0, 0, 0]).some(Boolean) && !m.emissiveTexture && !m.extensions?.KHR_materials_unlit);
  for (const [role, slot] of [['Color', p.baseColorTexture], ['Normal', m.normalTexture], ['Roughness', p.metallicRoughnessTexture]]) if (slot) {
    const image = gltf.textures[slot.index].extensions.EXT_texture_webp.source;
    assert.ok(gltf.images[image].name.endsWith('-' + role));
    const rows = uses.get(image) ?? []; rows.push({ material: m.name, role, colorSpace: role === 'Color' ? 'sRGB' : 'linear data', texCoord: slot.texCoord ?? 0, scale: slot.extensions?.KHR_texture_transform?.scale ?? [1, 1] }); uses.set(image, rows);
  }
}
assert.equal(gltf.images.length, 9); assert.equal(uses.size, 9);
const stats = data => { const min = [255, 255, 255], max = [0, 0, 0], sum = [0, 0, 0]; for (let i = 0; i < data.length; i++) { const c = i % 3; min[c] = Math.min(min[c], data[i]); max[c] = Math.max(max[c], data[i]); sum[c] += data[i]; } return { min, max, mean: sum.map(n => n / (data.length / 3)) }; };
const maps = [], decoded = new Map();
for (const [i, image] of gltf.images.entries()) {
  assert.ok(image.bufferView !== undefined && !image.uri && image.mimeType === 'image/webp');
  const view = gltf.bufferViews[image.bufferView]; assert.equal(view.buffer, 0);
  const encoded = bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength), { data, info } = await sharp(encoded).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const side = image.name === 'P-Leather-Color' ? 512 : 256; assert.equal(info.width, side); assert.equal(info.height, side); assert.equal(info.channels, 3);
  const chunks = []; for (let p = 12; p + 8 <= encoded.length;) { chunks.push(encoded.toString('ascii', p, p + 4)); p += 8 + encoded.readUInt32LE(p + 4) + (encoded.readUInt32LE(p + 4) & 1); }
  const row = { name: image.name, bytes: encoded.length, sha256: sha(encoded), width: side, height: side, chunks, channels: stats(data), uses: uses.get(i) };
  if (image.name.endsWith('-Normal')) {
    assert.ok(chunks.includes('VP8L')); let min = Infinity, max = 0;
    for (let p = 0; p < data.length; p += 3) { const length = Math.hypot(...[0, 1, 2].map(c => data[p + c] / 127.5 - 1)); min = Math.min(min, length); max = Math.max(max, length); }
    assert.ok(min > 0.99 && max < 1.01 && row.channels.min[2] > 180); row.normalLength = [min, max];
  }
  decoded.set(image.name, data); maps.push(row);
}
// Independent pixel oracle: retained grayscale albedo -> authored height gradients, never an encoder or GLB builder.
const n = 512, gray = await sharp(retained).resize(n, n).greyscale().removeAlpha().raw().toBuffer(), expected = Buffer.alloc(n * n * 3);
const height = (x, y) => gray[((y + n) % n) * n + ((x + n) % n)] / 255;
let colorError = 0; const color = decoded.get('P-Leather-Color');
for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const i = (y * n + x) * 3, dx = (height(x + 1, y) - height(x - 1, y)) * 0.8, dy = (height(x, y + 1) - height(x, y - 1)) * 0.8, l = Math.hypot(dx, dy, 1); expected[i] = Math.round(127.5 - dx / l * 127.5); expected[i + 1] = Math.round(127.5 - dy / l * 127.5); expected[i + 2] = Math.round(127.5 + 127.5 / l); colorError += Math.abs(color[i] - Math.round(255 * Math.min(1, 0.40 + height(x, y) * 0.68))); }
const resized = await sharp(expected, { raw: { width: n, height: n, channels: 3 } }).resize(256, 256).raw().toBuffer();
for (let i = 0; i < resized.length; i += 3) { const v = [0, 1, 2].map(c => resized[i + c] / 127.5 - 1), l = Math.hypot(...v); for (let c = 0; c < 3; c++) resized[i + c] = Math.round((v[c] / l + 1) * 127.5); }
assert.deepEqual(decoded.get('P-Leather-Normal'), resized, 'shipping normal must derive exactly from retained original'); assert.ok(colorError / (n * n) < 3);
const factors = [...materials].map(i => { const m = gltf.materials[i], p = m.pbrMetallicRoughness, set = m.name.includes('Leather') ? 'Leather' : m.name.includes('Brass') ? 'Brass' : m.name.includes('Steel') ? 'Steel' : null; const data = set && stats(decoded.get('P-' + set + '-Roughness')); const roughness = p.roughnessFactor ?? 1, metallic = p.metallicFactor ?? 1; if (set) { assert.equal(roughness, 1); assert.equal(metallic, set === 'Leather' ? 0 : 1); assert.equal(m.normalTexture.scale, set === 'Leather' ? 0.65 : 0.14); } return { name: m.name, baseColorLinear: p.baseColorFactor, roughnessFactor: roughness, metallicFactor: metallic, normalScale: m.normalTexture?.scale, effectiveRoughness: data && [data.min[1], data.max[1]].map(v => v / 255 * roughness), effectiveMetallic: data && [data.min[2], data.max[2]].map(v => v / 255 * metallic) }; });
const loader = read('apps/web/node_modules/three/examples/jsm/loaders/GLTFLoader.js').toString();
for (const call of ["parser.assignTexture( materialParams, 'map', metallicRoughness.baseColorTexture, SRGBColorSpace )", "parser.assignTexture( materialParams, 'normalMap', materialDef.normalTexture )", "parser.assignTexture( materialParams, 'roughnessMap', metallicRoughness.metallicRoughnessTexture )", "parser.assignTexture( materialParams, 'metalnessMap', metallicRoughness.metallicRoughnessTexture )"]) assert.ok(loader.includes(call));
console.log(JSON.stringify({ probe: 'material-provenance', status: 'PASS', hashes, retainedLeather: { bytes: retained.length, sha256: sha(retained), originalOutput: original.originalOutput }, authoredNormalExactMatch: true, leatherColorMeanAbsoluteByteError: colorError / (n * n), maps, factors, note: 'CPU only. Color-space checked against local shipped GLTFLoader, not browser rendering. Generated-source claim traced to retained project metadata, not independently authenticated.' }, null, 2));
