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

    if (request === 'expo-secure-store') {
      return {
        getItemAsync: async () => null,
        isAvailableAsync: async () => false,
        setItemAsync: async () => undefined,
      };
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
  assert.equal(mobilePackage.scripts['build:web'], 'expo export --platform web --output-dir dist-web --clear');
  assert.equal(mobilePackage.scripts['serve:web-export'], 'node scripts/serve-web-export.cjs');
  assert.ok(mobilePackage.scripts.check, 'expected a mobile type-check script');
  assert.ok(mobilePackage.dependencies.expo, 'expected Expo dependency');
  assert.ok(mobilePackage.dependencies['expo-router'], 'expected Expo Router dependency');
  assert.ok(mobilePackage.dependencies['expo-secure-store'], 'expected encrypted native key-value storage dependency');
  assert.equal(mobilePackage.dependencies['@interestshield/financial-engine'], 'file:../../packages/financial-engine');
});

test('mobile web export is configured for Vercel SPA hosting and repeatable smoke tests', () => {
  const vercelConfig = readJson('apps/mobile/vercel.json');
  const serveScript = fs.readFileSync(path.join(repoRoot, 'apps/mobile/scripts/serve-web-export.cjs'), 'utf8');

  assert.equal(vercelConfig.$schema, 'https://openapi.vercel.sh/vercel.json');
  assert.equal(vercelConfig.buildCommand, 'npm run build:web');
  assert.equal(vercelConfig.outputDirectory, 'dist-web');
  assert.deepEqual(vercelConfig.rewrites, [{ source: '/(.*)', destination: '/' }]);

  assert.ok(serveScript.includes('dist-web'), 'expected server to serve the Expo export directory');
  assert.ok(serveScript.includes('index.html'), 'expected server to fall back to index.html for direct routes');
  assert.ok(serveScript.includes('process.env.PORT'), 'expected configurable local smoke-test port');
  assert.ok(serveScript.includes('path.relative(root, requestedPath)'), 'expected path traversal protection');
  assert.ok(serveScript.includes('path.isAbsolute(relativePath)'), 'expected absolute escape protection');
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
  assert.ok(shellSource.includes("type MobileMode = 'dashboard' | 'simulator' | 'cockpit' | 'portfolio' | 'learn' | 'vault'"));
  assert.ok(shellSource.includes("handleModeChange('simulator')"));
  assert.ok(shellSource.includes("handleModeChange('cockpit')"));
  assert.ok(shellSource.includes("handleModeChange('portfolio')"));
  assert.ok(shellSource.includes('TextInput'), 'expected native editable assumption controls');
  assert.ok(shellSource.includes('accessibilityLabel="Monthly income"'));
  assert.ok(shellSource.includes('accessibilityLabel="Monthly expenses"'));
  assert.ok(shellSource.includes('accessibilityLabel="Line of credit limit"'));
  assert.ok(shellSource.includes('buildMobileCockpitSnapshot'));
  assert.ok(shellSource.includes('CockpitPanel'));
  assert.ok(shellSource.includes('buildMobileSimulatorSnapshot'));
  assert.ok(shellSource.includes('SimulatorStrategyPanel'));
  assert.ok(shellSource.includes('usePersistedMobileAssumptions'));
  assert.ok(shellSource.includes('StorageStatusCard'));
  assert.equal(typeof sharedEngine.buildMobileCockpitSnapshot, 'function');
  assert.equal(typeof sharedEngine.buildMobilePortfolioSnapshot, 'function');
  assert.equal(typeof sharedEngine.buildMobileSimulatorSnapshot, 'function');
  assert.ok(
    !fs.existsSync(path.join(repoRoot, 'apps/mobile/app/(tabs)/_layout.tsx')),
    'expected static-export shell not to rely on tab route hydration'
  );
});

test('Expo mobile app exposes direct route parity for every demo mode', () => {
  const layoutSource = fs.readFileSync(path.join(repoRoot, 'apps/mobile/app/_layout.tsx'), 'utf8');
  const shellSource = fs.readFileSync(path.join(repoRoot, 'apps/mobile/components/mobile-shell.tsx'), 'utf8');
  const routeExpectations = [
    ['index.tsx', 'dashboard', 'index', 'InterestShield'],
    ['simulator.tsx', 'simulator', 'simulator', 'Simulator'],
    ['cockpit.tsx', 'cockpit', 'cockpit', 'Cockpit'],
    ['portfolio.tsx', 'portfolio', 'portfolio', 'Portfolio'],
    ['learn.tsx', 'learn', 'learn', 'Learn'],
    ['vault.tsx', 'vault', 'vault', 'Vault'],
  ];

  assert.ok(shellSource.includes("import { useRouter } from 'expo-router'"));
  assert.ok(shellSource.includes("initialMode = 'dashboard'"));
  assert.ok(shellSource.includes('modeRoutes'));
  assert.ok(shellSource.includes('router.push(modeRoutes[nextMode])'));

  for (const [filename, mode, routeName, title] of routeExpectations) {
    const routeFile = path.join(repoRoot, 'apps/mobile/app', filename);
    assert.ok(fs.existsSync(routeFile), `expected direct Expo route file ${filename}`);
    const routeSource = fs.readFileSync(routeFile, 'utf8');
    assert.ok(
      routeSource.includes(`<MobileShell initialMode="${mode}" />`),
      `expected ${filename} to render MobileShell in ${mode} mode`
    );
    assert.ok(
      layoutSource.includes(`<Stack.Screen name="${routeName}" options={{ title: '${title}' }} />`),
      `expected layout to register ${routeName} with ${title} title`
    );
  }
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

test('shared mobile simulator snapshot matches current web single-debt strategy comparison', () => {
  const sharedEngine = loadTsFile(path.join(repoRoot, 'packages/financial-engine/src/index.ts'));
  const webEngine = loadTsFile(path.join(repoRoot, 'apps/web/src/engine/calculations.ts'));
  const input = {
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
  };
  const webInput = {
    monthlyIncome: input.monthlyIncome,
    monthlyExpenses: input.monthlyExpenses,
    carLoan: input.activeDebt,
    loc: input.loc,
    useVelocity: true,
    extraPayment: input.chunkAmount,
  };
  const snapshot = sharedEngine.buildMobileSimulatorSnapshot(input);
  const webStrategies = webEngine.compareSingleDebtStrategies(webInput);

  assert.equal(snapshot.strategies.length, 4);
  for (const webStrategy of webStrategies) {
    const mobileStrategy = snapshot.strategies.find((strategy) => strategy.name === webStrategy.name);
    assert.ok(mobileStrategy, `expected mobile strategy for ${webStrategy.name}`);
    assert.equal(mobileStrategy.months, webStrategy.months);
    assert.equal(mobileStrategy.totalInterest.toFixed(2), webStrategy.totalInterest.toFixed(2));
    assert.equal(mobileStrategy.isPayoffPossible, webStrategy.isPayoffPossible);
  }

  const velocity = snapshot.strategies.find((strategy) => strategy.name === 'Velocity');
  const fastestWebStrategy = webStrategies
    .filter((strategy) => strategy.isPayoffPossible)
    .sort((a, b) => a.months - b.months || a.totalInterest - b.totalInterest)[0];
  assert.equal(snapshot.guardrail, null);
  assert.equal(snapshot.velocity.months, velocity.months);
  assert.equal(snapshot.velocity.interestSavedLabel.startsWith('Saves $'), true);
  assert.equal(snapshot.velocity.monthsSavedLabel.endsWith('faster'), true);
  assert.equal(snapshot.fastestStrategyName, fastestWebStrategy.name);
});

test('shared mobile simulator snapshot suppresses velocity payoff claims when cash flow is invalid', () => {
  const sharedEngine = loadTsFile(path.join(repoRoot, 'packages/financial-engine/src/index.ts'));
  const snapshot = sharedEngine.buildMobileSimulatorSnapshot({
    monthlyIncome: 4000,
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
  const velocity = snapshot.strategies.find((strategy) => strategy.name === 'Velocity');

  assert.equal(snapshot.guardrail, 'Income needs to exceed expenses before velocity payoff claims are projected.');
  assert.equal(snapshot.velocity.interestSavedLabel, 'Not projected');
  assert.equal(snapshot.velocity.monthsSavedLabel, 'Review inputs');
  assert.equal(velocity.isPayoffPossible, false);
  assert.equal(velocity.monthsLabel, 'Review inputs');
  assert.equal(velocity.interestLabel, 'Not projected');
  assert.equal(velocity.statusLabel, 'Needs positive cash flow');
});

test('mobile assumptions persist through encrypted native storage with a web fallback', () => {
  const storageSource = fs.readFileSync(
    path.join(repoRoot, 'apps/mobile/lib/mobile-assumption-storage.ts'),
    'utf8'
  );
  const hookSource = fs.readFileSync(
    path.join(repoRoot, 'apps/mobile/hooks/use-persisted-mobile-assumptions.ts'),
    'utf8'
  );

  assert.ok(storageSource.includes("from 'expo-secure-store'"), 'expected SecureStore import');
  assert.ok(!storageSource.includes('AsyncStorage'), 'expected no AsyncStorage usage');
  assert.ok(storageSource.includes('MOBILE_ASSUMPTIONS_STORAGE_KEY'));
  assert.ok(storageSource.includes('secure-store'));
  assert.ok(storageSource.includes('local-storage'));
  assert.ok(storageSource.includes('decodeMobileAssumptions'));
  assert.ok(hookSource.includes('useEffect'));
  assert.ok(hookSource.includes('loadMobileAssumptions'));
  assert.ok(hookSource.includes('saveMobileAssumptions'));

  const storageModule = loadTsFile(path.join(repoRoot, 'apps/mobile/lib/mobile-assumption-storage.ts'));
  const encoded = storageModule.encodeMobileAssumptions({
    monthlyIncome: 8123,
    monthlyExpenses: 4321,
    chunkAmount: 987,
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
  const decoded = storageModule.decodeMobileAssumptions(encoded);

  assert.equal(storageModule.MOBILE_ASSUMPTIONS_STORAGE_KEY, 'interestshield.mobile.assumptions.v1');
  assert.equal(decoded.monthlyIncome, 8123);
  assert.equal(decoded.monthlyExpenses, 4321);
  assert.equal(decoded.chunkAmount, 987);
  assert.equal(storageModule.decodeMobileAssumptions('{bad json'), null);
  assert.equal(storageModule.decodeMobileAssumptions(JSON.stringify({ version: 1, input: { monthlyIncome: -1 } })), null);
});

test('shared mobile cockpit snapshot exposes the core demo instruments and guardrails', () => {
  const sharedEngine = loadTsFile(path.join(repoRoot, 'packages/financial-engine/src/index.ts'));
  const snapshot = sharedEngine.buildMobileCockpitSnapshot({
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

  assert.equal(snapshot.flightStatusLabel, 'Ready to model');
  assert.equal(snapshot.warning, null);
  assert.equal(snapshot.instruments.length, 4);
  assert.equal(
    snapshot.instruments.map((instrument) => instrument.label).join('|'),
    'Airspeed|Fuel Burn|Heading|ETA'
  );
  assert.equal(snapshot.instruments.find((instrument) => instrument.label === 'Airspeed').value, '$3,500/mo');
  assert.equal(snapshot.instruments.find((instrument) => instrument.label === 'Fuel Burn').value, '$4/day');
  assert.equal(snapshot.instruments.find((instrument) => instrument.label === 'Heading').value, 'Auto Loan');
  assert.equal(snapshot.instruments.find((instrument) => instrument.label === 'ETA').value, '10 mo');
  assert.equal(
    snapshot.flightChecks.map((check) => check.label).join('|'),
    'Positive cash flow|LOC capacity loaded|Utilization under 80%|Payoff claims labeled'
  );
  assert.equal(snapshot.flightChecks.every((check) => check.passed), true);
});

test('shared mobile cockpit snapshot stays in review mode when cash flow or LOC setup is unsafe', () => {
  const sharedEngine = loadTsFile(path.join(repoRoot, 'packages/financial-engine/src/index.ts'));
  const snapshot = sharedEngine.buildMobileCockpitSnapshot({
    monthlyIncome: 4000,
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
      limit: 0,
      apr: 0.085,
      balance: 3200,
    },
  });

  assert.equal(snapshot.flightStatusLabel, 'Review inputs');
  assert.ok(snapshot.warning.includes('Income needs to exceed expenses'));
  assert.equal(snapshot.instruments.find((instrument) => instrument.label === 'Airspeed').status, 'danger');
  assert.equal(snapshot.instruments.find((instrument) => instrument.label === 'ETA').value, 'Review inputs');
  assert.equal(snapshot.flightChecks.find((check) => check.label === 'Positive cash flow').passed, false);
  assert.equal(snapshot.flightChecks.find((check) => check.label === 'LOC capacity loaded').passed, false);
});

if (process.exitCode) {
  console.error('Mobile port contract failed.');
  process.exit(process.exitCode);
}

console.log('Mobile port contract passed.');
