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
  assert.equal(
    mobilePackage.scripts['build:android:preview'],
    'npx eas-cli@latest build --platform android --profile preview'
  );
  assert.equal(
    mobilePackage.scripts['build:ios:preview'],
    'npx eas-cli@latest build --platform ios --profile preview'
  );
  assert.equal(mobilePackage.scripts['build:native:production'], 'npx eas-cli@latest build --profile production');
  assert.ok(mobilePackage.scripts.check, 'expected a mobile type-check script');
  assert.ok(mobilePackage.dependencies.expo, 'expected Expo dependency');
  assert.ok(mobilePackage.dependencies['expo-router'], 'expected Expo Router dependency');
  assert.ok(mobilePackage.dependencies['expo-secure-store'], 'expected encrypted native key-value storage dependency');
  assert.equal(mobilePackage.dependencies['@interestshield/financial-engine'], 'file:../../packages/financial-engine');
});

test('mobile native release config is explicit for Android and iOS builds', () => {
  const appConfig = readJson('apps/mobile/app.json');
  const easConfig = readJson('apps/mobile/eas.json');

  assert.equal(appConfig.expo.icon, './assets/icon.png');
  assert.deepEqual(appConfig.expo.runtimeVersion, { policy: 'appVersion' });
  assert.equal(appConfig.expo.ios.bundleIdentifier, 'com.islanddevcrew.interestshield');
  assert.equal(appConfig.expo.ios.buildNumber, '1');
  assert.equal(appConfig.expo.ios.infoPlist.ITSAppUsesNonExemptEncryption, false);
  assert.equal(appConfig.expo.android.package, 'com.islanddevcrew.interestshield');
  assert.equal(appConfig.expo.android.versionCode, 1);
  assert.equal(appConfig.expo.android.adaptiveIcon.foregroundImage, './assets/adaptive-icon.png');
  assert.equal(appConfig.expo.android.adaptiveIcon.backgroundColor, '#0f172a');
  assert.ok(fs.existsSync(path.join(repoRoot, 'apps/mobile/assets/icon.png')), 'expected native app icon asset');
  assert.ok(
    fs.existsSync(path.join(repoRoot, 'apps/mobile/assets/adaptive-icon.png')),
    'expected Android adaptive icon foreground asset'
  );

  assert.equal(easConfig.$schema, 'https://json.schemastore.org/eas.json');
  assert.equal(easConfig.cli.version, '>= 16.0.1');
  assert.equal(easConfig.cli.appVersionSource, 'local');
  assert.deepEqual(easConfig.build.development, {
    developmentClient: true,
    distribution: 'internal',
  });
  assert.deepEqual(easConfig.build.preview.android, { buildType: 'apk' });
  assert.deepEqual(easConfig.build.preview.ios, { simulator: true });
  assert.deepEqual(easConfig.build.production.android, { buildType: 'app-bundle' });
  assert.equal(easConfig.build.production.autoIncrement, true);
  assert.equal(easConfig.build.production.ios.resourceClass, 'm-medium');
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

test('shared mobile dashboard snapshot keeps the required four vitals aligned with web', () => {
  const sharedEngine = loadTsFile(path.join(repoRoot, 'packages/financial-engine/src/index.ts'));
  const stableSnapshot = sharedEngine.buildMobileDashboardSnapshot({
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
  const unsafeSnapshot = sharedEngine.buildMobileDashboardSnapshot({
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

  assert.equal(
    stableSnapshot.vitals.map((vital) => vital.label).join('|'),
    'Cash Flow|Interest Burn|Debt-Free ETA|Next Move'
  );
  assert.equal(stableSnapshot.vitals.length, 4);
  assert.equal(stableSnapshot.vitals.find((vital) => vital.label === 'Debt-Free ETA').value, '10 mo');
  assert.equal(unsafeSnapshot.vitals.find((vital) => vital.label === 'Debt-Free ETA').value, 'Stabilize first');
  assert.equal(unsafeSnapshot.nextMove, 'Restore positive cash flow');
  assert.ok(!stableSnapshot.vitals.some((vital) => vital.label === 'LOC Room'));
});

test('shared mobile default assumptions start with the verified web demo Money Loop', () => {
  const sharedEngine = loadTsFile(path.join(repoRoot, 'packages/financial-engine/src/index.ts'));
  const webStoreSource = fs.readFileSync(path.join(repoRoot, 'apps/web/src/stores/financial-store.ts'), 'utf8');
  const defaultInput = sharedEngine.defaultMobileDashboardInput;
  const dashboard = sharedEngine.buildMobileDashboardSnapshot();
  const simulator = sharedEngine.buildMobileSimulatorSnapshot();
  const cockpit = sharedEngine.buildMobileCockpitSnapshot();
  const vault = sharedEngine.buildMobileVaultSnapshot();

  assert.equal(defaultInput.monthlyIncome, 6500);
  assert.equal(defaultInput.monthlyExpenses, 5000);
  assert.equal(defaultInput.chunkAmount, 1000);
  assert.equal(defaultInput.activeDebt.termMonths, 48);
  assert.equal(defaultInput.loc.limit, 25000);
  assert.equal(defaultInput.loc.balance, 3200);
  assert.equal(defaultInput.loc.apr, 0.085);
  assert.ok(webStoreSource.includes('monthlyIncome: 6500'));
  assert.ok(webStoreSource.includes('monthlyExpenses: 5000'));
  assert.ok(webStoreSource.includes('limit: 25000'));
  assert.ok(webStoreSource.includes('chunkAmount: 1000'));

  assert.equal(dashboard.warning, null);
  assert.equal(dashboard.nextMove, 'Send $1,000 to principal');
  assert.equal(dashboard.vitals.find((vital) => vital.label === 'Debt-Free ETA').value.endsWith('mo'), true);
  assert.notEqual(dashboard.vitals.find((vital) => vital.label === 'Debt-Free ETA').value, 'Review inputs');
  assert.equal(simulator.guardrail, null);
  assert.equal(simulator.velocity.months > 0, true);
  assert.equal(cockpit.flightStatusLabel, 'Ready to model');
  assert.equal(cockpit.warning, null);
  assert.equal(vault.guardrail, null);
  assert.equal(vault.freedomPathLabel.endsWith('mo'), true);
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
  assert.ok(shellSource.includes('accessibilityLabel="Active debt name"'));
  assert.ok(shellSource.includes('accessibilityLabel="Monthly income"'));
  assert.ok(shellSource.includes('accessibilityLabel="Monthly expenses"'));
  assert.ok(shellSource.includes('accessibilityLabel="Line of credit limit"'));
  assert.ok(shellSource.includes('accessibilityLabel="Line of credit balance"'));
  assert.ok(shellSource.includes('accessibilityLabel="Line of credit APR"'));
  assert.ok(shellSource.includes('accessibilityLabel="Active debt balance"'));
  assert.ok(shellSource.includes('accessibilityLabel="Active debt APR"'));
  assert.ok(shellSource.includes('accessibilityLabel="Active debt monthly payment"'));
  assert.ok(shellSource.includes('accessibilityLabel="Active debt term months"'));
  assert.ok(shellSource.includes('Math.round(value * 10000) / 100'), 'expected LOC APR input to preserve two decimal display precision');
  assert.ok(shellSource.includes('buildMobileCockpitSnapshot'));
  assert.ok(shellSource.includes('CockpitPanel'));
  assert.ok(shellSource.includes('buildMobileSimulatorSnapshot'));
  assert.ok(shellSource.includes('SimulatorStrategyPanel'));
  assert.ok(shellSource.includes('buildMobileVaultSnapshot'));
  assert.ok(!shellSource.includes('until scenarios are editable'));
  assert.ok(shellSource.includes('usePersistedMobileAssumptions'));
  assert.ok(shellSource.includes('StorageStatusCard'));
  assert.equal(typeof sharedEngine.buildMobileCockpitSnapshot, 'function');
  assert.equal(typeof sharedEngine.buildMobilePortfolioSnapshot, 'function');
  assert.equal(typeof sharedEngine.buildMobileSimulatorSnapshot, 'function');
  assert.equal(typeof sharedEngine.buildMobileVaultSnapshot, 'function');
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

test('shared mobile snapshots distinguish LOC over limit from high utilization', () => {
  const sharedEngine = loadTsFile(path.join(repoRoot, 'packages/financial-engine/src/index.ts'));
  const overLimitInput = {
    ...sharedEngine.defaultMobileDashboardInput,
    loc: {
      limit: 10000,
      apr: 0.085,
      balance: 10500,
    },
  };
  const dashboard = sharedEngine.buildMobileDashboardSnapshot(overLimitInput);
  const portfolio = sharedEngine.buildMobilePortfolioSnapshot(overLimitInput);
  const simulator = sharedEngine.buildMobileSimulatorSnapshot(overLimitInput);
  const cockpit = sharedEngine.buildMobileCockpitSnapshot(overLimitInput);
  const velocity = simulator.strategies.find((strategy) => strategy.name === 'Velocity');
  const overLimitWarning = 'LOC balance is above the available limit. Pay the LOC down before modeling velocity chunks.';

  assert.equal(dashboard.warning, overLimitWarning);
  assert.equal(dashboard.nextMove, 'Pay down the LOC');
  assert.equal(portfolio.guardrail, overLimitWarning);
  assert.equal(simulator.guardrail, overLimitWarning);
  assert.equal(simulator.velocity.months, 0);
  assert.equal(velocity.statusLabel, 'LOC over limit');
  assert.equal(cockpit.warning, overLimitWarning);
  assert.equal(cockpit.flightStatusLabel, 'Review inputs');
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

test('mobile storage migrates only the legacy standalone demo default', () => {
  const storageModule = loadTsFile(path.join(repoRoot, 'apps/mobile/lib/mobile-assumption-storage.ts'));

  const legacyDefault = {
    monthlyIncome: 7000,
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
  };

  const migrated = storageModule.decodeMobileAssumptions(JSON.stringify({
    version: 1,
    savedAt: '2026-06-15T00:00:00.000Z',
    input: legacyDefault,
  }));
  const customZeroLimit = storageModule.decodeMobileAssumptions(JSON.stringify({
    version: 1,
    savedAt: '2026-06-15T00:00:00.000Z',
    input: {
      ...legacyDefault,
      monthlyIncome: 6400,
    },
  }));

  assert.equal(migrated.monthlyIncome, 6500);
  assert.equal(migrated.monthlyExpenses, 5000);
  assert.equal(migrated.chunkAmount, 1000);
  assert.equal(migrated.activeDebt.termMonths, 48);
  assert.equal(migrated.loc.limit, 25000);
  assert.equal(customZeroLimit.monthlyIncome, 6400);
  assert.equal(customZeroLimit.loc.limit, 0);
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

test('shared mobile vault snapshot turns the active debt model into an outcome path', () => {
  const sharedEngine = loadTsFile(path.join(repoRoot, 'packages/financial-engine/src/index.ts'));
  const vault = sharedEngine.buildMobileVaultSnapshot({
    monthlyIncome: 6500,
    monthlyExpenses: 5000,
    chunkAmount: 1000,
    activeDebtName: 'Credit Card',
    activeDebt: {
      balance: 12000,
      apr: 0.1875,
      monthlyPayment: 425,
      termMonths: 48,
    },
    loc: {
      limit: 25000,
      apr: 0.085,
      balance: 3200,
    },
  });

  assert.equal(vault.guardrail, null);
  assert.ok(vault.freedomPathLabel.endsWith('mo'));
  assert.ok(vault.interestFreedLabel.startsWith('Saves $'));
  assert.equal(vault.stages.length, 3);
  assert.equal(vault.stages[1].title, 'Debt Freedom');
  assert.ok(vault.stages[1].detail.includes('Credit Card'));
  assert.ok(
    vault.stages.every((stage) => !stage.detail.includes('until scenarios are editable')),
    'expected mobile Vault to render modeled outcomes instead of placeholder copy'
  );

  const unsafeVault = sharedEngine.buildMobileVaultSnapshot({
    monthlyIncome: 4000,
    monthlyExpenses: 5000,
    chunkAmount: 1000,
    activeDebtName: 'Credit Card',
    activeDebt: {
      balance: 12000,
      apr: 0.1875,
      monthlyPayment: 425,
      termMonths: 48,
    },
    loc: {
      limit: 25000,
      apr: 0.085,
      balance: 3200,
    },
  });

  assert.equal(unsafeVault.freedomPathLabel, 'Review inputs');
  assert.equal(unsafeVault.interestFreedLabel, 'Not projected');
  assert.ok(unsafeVault.guardrail.includes('Income needs to exceed expenses'));
});

if (process.exitCode) {
  console.error('Mobile port contract failed.');
  process.exit(process.exitCode);
}

console.log('Mobile port contract passed.');
