import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { MEDIA_IDENTITY_VERSION, visualIdentity } from '../src/visual-identity.mjs';

const mediaRoot = new URL('../', import.meta.url);
const projectRoot = new URL('../hyperframes/', import.meta.url);

async function text(relativePath) {
  return readFile(new URL(relativePath, projectRoot), 'utf8');
}

test('pins renderer tooling and exposes one real HyperFrames quality command', async () => {
  const manifest = JSON.parse(await readFile(new URL('package.json', mediaRoot), 'utf8'));
  const projectManifest = JSON.parse(await text('package.json'));
  assert.equal(manifest.devDependencies.hyperframes, '0.7.56');
  assert.equal(manifest.devDependencies.parse5, '8.0.1');
  assert.equal(manifest.devDependencies.acorn, '8.17.0');
  assert.equal(manifest.devDependencies['acorn-walk'], '8.3.5');
  assert.equal(manifest.devDependencies.gsap, '3.15.0');
  assert.equal(manifest.devDependencies['@fontsource-variable/literata'], '5.2.8');
  assert.equal(manifest.devDependencies['@fontsource-variable/geist'], '5.2.9');
  assert.equal(manifest.devDependencies['@fontsource-variable/geist-mono'], '5.2.8');
  assert.equal(manifest.scripts['check:hyperframes'], 'node scripts/check-hyperframes.mjs');
  assert.equal(manifest.scripts['map:hyperframes'], 'node scripts/map-hyperframes.mjs');
  assert.match(manifest.scripts.check, /check:hyperframes/);
  assert.equal(projectManifest.name, 'interestshield-hyperframes');
  assert.equal(projectManifest.scripts.check, 'npm --prefix .. run check:hyperframes');
  assert.doesNotMatch(JSON.stringify(projectManifest.scripts), /npx|--yes/);
});

test('ignores every generated HyperFrames workspace directory', async () => {
  const gitignore = await readFile(new URL('../../../.gitignore', import.meta.url), 'utf8');
  for (const directory of ['vendor', 'snapshots', 'output', '.hyperframes', '.thumbnails']) {
    assert.ok(gitignore.includes(`/apps/media/hyperframes/${directory}/`));
  }
});

test('keeps a runtime animation map synchronized with every composition source', async () => {
  const files = ['index.html', 'compositions/launch.html', 'compositions/money-loop-tutorial.html'];
  const digest = createHash('sha256');
  for (const file of files) {
    digest.update(file).update('\0').update((await text(file)).replace(/\r\n/g, '\n')).update('\0');
  }

  const map = JSON.parse(await text('evidence/animation-map.json'));
  assert.equal(map.version, 1);
  assert.equal(map.sourceDigest, digest.digest('hex'));
  assert.equal(map.composition.duration, 30);
  assert.equal(map.composition.fps, 30);
  assert.deepEqual(map.requiredTimelineIds, [
    'interestshield-launch',
    'interestshield-media-reel',
    'money-loop-tutorial',
  ]);
  assert.ok(map.totals.tweens >= 20);
  assert.equal(map.assertions.allTimelinesPaused, true);
  assert.equal(map.assertions.allTimelinesFinite, true);
  assert.equal(map.assertions.firstActionAtOrBeforeSeconds, true);
  for (const timeline of map.timelines) {
    for (const tween of timeline.tweens) {
      assert.equal(tween.repeat, 0);
      assert.equal(tween.yoyo, false);
    }
  }
});

test('derives a project DESIGN.md from identity version 1 before composition HTML', async () => {
  const design = await text('DESIGN.md');
  assert.ok(design.includes(`Identity contract version: \`${MEDIA_IDENTITY_VERSION}\``));
  for (const color of [
    ...Object.values(visualIdentity.palette.neutral),
    ...Object.values(visualIdentity.palette.semantic),
  ]) {
    assert.ok(design.includes(color));
  }
  for (const face of ['display', 'body', 'data']) {
    assert.ok(design.includes(visualIdentity.typography[face].family));
  }
  assert.ok(design.includes('## What NOT to Do'));
});

test('assembles a deterministic 30-second root reel from launch and tutorial compositions', async () => {
  const root = await text('index.html');
  assert.match(root, /data-composition-id="interestshield-media-reel"/);
  assert.match(root, /data-width="1920"/);
  assert.match(root, /data-height="1080"/);
  assert.match(root, /data-duration="30"/);
  assert.match(root, /data-composition-src="compositions\/launch.html"/);
  assert.match(root, /data-composition-src="compositions\/money-loop-tutorial.html"/);
  assert.match(root, /data-composition-id="interestshield-launch"[\s\S]*data-composition-src="compositions\/launch.html"/);
  assert.match(root, /data-composition-id="money-loop-tutorial"[\s\S]*data-composition-src="compositions\/money-loop-tutorial.html"/);
  assert.match(root, /window\.__timelines\["interestshield-media-reel"\] = tl/);
});

test('keeps Studio mutation IDs unique across transported templates', async () => {
  const ids = [];
  for (const file of ['compositions/launch.html', 'compositions/money-loop-tutorial.html']) {
    const composition = await text(file);
    ids.push(...[...composition.matchAll(/data-hf-id="([^"]+)"/g)].map((match) => match[1]));
  }
  assert.equal(new Set(ids).size, ids.length);
});

test('keeps both composition timelines synchronous, finite, captioned, and renderer neutral', async () => {
  for (const file of ['compositions/launch.html', 'compositions/money-loop-tutorial.html']) {
    const composition = await text(file);
    assert.match(composition, /<template id="[^"]+-template">/);
    assert.match(composition, new RegExp(`data-identity-version="${MEDIA_IDENTITY_VERSION}"`));
    assert.match(composition, /data-fps="30"/);
    assert.match(composition, /gsap\.timeline\(\{ paused: true \}\)/);
    assert.match(composition, /window\.__timelines\["[^"]+"\] = tl/);
    assert.match(composition, /class="scene-content"/);
    assert.match(composition, /class="caption-group"/);
    assert.match(composition, /clipPath/);
    assert.match(composition, /circle\(220% at/);
    assert.match(composition, /prefers-reduced-motion/);
    assert.match(composition, /\.scene-content,[^{]+\{ transform: none !important; \}/);
    const templateStart = composition.indexOf('<template');
    const templateEnd = composition.indexOf('</template>');
    const styleStart = composition.indexOf('<style>');
    const timelineScript = composition.indexOf('window.__timelines');
    assert.ok(templateStart >= 0 && templateEnd > templateStart);
    assert.ok(styleStart > templateStart && styleStart < templateEnd);
    assert.ok(timelineScript > templateStart && timelineScript < templateEnd);
    assert.doesNotMatch(composition.slice(0, templateStart), /<style>|window\.__timelines/);
    assert.doesNotMatch(composition, /Math\.random|Date\.now|repeat\s*:\s*-1|setTimeout|Promise/);
    assert.doesNotMatch(composition, /\.from\(/);
    assert.doesNotMatch(composition, /stagger\s*:/);
    assert.doesNotMatch(composition, /https?:\/\//);
    assert.doesNotMatch(composition, /<br\b/i);
    assert.doesNotMatch(
      composition,
      /font-family:[^;]+,\s*(?:serif|sans-serif|monospace)/,
    );

    for (const tag of composition.matchAll(/<[^>]+data-start="[^"]+"[^>]*>/g)) {
      assert.match(tag[0], /class="[^"]*\bclip\b[^"]*"/);
      assert.match(tag[0], /data-duration="[^"]+"/);
      assert.match(tag[0], /data-track-index="[^"]+"/);
    }
  }
});

test('stores non-overlapping plain-language caption cues within contract limits', async () => {
  for (const story of ['launch', 'money-loop-tutorial']) {
    const captions = JSON.parse(await text(`captions/${story}.json`));
    const composition = await text(`compositions/${story}.html`);
    const renderedTexts = [...composition.matchAll(/class="caption">([^<]+)<\/div>/g)]
      .map((match) => match[1].trim());
    const renderedStartsMs = [...composition.matchAll(
      /fromTo\("#[^"]+ \.caption"[\s\S]*?\},\s*([0-9.]+)\);/g,
    )].map((match) => Number(match[1]) * 1000);
    assert.ok(captions.length >= 3);
    assert.deepEqual(captions.map((caption) => caption.text), renderedTexts);
    assert.deepEqual(captions.map((caption) => caption.startMs), renderedStartsMs);
    let previousEndMs = 0;
    for (const caption of captions) {
      assert.equal(typeof caption.text, 'string');
      assert.ok(caption.text.length <= visualIdentity.accessibility.captions.maximumCharactersPerLine);
      assert.ok(caption.startMs >= previousEndMs);
      assert.ok(caption.endMs - caption.startMs >= visualIdentity.accessibility.captions.minimumVisibleMs);
      assert.equal(caption.timestampMs, null);
      assert.equal(caption.confidence, null);
      previousEndMs = caption.endMs;
    }
  }
});

test('keeps the average-balance relationship qualitative without decorative percentages', async () => {
  const tutorial = await text('compositions/money-loop-tutorial.html');
  assert.doesNotMatch(tutorial, /78%|54%/);
  assert.match(tutorial, /\.balance-fill \{[^}]*width: 100%/);
  assert.match(tutorial, /rate and daily balance method stay the same/);
});

test('keeps renderer packages isolated from calculator and Expo manifests after installation', async () => {
  for (const relativePath of visualIdentity.runtimeBoundary.protectedManifests) {
    const manifest = JSON.parse(await readFile(new URL(`../../${relativePath}`, mediaRoot), 'utf8'));
    const names = Object.keys({
      ...manifest.dependencies,
      ...manifest.devDependencies,
      ...manifest.optionalDependencies,
    });
    assert.equal(names.some((name) => /hyperframes|gsap|remotion/.test(name)), false);
  }
});
