import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

import { visualIdentity } from '../src/visual-identity.mjs';

const documentUrl = new URL('../VISUAL-IDENTITY.md', import.meta.url);
const start = '<!-- identity-snapshot:start -->';
const end = '<!-- identity-snapshot:end -->';
const document = await readFile(documentUrl, 'utf8');
const digest = createHash('sha256').update(JSON.stringify(visualIdentity)).digest('hex');
const block = `${start}\n\`sha256:${digest}\`\n${end}`;
const pattern = new RegExp(`${start}[\\s\\S]*?${end}`);
if (!pattern.test(document)) throw new Error('Identity snapshot markers are missing.');
await writeFile(documentUrl, document.replace(pattern, block), 'utf8');
