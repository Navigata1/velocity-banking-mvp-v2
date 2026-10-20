import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const require = createRequire(new URL('../../web/package.json', import.meta.url));
const sharp = require('sharp');
const source = process.argv[2];
if (!source) throw new Error('Usage: node scripts/prepare-hero-posters.mjs <generated-image-directory>');
const files = {
  car: 'exec-f473d226-3567-4602-a46c-ea55f14f9493.png',
  house: 'exec-9eb4bb6a-4848-40d6-87d1-df59bdf67a82.png',
  land: 'exec-5a8a3eb0-e5ed-4b92-9589-7ae85c06a120.png',
  creditCard: 'exec-01f84116-1b2f-4ab6-81f4-c1b6ec1ca2f8.png',
  studentLoan: 'exec-8444db0a-fe6e-414d-842b-d9cdbaabb96a.png',
  medical: 'exec-f2604576-9027-410e-8f4e-9eb674801c16.png',
  personal: 'exec-d886def9-70b0-45ec-bb9e-5df0a5623dc7.png',
  recreation: 'exec-6947528c-23c1-4139-b1d1-04bc08462e6a.png',
  custom: 'exec-6b35f159-2a9a-4bae-a365-60ede6a3303f.png',
  vault: 'exec-dc438c3c-2951-4913-8c52-e4267472e450.png',
};
const destination = new URL('../../web/public/heroes/', import.meta.url);
await mkdir(destination, { recursive: true });
const provenance = [];
for (const [id, filename] of Object.entries(files)) {
  const bytes = await readFile(path.join(source, filename));
  const output = await sharp(bytes).resize(1200, 1000, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 90, alphaQuality: 100, effort: 6 }).toBuffer();
  await writeFile(new URL(`${id}.webp`, destination), output);
  provenance.push({ id, generated: '2026-10-20', tool: 'OpenAI image_gen', source: filename,
    sourceSha256: createHash('sha256').update(bytes).digest('hex'),
    posterSha256: createHash('sha256').update(output).digest('hex'), bytes: output.length,
    role: 'Generated product-render reference and static fallback; not a reconstructed mesh.' });
  console.log(`${id}: ${(output.length / 1024).toFixed(0)} KiB`);
}
await writeFile(new URL('../hero-provenance.json', import.meta.url), JSON.stringify(provenance, null, 2) + '\n');
