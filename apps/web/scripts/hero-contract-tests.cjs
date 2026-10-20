/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/components/hero/turntable.ts'), 'utf8');
const moduleOutput = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
  { exports: moduleOutput.exports, module: moduleOutput });
const { heroAngleAt, heroFrameDistance, HERO_CAMERA_FOV, HERO_TURN_SECONDS, HERO_REST_ANGLE } = moduleOutput.exports;
assert.equal(heroAngleAt(0), HERO_REST_ANGLE);
assert.ok(Math.abs(heroAngleAt(HERO_TURN_SECONDS) - heroAngleAt(0) - Math.PI * 2) < 1e-10);
assert.equal(heroAngleAt(100), heroAngleAt(HERO_TURN_SECONDS));
assert.equal(heroAngleAt(NaN), heroAngleAt(0));
for (const aspect of [0.8,1.3,1.8]) {
  const distance=heroFrameDistance(2,aspect);
  assert.ok(distance*Math.sin(HERO_CAMERA_FOV*Math.PI/360)>2);
}
let previous = heroAngleAt(0);
for (let frame = 1; frame <= 480; frame++) {
  const angle = heroAngleAt(frame / 60);
  assert.ok(angle >= previous); previous = angle;
}
for (const hero of ['car','house','land','creditCard','studentLoan','medical','personal','recreation','custom','vault']) {
  const bytes = fs.readFileSync(path.join(root, `public/heroes/${hero}.glb`));
  assert.equal(bytes.readUInt32LE(0), 0x46546c67);
  assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8'));
  assert.ok(json.meshes.length > 0);
  assert.ok(json.accessors.some(accessor => accessor.type === 'VEC3' && accessor.count > 20));
  assert.ok(!json.buffers.some(buffer => buffer.uri));
  assert.ok(fs.statSync(path.join(root, `public/heroes/${hero}.webp`)).size < 450 * 1024);
  assert.ok(bytes.length < (hero === 'car' ? 2.25 : 1.25) * 1024 * 1024);
}
console.log('Hero contracts passed: ten self-contained GLBs, ten optimized posters, finite full-turn timing.');
