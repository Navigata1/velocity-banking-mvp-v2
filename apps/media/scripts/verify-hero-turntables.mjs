import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {decodePngRgba,samplePngPixels,compareSpatialDescriptors}=require('../../web/scripts/png-pixel-proof.cjs');
const directory=new URL('../hyperframes/output/heroes/',import.meta.url);
const results=[];
for(const id of ['car','house','land','creditCard','studentLoan','medical','personal','recreation','custom','vault']) {
  const filename=fileURLToPath(new URL(`${id}.mp4`,directory));
  const metadata=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',filename],{encoding:'utf8',windowsHide:true}));
  const stream=metadata.streams.find(s=>s.codec_type==='video');
  assert.equal(stream.width,1920); assert.equal(stream.height,1080);
  assert.ok(Math.abs(Number(metadata.format.duration)-9)<0.1);
  const frames=[];
  for(const time of [0,4,8.5]) {
    const bytes=execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-ss',String(time),'-i',filename,'-frames:v','1','-f','image2pipe','-c:v','png','-'],{maxBuffer:32*1024*1024,windowsHide:true});
    await writeFile(new URL(`${id}-${time}.png`,directory),bytes);
    const image=decodePngRgba(bytes);
    const bounds={left:300,right:1620,top:50,bottom:970};
    const proof=samplePngPixels(image,41,bounds);
    assert.ok(proof.colorCount>20,`${id} at ${time}s is blank`);
    frames.push(proof);
  }
  const motion=compareSpatialDescriptors(frames[0].stabilityDescriptor,frames[1].stabilityDescriptor);
  assert.ok(motion.maxCellDistance>10 && motion.changedCellCount>5,`${id} is not visibly turning`);
  const closure=compareSpatialDescriptors(frames[0].stabilityDescriptor,frames[2].stabilityDescriptor);
  assert.ok(closure.meanCellDistance<3,`${id} does not return to its initial orientation`);
  const bytes=await readFile(filename);
  results.push({id,width:stream.width,height:stream.height,duration:Number(metadata.format.duration),
    bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),motion,closure});
  console.log(`PASS ${id}: 1080p, 9s, visible movement, complete revolution and rest`);
}
await writeFile(new URL('verification.json',directory),JSON.stringify(results,null,2)+'\n');
