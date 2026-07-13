/* eslint-disable @typescript-eslint/no-require-imports */
const zlib = require('node:zlib');

const PNG_SIGNATURE = Buffer.from('89504e470d0a1a0a', 'hex');
const MAX_DIMENSION = 4096;
const MAX_PIXELS = 16 * 1024 * 1024;
const STABILITY_DESCRIPTOR_GRID_SIZE = 8;
const MAX_SETTLED_SPATIAL_CELL_DISTANCE = 16;
const MAX_SETTLED_SPATIAL_MEAN_DISTANCE = 8;
const MIN_MATERIAL_SPATIAL_CELL_DISTANCE = 24;
const MIN_MATERIAL_SPATIAL_CHANGED_CELL_COUNT = 16;
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

function decodePngRgba(input) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  if (buffer.length < PNG_SIGNATURE.length || !buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new Error('Canvas screenshot was not a PNG.');
  }

  let offset = PNG_SIGNATURE.length;
  let header;
  let width;
  let height;
  let bytesPerPixel;
  let sawIdat = false;
  let closedIdat = false;
  const compressed = [];

  while (offset < buffer.length) {
    if (buffer.length - offset < 12) throw new Error('PNG is truncated before a complete chunk.');
    const length = buffer.readUInt32BE(offset);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const chunkEnd = dataEnd + 4;
    if (dataEnd < dataStart || chunkEnd > buffer.length) throw new Error('PNG chunk exceeds the available bytes.');

    const typeBuffer = buffer.subarray(offset + 4, dataStart);
    const type = typeBuffer.toString('ascii');
    if (!/^[A-Za-z]{4}$/.test(type)) throw new Error('PNG contains an invalid chunk type.');
    const data = buffer.subarray(dataStart, dataEnd);
    const expectedCrc = buffer.readUInt32BE(dataEnd);
    if (crc32(Buffer.concat([typeBuffer, data])) !== expectedCrc) throw new Error(`PNG ${type} chunk failed CRC validation.`);
    offset = chunkEnd;

    if (!header && type !== 'IHDR') throw new Error('PNG IHDR must be the first chunk.');
    if (type === 'IHDR') {
      if (header || data.length !== 13) throw new Error('PNG IHDR must appear once with exactly 13 bytes.');
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      const bitDepth = data[8];
      const colorType = data[9];
      if (!width || !height || width > MAX_DIMENSION || height > MAX_DIMENSION || width * height > MAX_PIXELS) {
        throw new Error('PNG dimensions are out of bounds.');
      }
      if (bitDepth !== 8 || ![2, 6].includes(colorType) || data[10] !== 0 || data[11] !== 0 || data[12] !== 0) {
        throw new Error('PNG uses an unsupported color, bit depth, compression, filter, or interlace mode.');
      }
      bytesPerPixel = colorType === 6 ? 4 : 3;
      header = data;
      continue;
    }

    if (type === 'IDAT') {
      if (closedIdat) throw new Error('PNG IDAT chunks must be consecutive.');
      sawIdat = true;
      compressed.push(data);
      continue;
    }

    if (sawIdat) closedIdat = true;
    if (type === 'IEND') {
      if (data.length !== 0 || !sawIdat) throw new Error('PNG IEND is malformed or arrives before IDAT.');
      if (offset !== buffer.length) throw new Error('PNG has trailing bytes after IEND.');
      break;
    }
    if (type.charCodeAt(0) >= 65 && type.charCodeAt(0) <= 90) throw new Error(`PNG contains unsupported critical chunk ${type}.`);
  }

  if (!header || !sawIdat || offset !== buffer.length || buffer.subarray(buffer.length - 8, buffer.length - 4).toString('ascii') !== 'IEND') {
    throw new Error('PNG is missing a valid IEND chunk.');
  }

  const stride = width * bytesPerPixel;
  const expectedLength = height * (stride + 1);
  const compressedInput = Buffer.concat(compressed);
  let inflated;
  try {
    inflated = zlib.inflateSync(compressedInput, { info: true, maxOutputLength: expectedLength + 1 });
  } catch (error) {
    if (error && error.code === 'ERR_BUFFER_TOO_LARGE') throw new Error('PNG IDAT data exceeded bounded output.');
    throw new Error(`PNG IDAT data could not be inflated: ${error.message}`);
  }
  const source = inflated.buffer;
  if (inflated.engine.bytesWritten !== compressedInput.length) throw new Error('PNG IDAT contains trailing compressed bytes.');
  if (source.length !== expectedLength) throw new Error(`PNG inflated data length ${source.length} did not match expected ${expectedLength}.`);

  const pixels = Buffer.alloc(stride * height);
  let sourceOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = source[sourceOffset++];
    const row = pixels.subarray(y * stride, (y + 1) * stride);
    const previous = y === 0 ? null : pixels.subarray((y - 1) * stride, y * stride);
    for (let x = 0; x < stride; x += 1) {
      const raw = source[sourceOffset++];
      const left = x >= bytesPerPixel ? row[x - bytesPerPixel] : 0;
      const up = previous ? previous[x] : 0;
      const upLeft = previous && x >= bytesPerPixel ? previous[x - bytesPerPixel] : 0;
      if (filter === 0) row[x] = raw;
      else if (filter === 1) row[x] = (raw + left) & 0xff;
      else if (filter === 2) row[x] = (raw + up) & 0xff;
      else if (filter === 3) row[x] = (raw + Math.floor((left + up) / 2)) & 0xff;
      else if (filter === 4) {
        const estimate = left + up - upLeft;
        const leftDistance = Math.abs(estimate - left);
        const upDistance = Math.abs(estimate - up);
        const upLeftDistance = Math.abs(estimate - upLeft);
        row[x] = (raw + (leftDistance <= upDistance && leftDistance <= upLeftDistance ? left : upDistance <= upLeftDistance ? up : upLeft)) & 0xff;
      } else throw new Error(`PNG uses unsupported scanline filter ${filter}.`);
    }
  }
  return { bytesPerPixel, height, pixels, width };
}

function getSpatialCellAverages(image, left, right, top, bottom, cellLimit) {
  const columns = Math.max(1, Math.min(cellLimit, right - left));
  const rows = Math.max(1, Math.min(cellLimit, bottom - top));
  const cells = [];
  for (let row = 0; row < rows; row += 1) {
    const cellTop = top + Math.floor((bottom - top) * row / rows);
    const cellBottom = Math.max(cellTop + 1, top + Math.floor((bottom - top) * (row + 1) / rows));
    for (let column = 0; column < columns; column += 1) {
      const cellLeft = left + Math.floor((right - left) * column / columns);
      const cellRight = Math.max(cellLeft + 1, left + Math.floor((right - left) * (column + 1) / columns));
      let red = 0;
      let green = 0;
      let blue = 0;
      let alpha = 0;
      let pixelCount = 0;
      for (let y = cellTop; y < cellBottom; y += 1) {
        for (let x = cellLeft; x < cellRight; x += 1) {
          const offset = (y * image.width + x) * image.bytesPerPixel;
          red += image.pixels[offset];
          green += image.pixels[offset + 1];
          blue += image.pixels[offset + 2];
          alpha += image.bytesPerPixel === 4 ? image.pixels[offset + 3] : 255;
          pixelCount += 1;
        }
      }
      cells.push({ alpha: alpha / pixelCount, blue: blue / pixelCount, green: green / pixelCount, red: red / pixelCount });
    }
  }
  return cells;
}

function buildSpatialSignature(image, left, right, top, bottom, cellLimit, quantizationStep) {
  return getSpatialCellAverages(image, left, right, top, bottom, cellLimit)
    .map(({ alpha, blue, green, red }) => `${Math.round(red / quantizationStep)},${Math.round(green / quantizationStep)},${Math.round(blue / quantizationStep)},${Math.round(alpha / quantizationStep)}`)
    .join('|');
}

function buildStabilityDescriptor(image, left, right, top, bottom) {
  return getSpatialCellAverages(image, left, right, top, bottom, STABILITY_DESCRIPTOR_GRID_SIZE)
    .map(({ blue, green, red }) => 0.2126 * red + 0.7152 * green + 0.0722 * blue);
}

function compareSpatialDescriptors(first, second) {
  if (!Array.isArray(first) || !Array.isArray(second) || first.length === 0 || first.length !== second.length) {
    throw new Error('Spatial descriptors must be non-empty arrays with matching cell counts.');
  }
  let maxCellDistance = 0;
  let totalDistance = 0;
  let changedCellCount = 0;
  for (let index = 0; index < first.length; index += 1) {
    if (!Number.isFinite(first[index]) || !Number.isFinite(second[index])) throw new Error('Spatial descriptors must contain finite numeric cells.');
    const distance = Math.abs(first[index] - second[index]);
    maxCellDistance = Math.max(maxCellDistance, distance);
    totalDistance += distance;
    if (distance > 1) changedCellCount += 1;
  }
  return { changedCellCount, maxCellDistance, meanCellDistance: totalDistance / first.length };
}

function hasMaterialSpatialChange(distance) {
  return Boolean(distance) &&
    Number.isFinite(distance.maxCellDistance) &&
    Number.isInteger(distance.changedCellCount) &&
    distance.maxCellDistance >= MIN_MATERIAL_SPATIAL_CELL_DISTANCE &&
    distance.changedCellCount >= MIN_MATERIAL_SPATIAL_CHANGED_CELL_COUNT;
}

function samplePngPixels(image, gridSize = 9, bounds = null) {
  const colors = new Set();
  const left = Math.max(0, Math.min(image.width - 1, Math.round(bounds?.left ?? 0)));
  const right = Math.max(left + 1, Math.min(image.width, Math.round(bounds?.right ?? image.width)));
  const top = Math.max(0, Math.min(image.height - 1, Math.round(bounds?.top ?? 0)));
  const bottom = Math.max(top + 1, Math.min(image.height, Math.round(bounds?.bottom ?? image.height)));
  let opaquePixels = 0;
  for (let y = 1; y <= gridSize; y += 1) {
    for (let x = 1; x <= gridSize; x += 1) {
      const sampleX = Math.min(right - 1, Math.max(left, Math.round(left + (right - left) * x / (gridSize + 1))));
      const sampleY = Math.min(bottom - 1, Math.max(top, Math.round(top + (bottom - top) * y / (gridSize + 1))));
      const offset = (sampleY * image.width + sampleX) * image.bytesPerPixel;
      const alpha = image.bytesPerPixel === 4 ? image.pixels[offset + 3] : 255;
      if (alpha === 0) continue;
      const red = image.pixels[offset];
      const green = image.pixels[offset + 1];
      const blue = image.pixels[offset + 2];
      opaquePixels += 1;
      colors.add(`${red},${green},${blue},${alpha}`);
    }
  }
  const identitySignature = buildSpatialSignature(image, left, right, top, bottom, 24, 8);
  const stabilityDescriptor = buildStabilityDescriptor(image, left, right, top, bottom);
  return { colorCount: colors.size, fingerprint: identitySignature, identitySignature, opaquePixels, stabilityDescriptor };
}

module.exports = {
  MAX_SETTLED_SPATIAL_CELL_DISTANCE,
  MAX_SETTLED_SPATIAL_MEAN_DISTANCE,
  MIN_MATERIAL_SPATIAL_CELL_DISTANCE,
  MIN_MATERIAL_SPATIAL_CHANGED_CELL_COUNT,
  compareSpatialDescriptors,
  decodePngRgba,
  hasMaterialSpatialChange,
  samplePngPixels,
};
