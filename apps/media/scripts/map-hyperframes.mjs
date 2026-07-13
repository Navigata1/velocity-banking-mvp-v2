import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

import { parse as parseJavaScript } from 'acorn';
import { simple as walkJavaScript } from 'acorn-walk';
import { parse as parseHtml } from 'parse5';

const mediaRoot = new URL('../', import.meta.url);
const projectRoot = new URL('hyperframes/', mediaRoot);
const evidenceRoot = new URL('evidence/', projectRoot);
const sourceFiles = ['index.html', 'compositions/launch.html', 'compositions/money-loop-tutorial.html'];
const requiredTimelineIds = [
  'interestshield-launch',
  'interestshield-media-reel',
  'money-loop-tutorial',
];
const ignoredTweenProperties = new Set([
  'callbackScope', 'delay', 'duration', 'ease', 'immediateRender', 'onComplete',
  'onStart', 'onUpdate', 'overwrite', 'parent', 'repeat', 'runBackwards',
  'stagger', 'startAt', 'yoyo',
]);

function walkHtml(node, visit) {
  visit(node);
  for (const child of node.childNodes ?? []) walkHtml(child, visit);
  if (node.content) walkHtml(node.content, visit);
}

function attribute(node, name) {
  return node.attrs?.find((entry) => entry.name === name)?.value ?? null;
}

function literal(node) {
  if (node?.type === 'Literal') return node.value;
  if (node?.type === 'UnaryExpression' && node.operator === '-' && node.argument.type === 'Literal') {
    return -node.argument.value;
  }
  return null;
}

function objectProperties(node) {
  if (node?.type !== 'ObjectExpression') return new Map();
  return new Map(node.properties.flatMap((property) => {
    if (property.type !== 'Property') return [];
    const key = property.key.type === 'Identifier' ? property.key.name : literal(property.key);
    return typeof key === 'string' ? [[key, literal(property.value)]] : [];
  }));
}

function scriptText(node) {
  return (node.childNodes ?? [])
    .filter((child) => child.nodeName === '#text')
    .map((child) => child.value)
    .join('');
}

function parseTimeline(file, html) {
  const document = parseHtml(html);
  const scripts = [];
  const compositions = [];
  walkHtml(document, (node) => {
    const compositionId = attribute(node, 'data-composition-id');
    if (compositionId) compositions.push({
      id: compositionId,
      duration: Number(attribute(node, 'data-duration') ?? 0),
      width: Number(attribute(node, 'data-width') ?? 0),
      height: Number(attribute(node, 'data-height') ?? 0),
      fps: Number(attribute(node, 'data-fps') ?? 30),
    });
    if (node.tagName === 'script' && !attribute(node, 'src')) scripts.push(scriptText(node));
  });

  const timelineVariables = new Map();
  const registrations = new Map();
  const calls = [];

  for (const script of scripts) {
    const ast = parseJavaScript(script, { ecmaVersion: 'latest', sourceType: 'script' });
    walkJavaScript(ast, {
      VariableDeclarator(node) {
        const callee = node.init?.callee;
        if (node.id.type !== 'Identifier' || callee?.type !== 'MemberExpression') return;
        if (callee.object?.name !== 'gsap' || callee.property?.name !== 'timeline') return;
        timelineVariables.set(node.id.name, objectProperties(node.init.arguments[0]).get('paused') === true);
      },
      AssignmentExpression(node) {
        const left = node.left;
        if (left.type !== 'MemberExpression' || left.computed !== true) return;
        const registry = left.object;
        if (registry?.type !== 'MemberExpression' || registry.property?.name !== '__timelines') return;
        const timelineId = literal(left.property);
        if (typeof timelineId === 'string' && node.right.type === 'Identifier') {
          registrations.set(node.right.name, timelineId);
        }
      },
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== 'MemberExpression' || callee.object?.type !== 'Identifier') return;
        const variable = callee.object.name;
        const method = callee.property?.name;
        if (!timelineVariables.has(variable) || !['set', 'to', 'from', 'fromTo'].includes(method)) return;

        const target = literal(node.arguments[0]);
        const destinationIndex = method === 'fromTo' ? 2 : 1;
        const positionIndex = method === 'fromTo' ? 3 : 2;
        const destination = objectProperties(node.arguments[destinationIndex]);
        const start = Number(literal(node.arguments[positionIndex]) ?? 0);
        const duration = method === 'set' ? 0 : Number(destination.get('duration') ?? 0);
        const repeat = Number(destination.get('repeat') ?? 0);
        const yoyo = destination.get('yoyo') === true;
        const stagger = Number(destination.get('stagger') ?? 0);
        if (stagger !== 0) {
          throw new Error(`Staggered tween evidence is ambiguous for ${String(target)}; author explicit tween positions.`);
        }
        const cycles = repeat === -1 ? Number.POSITIVE_INFINITY : Math.max(1, repeat + 1);
        const properties = [...destination.keys()]
          .filter((property) => !ignoredTweenProperties.has(property))
          .sort();
        calls.push({
          variable,
          method,
          target: typeof target === 'string' ? target : '(dynamic target)',
          properties,
          start,
          end: Number((start + duration * cycles).toFixed(3)),
          duration,
          ease: destination.get('ease') ?? 'default',
          repeat,
          yoyo,
        });
      },
    });
  }

  const timelines = [...timelineVariables.entries()].map(([variable, paused]) => {
    const tweens = calls
      .filter((call) => call.variable === variable)
      .map(({ variable: _variable, ...call }) => call)
      .sort((left, right) => left.start - right.start || left.target.localeCompare(right.target));
    return {
      id: registrations.get(variable) ?? `(unregistered:${variable})`,
      file,
      paused,
      duration: Math.max(0, ...tweens.map((tween) => tween.end)),
      finite: tweens.every((tween) => (
        tween.repeat !== -1 && Number.isFinite(tween.start) && Number.isFinite(tween.end)
      )),
      tweens,
    };
  });

  return { timelines, compositions };
}

const digest = createHash('sha256');
const parsed = [];
for (const file of sourceFiles) {
  const html = await readFile(new URL(file, projectRoot), 'utf8');
  digest.update(file).update('\0').update(html).update('\0');
  parsed.push(parseTimeline(file, html));
}

const timelines = parsed.flatMap((entry) => entry.timelines)
  .sort((left, right) => left.id.localeCompare(right.id));
const timelineIds = timelines.map((timeline) => timeline.id);
const missingTimelineIds = requiredTimelineIds.filter((id) => !timelineIds.includes(id));
if (missingTimelineIds.length > 0) {
  throw new Error(`Missing authored timelines: ${missingTimelineIds.join(', ')}`);
}

const rootComposition = parsed[0].compositions.find(
  (composition) => composition.id === 'interestshield-media-reel',
);
if (!rootComposition || rootComposition.duration !== 30) {
  throw new Error('The root composition must be a 30-second InterestShield reel.');
}

const animatedTimelines = timelines.filter((timeline) => timeline.tweens.length > 0);
const firstActionSeconds = Math.min(
  ...animatedTimelines.flatMap((timeline) => timeline.tweens.map((tween) => tween.start)),
);
const map = {
  version: 1,
  sourceDigest: digest.digest('hex'),
  sourceMode: 'parse5-html-and-acorn-javascript-after-hyperframes-runtime-check',
  composition: {
    ...rootComposition,
    file: 'index.html',
  },
  requiredTimelineIds,
  timelines,
  totals: {
    timelines: timelines.length,
    animatedTimelines: animatedTimelines.length,
    tweens: timelines.reduce((total, timeline) => total + timeline.tweens.length, 0),
  },
  assertions: {
    allTimelinesPaused: timelines.every((timeline) => timeline.paused),
    allTimelinesFinite: timelines.every((timeline) => timeline.finite),
    firstActionSeconds,
    firstActionAtOrBeforeSeconds: firstActionSeconds <= 0.3,
    missingTimelineIds,
  },
};

await mkdir(evidenceRoot, { recursive: true });
await writeFile(new URL('animation-map.json', evidenceRoot), `${JSON.stringify(map, null, 2)}\n`);
console.log(`Mapped ${map.totals.tweens} tweens across ${map.totals.animatedTimelines} timelines.`);
