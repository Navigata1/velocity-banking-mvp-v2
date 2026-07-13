/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const zlib = require('node:zlib');
const { createGracefulShutdown } = require('./built-server-harness.cjs');
const {
  MAX_SETTLED_SPATIAL_CELL_DISTANCE,
  MAX_SETTLED_SPATIAL_MEAN_DISTANCE,
  MIN_MATERIAL_SPATIAL_CELL_DISTANCE,
  MIN_MATERIAL_SPATIAL_CHANGED_CELL_COUNT,
  compareSpatialDescriptors,
  decodePngRgba,
  hasMaterialSpatialChange,
  samplePngPixels,
} = require('./png-pixel-proof.cjs');

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? (value >>> 1) ^ 0xedb88320 : value >>> 1;
  return value >>> 0;
});

function crc32(buffer) {
  let value = 0xffffffff;
  for (const byte of buffer) value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const result = Buffer.alloc(12 + data.length);
  result.writeUInt32BE(data.length, 0);
  typeBuffer.copy(result, 4);
  data.copy(result, 8);
  result.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 8 + data.length);
  return result;
}

function makePng({ width = 1, height = 1, raw = Buffer.from([0, 20, 120, 220, 255]), chunks = null, compressedIdat = null } = {}) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const body = chunks ?? [chunk('IHDR', header), chunk('IDAT', compressedIdat ?? zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))];
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), ...body]);
}

function makeSpatialRaw(width, height, pixelAt) {
  const raw = Buffer.alloc(height * (width * 4 + 1));
  let offset = 0;
  for (let y = 0; y < height; y += 1) {
    raw[offset++] = 0;
    for (let x = 0; x < width; x += 1) {
      const [red, green, blue, alpha] = pixelAt(x, y);
      raw[offset++] = red;
      raw[offset++] = green;
      raw[offset++] = blue;
      raw[offset++] = alpha;
    }
  }
  return raw;
}

async function testGracefulShutdown() {
  const calls = [];
  let hardExit;
  const shutdown = createGracefulShutdown({
    closeBrowser: async () => calls.push('browser'),
    stopServer: async () => calls.push('server'),
    exit: (code) => calls.push(`exit:${code}`),
    hardExit: (code) => { hardExit = code; },
    setTimeoutFn: () => ({ unref() {} }),
    clearTimeoutFn: () => calls.push('clear-timeout'),
  });

  const first = shutdown(130);
  const second = shutdown(143);
  assert.strictEqual(second, first, 'expected signal shutdown to be idempotent');
  await first;
  assert.deepEqual(calls, ['browser', 'server', 'clear-timeout', 'exit:130']);
  assert.equal(hardExit, undefined);
}

async function testGracefulShutdownBrowserFailure() {
  const calls = [];
  const shutdown = createGracefulShutdown({
    closeBrowser: async () => {
      calls.push('browser');
      throw new Error('browser close failed');
    },
    stopServer: async () => calls.push('server'),
    exit: (code) => calls.push(`exit:${code}`),
    hardExit: () => {},
    setTimeoutFn: () => ({ unref() {} }),
    clearTimeoutFn: () => calls.push('clear-timeout'),
  });

  const first = shutdown(143);
  assert.strictEqual(shutdown(130), first, 'expected rejected signal shutdown to remain idempotent');
  await assert.rejects(first, /browser close failed/);
  assert.deepEqual(calls, ['browser', 'server', 'clear-timeout', 'exit:143']);
}

async function testGracefulShutdownServerFailure() {
  const calls = [];
  const shutdown = createGracefulShutdown({
    closeBrowser: async () => calls.push('browser'),
    stopServer: async () => {
      calls.push('server');
      throw new Error('server stop failed');
    },
    exit: (code) => calls.push(`exit:${code}`),
    hardExit: () => {},
    setTimeoutFn: () => ({ unref() {} }),
    clearTimeoutFn: () => calls.push('clear-timeout'),
  });

  const first = shutdown(143);
  assert.strictEqual(shutdown(130), first, 'expected server-rejected signal shutdown to remain idempotent');
  await assert.rejects(first, /server stop failed/);
  assert.deepEqual(calls, ['browser', 'server', 'clear-timeout', 'exit:143']);
}

async function run() {
  const valid = makePng();
  const decoded = decodePngRgba(valid);
  assert.equal(decoded.width, 1);
  assert.equal(decoded.height, 1);
  assert.equal(decoded.pixels.length, 4);
  assert.equal(samplePngPixels(decoded).colorCount, 1);
  assert.equal(samplePngPixels(decoded, 9, { left: 0, right: 1, top: 0, bottom: 1 }).opaquePixels, 81);
  const spatialPixel = (blockStart, noisy = false) => (x, y) => {
    const inBlock = x >= blockStart && x < blockStart + 8 && y >= 8 && y < 16;
    const base = inBlock ? [224, 192, 64] : [32, 64, 96];
    const noise = noisy && (x + y) % 2 === 0 ? 1 : 0;
    return [base[0] + noise, base[1] + noise, base[2] + noise, 255];
  };
  const spatialLeft = decodePngRgba(makePng({ width: 24, height: 24, raw: makeSpatialRaw(24, 24, spatialPixel(2)) }));
  const spatialRight = decodePngRgba(makePng({ width: 24, height: 24, raw: makeSpatialRaw(24, 24, spatialPixel(14)) }));
  const spatialLeftWithNoise = decodePngRgba(makePng({ width: 24, height: 24, raw: makeSpatialRaw(24, 24, spatialPixel(2, true)) }));
  const lightingVarianceBefore = decodePngRgba(makePng({ width: 24, height: 24, raw: makeSpatialRaw(24, 24, () => [55, 117, 109, 255]) }));
  const lightingVarianceAfter = decodePngRgba(makePng({ width: 24, height: 24, raw: makeSpatialRaw(24, 24, () => [57, 126, 116, 255]) }));
  const leftPixels = samplePngPixels(spatialLeft);
  const oneBitNoiseDistance = compareSpatialDescriptors(leftPixels.stabilityDescriptor, samplePngPixels(spatialLeftWithNoise).stabilityDescriptor);
  const lightingDistance = compareSpatialDescriptors(samplePngPixels(lightingVarianceBefore).stabilityDescriptor, samplePngPixels(lightingVarianceAfter).stabilityDescriptor);
  const shiftedGeometryDistance = compareSpatialDescriptors(leftPixels.stabilityDescriptor, samplePngPixels(spatialRight).stabilityDescriptor);
  assert.notEqual(leftPixels.identitySignature, samplePngPixels(spatialRight).identitySignature, 'expected materially different spatial renders to have distinct identities');
  assert.ok(oneBitNoiseDistance.maxCellDistance <= 1 && oneBitNoiseDistance.meanCellDistance <= 1, 'expected one-LSB compositor noise to stay within the settled spatial distance budget');
  assert.ok(lightingDistance.maxCellDistance <= MAX_SETTLED_SPATIAL_CELL_DISTANCE && lightingDistance.meanCellDistance <= MAX_SETTLED_SPATIAL_MEAN_DISTANCE, 'expected realistic lighting variance to stay within the settled spatial distance budget');
  assert.ok(shiftedGeometryDistance.maxCellDistance > MAX_SETTLED_SPATIAL_CELL_DISTANCE && shiftedGeometryDistance.meanCellDistance > MAX_SETTLED_SPATIAL_MEAN_DISTANCE, 'expected a spatial geometry shift to exceed the settled spatial distance budget');
  assert.equal(hasMaterialSpatialChange(oneBitNoiseDistance), false, 'expected one-LSB compositor noise not to count as a material spatial change');
  assert.equal(hasMaterialSpatialChange(lightingDistance), false, 'expected small realistic lighting variance not to count as a material spatial change');
  assert.equal(hasMaterialSpatialChange(shiftedGeometryDistance), true, 'expected a material spatial geometry shift to count as changed');
  assert.equal(MIN_MATERIAL_SPATIAL_CELL_DISTANCE, 24);
  assert.equal(MIN_MATERIAL_SPATIAL_CHANGED_CELL_COUNT, 16);

  const badCrc = Buffer.from(valid);
  badCrc[badCrc.length - 1] ^= 0xff;
  assert.throws(() => decodePngRgba(badCrc), /CRC/i);
  assert.throws(() => decodePngRgba(valid.subarray(0, -12)), /IEND/i);
  assert.throws(() => decodePngRgba(Buffer.concat([valid, Buffer.from([0])])), /trailing/i);
  assert.throws(
    () => decodePngRgba(makePng({ compressedIdat: Buffer.concat([zlib.deflateSync(Buffer.from([0, 20, 120, 220, 255])), Buffer.from([0xde, 0xad, 0xbe, 0xef])]) })),
    /trailing compressed/i,
    'expected CRC-valid unused zlib bytes inside IDAT to be rejected'
  );
  assert.throws(() => decodePngRgba(makePng({ raw: Buffer.from([0, 10, 20]) })), /inflated/i);
  assert.throws(() => decodePngRgba(makePng({ raw: Buffer.alloc(256 * 1024) })), /bounded output/i);
  assert.throws(() => decodePngRgba(makePng({ chunks: [chunk('IHDR', Buffer.alloc(12)), chunk('IEND', Buffer.alloc(0))] })), /IHDR/i);
  assert.throws(() => decodePngRgba(makePng({ chunks: [chunk('IDAT', zlib.deflateSync(Buffer.from([0, 0, 0, 0, 255]))), chunk('IHDR', Buffer.alloc(13)), chunk('IEND', Buffer.alloc(0))] })), /IHDR.*first/i);
  const oversizedHeader = Buffer.alloc(13);
  oversizedHeader.writeUInt32BE(4097, 0);
  oversizedHeader.writeUInt32BE(1, 4);
  oversizedHeader[8] = 8;
  oversizedHeader[9] = 6;
  assert.throws(() => decodePngRgba(makePng({ chunks: [chunk('IHDR', oversizedHeader), chunk('IDAT', zlib.deflateSync(Buffer.from([0, 0, 0, 0, 255]))), chunk('IEND', Buffer.alloc(0))] })), /dimensions/i);
  assert.throws(() => decodePngRgba(makePng({ raw: Buffer.from([5, 20, 120, 220, 255]) })), /scanline filter/i);
  assert.throws(() => decodePngRgba(makePng({ chunks: [
    chunk('IHDR', Buffer.from([0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0])),
    chunk('IDAT', zlib.deflateSync(Buffer.from([0, 20, 120, 220, 255]))),
    chunk('tEXt', Buffer.from('proof')),
    chunk('IDAT', zlib.deflateSync(Buffer.alloc(0))),
    chunk('IEND', Buffer.alloc(0)),
  ] })), /consecutive/i);

  await testGracefulShutdown();
  await testGracefulShutdownBrowserFailure();
  await testGracefulShutdownServerFailure();
  console.log('Three stage PNG and lifecycle helper tests passed.');
}

run().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
