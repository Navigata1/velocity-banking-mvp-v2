const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const repoRoot = path.resolve(__dirname, '..');
const moduleCache = new Map();
const ts = require(path.join(repoRoot, 'apps/web/node_modules/typescript'));

function loadTsFile(filename) {
  if (moduleCache.has(filename)) return moduleCache.get(filename).exports;

  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;

  const testModule = { exports: {} };
  moduleCache.set(filename, testModule);

  const localRequire = (request) => {
    if (request.startsWith('.')) {
      const resolvedBase = path.resolve(path.dirname(filename), request);
      const candidates = [
        resolvedBase,
        `${resolvedBase}.ts`,
        `${resolvedBase}.tsx`,
        `${resolvedBase}.js`,
        path.join(resolvedBase, 'index.ts'),
      ];
      const resolved = candidates.find((candidate) => fs.existsSync(candidate));
      if (resolved?.endsWith('.ts') || resolved?.endsWith('.tsx')) {
        return loadTsFile(resolved);
      }
      if (resolved) return require(resolved);
    }

    if (request === '@interestshield/financial-engine') {
      return loadTsFile(path.join(repoRoot, 'packages/financial-engine/src/index.ts'));
    }

    return require(request);
  };

  const script = new vm.Script(output, { filename });
  const context = vm.createContext({
    console,
    exports: testModule.exports,
    module: testModule,
    require: localRequire,
    __dirname: path.dirname(filename),
    __filename: filename,
  });

  script.runInContext(context);
  return testModule.exports;
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'));
}

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

test('mobile app declares an Expo Router shell and shared engine dependency', () => {
  const mobilePackage = readJson('apps/mobile/package.json');

  assert.equal(mobilePackage.scripts.start, 'expo start');
  assert.equal(mobilePackage.scripts.ios, 'expo start --ios');
  assert.equal(mobilePackage.scripts.android, 'expo start --android');
  assert.equal(mobilePackage.scripts.web, 'expo start --web');
  assert.ok(mobilePackage.scripts.check, 'expected a mobile type-check script');
  assert.ok(mobilePackage.dependencies.expo, 'expected Expo dependency');
  assert.ok(mobilePackage.dependencies['expo-router'], 'expected Expo Router dependency');
  assert.equal(mobilePackage.dependencies['@interestshield/financial-engine'], 'file:../../packages/financial-engine');
});

test('shared financial engine matches current web engine on core fixtures', () => {
  const sharedEngine = loadTsFile(path.join(repoRoot, 'packages/financial-engine/src/index.ts'));
  const webEngine = loadTsFile(path.join(repoRoot, 'apps/web/src/engine/calculations.ts'));

  assert.equal(sharedEngine.calculateCashFlow(8000, 4500), webEngine.calculateCashFlow(8000, 4500));
  assert.equal(
    sharedEngine.calculateAmortizationPayment(300000, 0.065, 360).toFixed(2),
    webEngine.calculateAmortizationPayment(300000, 0.065, 360).toFixed(2)
  );
  assert.equal(
    sharedEngine.calculateADBInterest(3200, 0.085, 7000, 4500).toFixed(2),
    webEngine.calculateADBInterest(3200, 0.085, 7000, 4500).toFixed(2)
  );
  assert.equal(sharedEngine.formatCurrency(3500), webEngine.formatCurrency(3500));
});

test('Expo app uses a shared-engine native shell instead of local math or broken static tabs', () => {
  const routeSource = fs.readFileSync(path.join(repoRoot, 'apps/mobile/app/index.tsx'), 'utf8');
  const shellSource = fs.readFileSync(path.join(repoRoot, 'apps/mobile/components/mobile-shell.tsx'), 'utf8');
  const sharedEngine = loadTsFile(path.join(repoRoot, 'packages/financial-engine/src/index.ts'));

  assert.ok(routeSource.includes("from '@/components/mobile-shell'"), 'expected route to delegate UI to a component');

  assert.ok(
    shellSource.includes("@interestshield/financial-engine"),
    'expected mobile shell to import the shared financial engine package'
  );
  assert.ok(
    shellSource.includes('buildMobileDashboardSnapshot'),
    'expected mobile shell to render the shared dashboard snapshot'
  );
  assert.ok(!shellSource.includes('8000 - 4500'), 'expected dashboard not to inline cash-flow arithmetic');
  assert.ok(shellSource.includes("type MobileMode = 'dashboard' | 'simulator' | 'portfolio' | 'learn' | 'vault'"));
  assert.ok(shellSource.includes("setMode('simulator')"));
  assert.ok(shellSource.includes("setMode('portfolio')"));
  assert.ok(shellSource.includes('TextInput'), 'expected native editable assumption controls');
  assert.ok(shellSource.includes('accessibilityLabel="Monthly income"'));
  assert.ok(shellSource.includes('accessibilityLabel="Monthly expenses"'));
  assert.ok(shellSource.includes('accessibilityLabel="Line of credit limit"'));
  assert.equal(typeof sharedEngine.buildMobilePortfolioSnapshot, 'function');
  assert.ok(
    !fs.existsSync(path.join(repoRoot, 'apps/mobile/app/(tabs)/_layout.tsx')),
    'expected static-export shell not to rely on tab route hydration'
  );
});

test('shared mobile portfolio snapshot explains cash-flow coverage and debt priority', () => {
  const sharedEngine = loadTsFile(path.join(repoRoot, 'packages/financial-engine/src/index.ts'));
  const snapshot = sharedEngine.buildMobilePortfolioSnapshot({
    monthlyIncome: 8000,
    monthlyExpenses: 4500,
    chunkAmount: 1500,
    activeDebtName: 'Auto Loan',
    activeDebt: {
      balance: 18450,
      apr: 0.069,
      monthlyPayment: 425,
      termMonths: 60,
    },
    loc: {
      limit: 25000,
      apr: 0.085,
      balance: 3200,
    },
  });

  assert.equal(snapshot.totalDebtLabel, '$18,450');
  assert.equal(snapshot.cashFlowAfterMinimums, 3075);
  assert.equal(snapshot.cashFlowAfterMinimumsLabel, '$3,075');
  assert.equal(snapshot.priorities[0].name, 'Auto Loan');
  assert.ok(snapshot.priorities[0].reason.includes('daily interest burn'));
  assert.equal(snapshot.guardrail, null);
});

if (process.exitCode) {
  console.error('Mobile port contract failed.');
  process.exit(process.exitCode);
}

console.log('Mobile port contract passed.');
