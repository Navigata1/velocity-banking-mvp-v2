/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require('node:fs');
const path = require('node:path');
const { collectReachableSources, readReachableSource } = require('./source-contract-helpers.cjs');

const appRoot = path.resolve(__dirname, '..');

const routeContracts = [
  { route: '/', label: 'Dashboard', file: 'src/app/page.tsx', markers: ['Money Loop Dashboard', 'Dashboard vitals'] },
  { route: '/simulator', label: 'Simulator', file: 'src/app/simulator/page.tsx', markers: ['What-If Simulator', 'Money Loop Timeline'] },
  { route: '/cockpit', label: 'Cockpit', file: 'src/app/cockpit/page.tsx', markers: ['Cockpit Mode', 'Flight Controls'] },
  { route: '/portfolio', label: 'Portfolio', file: 'src/app/portfolio/page.tsx', markers: ['Portfolio', 'Your Debts'] },
  { route: '/learn', label: 'Learn', file: 'src/app/learn/page.tsx', markers: ['Learn Center', 'Glossary'] },
  { route: '/settings', label: 'Settings', file: 'src/app/settings/page.tsx', markers: ['Settings', 'Backend status'] },
  { route: '/vault', label: 'Vault', file: 'src/app/vault/page.tsx', markers: ['Wealth Transfer Timeline', 'Go to ${stepTitles[i].title}'] },
];

const scannedFiles = [
  'src/app/layout.tsx',
  'src/components/Navigation.tsx',
  'src/components/DomainTabs.tsx',
  'src/components/IntroModal.tsx',
  'src/components/PreAppPreview.tsx',
  'src/components/MoneyLoopArtifactRail.tsx',
  'src/components/DualSlider.tsx',
  ...routeContracts.map((contract) => contract.file),
];

const allowedClickableTags = new Set(['a', 'button', 'input', 'label', 'Link', 'select', 'summary', 'textarea']);
let failures = 0;

function read(relativePath) {
  return fs.readFileSync(path.join(appRoot, relativePath), 'utf8');
}

function readRoute(relativePath) {
  return readReachableSource(path.join(appRoot, relativePath));
}

function fail(message) {
  failures += 1;
  console.error(`FAIL ${message}`);
}

function pass(message) {
  console.log(`PASS ${message}`);
}

function assertIncludes(relativePath, source, needle, message) {
  if (!source.includes(needle)) {
    fail(`${relativePath}: ${message}`);
    return;
  }

  pass(`${relativePath}: ${message}`);
}

function isAllowedClickableTag(tag) {
  return allowedClickableTags.has(tag) || tag.endsWith('.button') || tag.endsWith('.a');
}

function collectOpeningTags(source) {
  const lines = source.split(/\r?\n/);
  const tags = [];
  const startPattern = /<([A-Za-z][\w.]*)\b/;

  for (let index = 0; index < lines.length; index += 1) {
    const start = lines[index].match(startPattern);
    if (!start || lines[index].includes('</')) continue;

    const collected = [lines[index]];
    let end = index;

    while (
      end + 1 < lines.length &&
      !(lines[end].trimEnd().endsWith('>') && !lines[end].includes('=>'))
    ) {
      end += 1;
      collected.push(lines[end]);
    }

    tags.push({
      line: index + 1,
      source: collected.join('\n'),
      tag: start[1],
    });
  }

  return tags;
}

function scanNonInteractiveClickTargets(relativePath, source) {
  for (const { line, source: tagSource, tag } of collectOpeningTags(source)) {
    if (!/\bonClick\s*=/.test(tagSource)) continue;
    if (isAllowedClickableTag(tag)) continue;

    fail(`${relativePath}:${line} uses onClick on <${tag}> instead of a native control`);
  }
}

function scanUnnamedFormControls(relativePath, source) {
  for (const { line, source: tagSource, tag } of collectOpeningTags(source)) {
    if (!['input', 'select', 'textarea'].includes(tag)) continue;
    if (/type\s*=\s*["']hidden["']/.test(tagSource)) continue;
    if (/\b(aria-label|aria-labelledby|title)\s*=/.test(tagSource)) continue;

    fail(`${relativePath}:${line} <${tag}> is missing an accessible name`);
  }
}

function runShellContract() {
  const layout = read('src/app/layout.tsx');
  const navigation = read('src/components/Navigation.tsx');
  const domainTabs = read('src/components/DomainTabs.tsx');

  assertIncludes('src/app/layout.tsx', layout, 'href="#main-content"', 'skip link targets main content');
  assertIncludes('src/app/layout.tsx', layout, 'id="main-content"', 'main content exposes a skip-link target');
  assertIncludes('src/app/layout.tsx', layout, 'tabIndex={-1}', 'main content can receive programmatic focus');
  assertIncludes('src/app/layout.tsx', layout, 'Educational tool. Not financial advice.', 'mobile shell exposes the required educational footer copy');
  assertIncludes('src/components/Navigation.tsx', navigation, 'aria-label="Primary navigation"', 'primary navigation has a landmark label');
  assertIncludes('src/components/Navigation.tsx', navigation, 'data-testid="primary-navigation"', 'primary navigation keeps the production freshness marker');
  assertIncludes('src/components/Navigation.tsx', navigation, 'aria-current={pathname === item.href ? \'page\' : undefined}', 'active route is announced');
  assertIncludes('src/components/Navigation.tsx', navigation, 'role="dialog"', 'Guardian chat opens as a dialog');
  assertIncludes('src/components/Navigation.tsx', navigation, 'aria-labelledby="velocity-guardian-title"', 'Guardian dialog is labelled');
  assertIncludes('src/components/Navigation.tsx', navigation, 'aria-label="Ask Velocity Guardian a question"', 'Guardian chat input is named');
  assertIncludes('src/components/Navigation.tsx', navigation, 'aria-label="Close Velocity Guardian"', 'Guardian close button is named');
  assertIncludes('src/components/DomainTabs.tsx', domainTabs, 'role="tablist"', 'domain controls expose a grouped navigation control');
  assertIncludes('src/components/DomainTabs.tsx', domainTabs, 'role="tab"', 'domain controls expose tab semantics');
  assertIncludes('src/components/DomainTabs.tsx', domainTabs, 'aria-selected={isActive}', 'domain controls expose selected state');
  assertIncludes('src/components/DomainTabs.tsx', domainTabs, 'aria-expanded={isActive ? hasDropdown : undefined}', 'domain dropdown state is announced');
}

function runRouteContract() {
  const smokeRoutes = read('scripts/smoke-routes.cjs');

  for (const contract of routeContracts) {
    const source = readRoute(contract.file);
    assertIncludes('scripts/smoke-routes.cjs', smokeRoutes, `['${contract.route}', '${contract.label}'`, `${contract.label} is covered by built-route smoke`);

    for (const marker of contract.markers) {
      assertIncludes(contract.file, source, marker, `${contract.label} exposes keyboard-smoke marker "${marker}"`);
    }
  }
}

function runFocusedControlContract() {
  const portfolio = readRoute('src/app/portfolio/page.tsx');
  const vault = read('src/app/vault/page.tsx');

  assertIncludes('src/app/portfolio/page.tsx', portfolio, 'role="dialog"', 'add-debt modal is a dialog');
  assertIncludes('src/app/portfolio/page.tsx', portfolio, 'aria-labelledby="portfolio-add-debt-title"', 'add-debt modal is labelled');
  assertIncludes('src/app/portfolio/page.tsx', portfolio, 'aria-label={ariaLabel}', 'debt table selects are named through shared helpers');
  assertIncludes('src/app/portfolio/page.tsx', portfolio, 'ariaLabel="Portfolio primary target share"', 'split allocation editor is named');
  assertIncludes('src/app/vault/page.tsx', vault, 'aria-current={i === step ? \'step\' : undefined}', 'Vault stepper announces the current step');
  assertIncludes('src/app/vault/page.tsx', vault, 'aria-label={`Go to ${stepTitles[i].title}`}', 'Vault stepper buttons are named');
}

function runStaticScans() {
  const files = new Map();
  for (const relativePath of scannedFiles) {
    for (const [filename, source] of collectReachableSources(path.join(appRoot, relativePath))) {
      files.set(filename, source);
    }
  }

  for (const [filename, source] of files) {
    const relativePath = path.relative(appRoot, filename).replaceAll('\\', '/');
    scanNonInteractiveClickTargets(relativePath, source);
    scanUnnamedFormControls(relativePath, source);
  }
}

runShellContract();
runRouteContract();
runFocusedControlContract();
runStaticScans();

if (failures > 0) {
  console.error(`${failures} accessibility route contract failure${failures === 1 ? '' : 's'}.`);
  process.exit(1);
}

console.log('Accessibility route contract passed.');
