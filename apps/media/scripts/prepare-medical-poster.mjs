import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
const sources=new URL('../sources/medical/',import.meta.url);

export async function prepareMedicalPoster(overrides={}) {
  const config=JSON.parse(await readFile(new URL('poster.json',sources),'utf8'));
  const source=overrides.sourceBytes??await readFile(new URL('poster.png',sources));
  const original=overrides.originalBytes??await readFile(new URL('original-poster.webp',sources));
  if(hash(source)!==config.sourceSha256)throw new Error('Medical source hash mismatch');
  if(config.originalPosterSha256!=='090b189bd6ec0a40e23ad470acbf86ff0b950a481153fc6f991a2876e5e9cda2'||hash(original)!==config.originalPosterSha256)throw new Error('Medical original poster hash mismatch');
  const metadata=await sharp(source).metadata();
  if(!metadata.hasAlpha||metadata.width<1200)throw new Error('Medical source must retain detailed transparent artwork');
  const output=await sharp(source).resize(1200,1000,{fit:'inside',withoutEnlargement:true}).webp({quality:90,alphaQuality:100,effort:6}).toBuffer();
  const record={id:'medical',generated:config.generated,tool:config.tool,source:config.source,
    sourceFile:'apps/media/sources/medical/poster.png',sourceSha256:hash(source),posterSha256:hash(output),bytes:output.length,
    role:'Edited generated product-render reference and transparent static fallback; original emerald shield badge, not a reconstructed mesh.',
    revision:config.revision,previous:{source:config.previousSource,sourceSha256:config.previousSourceSha256,posterSha256:config.originalPosterSha256}};
  return {output,record};
}
