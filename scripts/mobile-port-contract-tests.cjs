const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { readReachableSource } = require('./source-contract-helpers.cjs');

const repoRoot = path.resolve(__dirname, '..');
const moduleCache = new Map();
const ts = require(path.join(repoRoot, 'apps/web/node_modules/typescript'));
const mobileRouteEntries = [
  'dashboard-route.tsx',
  'simulator-route.tsx',
  'cockpit-route.tsx',
  'portfolio-route.tsx',
  'learn-route.tsx',
  'vault-route.tsx',
  'settings-route.tsx',
].map((filename) => path.join(repoRoot, 'apps/mobile/components/mobile-routes', filename));

function readMobileRoutesSource() {
  return mobileRouteEntries.map((entry) => readReachableSource(entry)).join('\n');
}

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
  assert.equal(mobilePackage.scripts['smoke:web-export'], 'node scripts/smoke-web-export.cjs');
  assert.equal(mobilePackage.scripts['smoke:android'], 'node scripts/smoke-android-expo-go.cjs');
  assert.equal(mobilePackage.scripts['smoke:android-bundle'], 'node scripts/smoke-android-bundle.cjs');
  assert.equal(mobilePackage.scripts['smoke:ios'], 'node scripts/smoke-ios-expo-go.cjs');
  assert.equal(mobilePackage.scripts['smoke:ios-bundle'], 'node scripts/smoke-ios-bundle.cjs');
  assert.equal(mobilePackage.scripts['preflight:native'], 'node scripts/native-preflight.cjs');
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

test('Expo app exposes Codex run actions for local mobile workflows', () => {
  const runScriptPath = path.join(repoRoot, 'apps/mobile/script/build_and_run.sh');
  const environmentPath = path.join(repoRoot, 'apps/mobile/.codex/environments/environment.toml');
  const gitAttributesPath = path.join(repoRoot, '.gitattributes');

  assert.ok(fs.existsSync(runScriptPath), 'expected a project-local Expo run script');
  assert.ok(fs.existsSync(environmentPath), 'expected a Codex environment action file scoped to the Expo app');
  assert.ok(fs.existsSync(gitAttributesPath), 'expected shell line-ending rules for the Expo run script');

  const runScript = fs.readFileSync(runScriptPath, 'utf8');
  const environment = fs.readFileSync(environmentPath, 'utf8');
  const gitAttributes = fs.readFileSync(gitAttributesPath, 'utf8');

  assert.ok(runScript.startsWith('#!/usr/bin/env bash'), 'expected a bash entrypoint for Codex Run');
  assert.ok(runScript.includes('set -euo pipefail'), 'expected strict shell execution');
  assert.ok(runScript.includes('ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"'), 'expected script to run from apps/mobile');
  assert.ok(runScript.includes('npx expo'), 'expected npm/npx Expo fallback');
  assert.ok(runScript.includes('start --ios'), 'expected iOS simulator start mode');
  assert.ok(runScript.includes('start --android'), 'expected Android emulator start mode');
  assert.ok(runScript.includes('start --web'), 'expected Expo web start mode');
  assert.ok(runScript.includes('export --platform web'), 'expected local web export mode');
  assert.ok(runScript.includes('expo-doctor'), 'expected diagnostics mode');
  assert.ok(runScript.includes('--preflight-native, preflight-native'), 'expected native preflight action mode');
  assert.ok(runScript.includes('npm run preflight:native'), 'expected action to reuse the committed native preflight');
  assert.ok(runScript.includes('--smoke-android, smoke-android'), 'expected Android smoke action mode');
  assert.ok(runScript.includes('npm run smoke:android'), 'expected action to reuse the committed Android smoke');
  assert.ok(runScript.includes('--smoke-ios, smoke-ios'), 'expected iOS smoke action mode');
  assert.ok(runScript.includes('npm run smoke:ios'), 'expected action to reuse the committed iOS smoke');
  assert.ok(!runScript.includes('eas build'), 'expected Run actions to avoid authenticated cloud builds');

  assert.ok(environment.includes('name = "InterestShield Mobile"'), 'expected the mobile app name in Codex actions');
  assert.ok(environment.includes('command = "./script/build_and_run.sh"'), 'expected primary Run action');
  assert.ok(environment.includes('command = "./script/build_and_run.sh --ios"'), 'expected direct iOS action');
  assert.ok(environment.includes('command = "./script/build_and_run.sh --android"'), 'expected direct Android action');
  assert.ok(environment.includes('command = "./script/build_and_run.sh --web"'), 'expected direct Web action');
  assert.ok(environment.includes('command = "./script/build_and_run.sh --doctor"'), 'expected Expo Doctor action');
  assert.ok(environment.includes('command = "./script/build_and_run.sh --export-web"'), 'expected web export action');
  assert.ok(environment.includes('name = "Native Preflight"'), 'expected native preflight action');
  assert.ok(
    environment.includes('command = "./script/build_and_run.sh --preflight-native"'),
    'expected direct native preflight action'
  );
  assert.ok(environment.includes('name = "Smoke Android"'), 'expected Android smoke action');
  assert.ok(
    environment.includes('command = "./script/build_and_run.sh --smoke-android"'),
    'expected direct Android smoke action'
  );
  assert.ok(environment.includes('name = "Smoke iOS"'), 'expected iOS smoke action');
  assert.ok(
    environment.includes('command = "./script/build_and_run.sh --smoke-ios"'),
    'expected direct iOS smoke action'
  );
  assert.ok(
    gitAttributes.includes('apps/mobile/script/*.sh text eol=lf'),
    'expected mobile shell scripts to stay LF-only'
  );
});

test('Expo Android smoke is repeatable against a booted emulator', () => {
  const smokeScriptPath = path.join(repoRoot, 'apps/mobile/scripts/smoke-android-expo-go.cjs');
  const smokeScript = fs.readFileSync(smokeScriptPath, 'utf8');

  assert.ok(fs.existsSync(smokeScriptPath), 'expected a committed Android Expo Go smoke script');
  assert.ok(smokeScript.includes("'expo', 'start'"), 'expected smoke script to launch Expo CLI');
  assert.ok(smokeScript.includes('--android'), 'expected smoke script to target Android');
  assert.ok(smokeScript.includes('--lan'), 'expected smoke script to use emulator-reachable LAN mode');
  assert.ok(smokeScript.includes('adb'), 'expected smoke script to inspect the Android device state');
  assert.ok(smokeScript.includes('-list-avds'), 'expected smoke script to discover available Android virtual devices');
  assert.ok(smokeScript.includes('sys.boot_completed'), 'expected smoke script to wait for emulator boot completion');
  assert.ok(smokeScript.includes('Android Bundled'), 'expected smoke script to wait for bundle completion');
  assert.ok(smokeScript.includes('ExperienceActivity'), 'expected smoke script to reject Expo Go error screens');
  assert.ok(
    smokeScript.includes("requiredOrbitText = ['Payoff Orbit', 'LOC orbit step']"),
    'expected Android smoke to verify the dashboard orbit after launch'
  );
  assert.ok(smokeScript.includes('dumpIncludesText'), 'expected Android smoke to match UI dump text case-insensitively');
  assert.ok(smokeScript.includes('dumpTextExcerpt'), 'expected Android smoke failures to report visible native text');
  assert.ok(smokeScript.includes('waitForDashboardOrbit'), 'expected Android smoke to scroll to the Dashboard orbit');
  assert.ok(smokeScript.includes("'input', 'swipe'"), 'expected Android smoke to scroll native dashboard content');
  assert.ok(smokeScript.includes('screencap'), 'expected smoke script to capture visual evidence');
  assert.ok(smokeScript.includes('Recent emulator log'), 'expected Android smoke boot failures to include emulator output');
  assert.ok(
    smokeScript.includes('Requested Android virtual device was not available'),
    'expected Android smoke to fail fast when the requested hosted AVD is not visible'
  );
  assert.ok(smokeScript.includes('process.exit(0)'), 'expected Android smoke to exit after successful hosted cleanup');
  assert.ok(smokeScript.includes('expo-env.d.ts'), 'expected smoke script to clean Expo-generated type noise');
  assert.ok(smokeScript.includes('taskkill.exe'), 'expected Windows process-tree cleanup for Metro');
});

test('Expo Android bundle smoke validates native export output when emulator launch is unavailable', () => {
  const smokeScriptPath = path.join(repoRoot, 'apps/mobile/scripts/smoke-android-bundle.cjs');
  const smokeScript = fs.readFileSync(smokeScriptPath, 'utf8');

  assert.ok(fs.existsSync(smokeScriptPath), 'expected a committed Android bundle smoke script');
  assert.ok(
    smokeScript.includes("process.env.ANDROID_BUNDLE_OUTPUT_DIR || 'dist-android'"),
    'expected a stable Android export output directory'
  );
  assert.ok(smokeScript.includes('ANDROID_BUNDLE_TIMEOUT_MS || 300000'), 'expected a configurable Android bundle timeout');
  assert.ok(
    smokeScript.includes("'expo', 'export', '--platform', 'android'"),
    'expected the script to run a native Android export'
  );
  assert.ok(smokeScript.includes('metadata.json'), 'expected the script to validate Expo export metadata');
  assert.ok(smokeScript.includes('/_expo/static/js/android/'), 'expected the script to validate an Android JS bundle');
  assert.ok(smokeScript.includes('Android bundle export smoke passed.'), 'expected a clear pass marker for hosted fallback logs');
  assert.ok(smokeScript.includes('expo-env.d.ts'), 'expected smoke script to clean Expo-generated type noise');
});

test('Expo iOS smoke is repeatable on macOS and explicit when unavailable', () => {
  const smokeScriptPath = path.join(repoRoot, 'apps/mobile/scripts/smoke-ios-expo-go.cjs');
  const smokeScript = fs.readFileSync(smokeScriptPath, 'utf8');

  assert.ok(fs.existsSync(smokeScriptPath), 'expected a committed iOS Expo Go smoke script');
  assert.ok(
    smokeScript.includes('iOS Expo Go smoke requires macOS with Xcode and Simulator.'),
    'expected a clear non-macOS blocker'
  );
  assert.ok(smokeScript.includes("process.platform !== 'darwin'"), 'expected iOS smoke to guard non-macOS hosts');
  assert.ok(smokeScript.includes('xcrun'), 'expected smoke script to use Xcode simulator tooling');
  assert.ok(smokeScript.includes('simctl'), 'expected smoke script to inspect and control iOS simulators');
  assert.ok(smokeScript.includes('preferredPatterns'), 'expected iOS smoke to prefer modern iPhone simulators before fallback');
  assert.ok(smokeScript.includes('iPhone \\d+ Pro'), 'expected iOS smoke to prefer Pro-class simulator names when available');
  assert.ok(smokeScript.includes('IOS_SMOKE_TIMEOUT_MS || 300000'), 'expected iOS smoke default timeout to allow first-run Expo Go setup');
  assert.ok(smokeScript.includes('timeout: 60000'), 'expected simctl startup probe to allow slow hosted macOS runners');
  assert.ok(smokeScript.includes("'expo', 'start'"), 'expected smoke script to launch Expo CLI');
  assert.ok(smokeScript.includes('--ios'), 'expected smoke script to target iOS');
  assert.ok(smokeScript.includes('--localhost'), 'expected smoke script to use simulator-local Metro transport');
  assert.ok(smokeScript.includes('iOS Bundled'), 'expected smoke script to wait for bundle completion');
  assert.ok(smokeScript.includes('screenshot'), 'expected smoke script to capture visual evidence');
  assert.ok(smokeScript.includes('expo-env.d.ts'), 'expected smoke script to clean Expo-generated type noise');
});

test('Expo iOS bundle smoke validates native export output when Simulator launch is unavailable', () => {
  const smokeScriptPath = path.join(repoRoot, 'apps/mobile/scripts/smoke-ios-bundle.cjs');
  const smokeScript = fs.readFileSync(smokeScriptPath, 'utf8');

  assert.ok(fs.existsSync(smokeScriptPath), 'expected a committed iOS bundle smoke script');
  assert.ok(smokeScript.includes("process.env.IOS_BUNDLE_OUTPUT_DIR || 'dist-ios'"), 'expected a stable iOS export output directory');
  assert.ok(smokeScript.includes('IOS_BUNDLE_TIMEOUT_MS || 300000'), 'expected a configurable iOS bundle timeout');
  assert.ok(smokeScript.includes("'expo', 'export', '--platform', 'ios'"), 'expected the script to run a native iOS export');
  assert.ok(smokeScript.includes('metadata.json'), 'expected the script to validate Expo export metadata');
  assert.ok(smokeScript.includes('/_expo/static/js/ios/'), 'expected the script to validate an iOS JS bundle');
  assert.ok(smokeScript.includes('iOS bundle export smoke passed.'), 'expected a clear pass marker for hosted fallback logs');
  assert.ok(smokeScript.includes('expo-env.d.ts'), 'expected smoke script to clean Expo-generated type noise');
});

test('GitHub CI protects web and mobile quality gates', () => {
  const workflowPath = path.join(repoRoot, '.github/workflows/ci.yml');

  assert.ok(fs.existsSync(workflowPath), 'expected a committed GitHub Actions workflow');
  const workflow = fs.readFileSync(workflowPath, 'utf8');

  assert.ok(workflow.includes('pull_request:'), 'expected CI to run on pull requests');
  assert.ok(workflow.includes('push:'), 'expected CI to run on pushes');
  assert.ok(workflow.includes('apps/web/package-lock.json'), 'expected web npm cache to use the web lockfile');
  assert.ok(workflow.includes('apps/mobile/package-lock.json'), 'expected mobile npm cache to use the mobile lockfile');
  assert.ok(workflow.includes('working-directory: apps/web'), 'expected workflow to run web commands from apps/web');
  assert.ok(workflow.includes('npm test'), 'expected workflow to run web regression tests');
  assert.ok(workflow.includes('npm run lint'), 'expected workflow to run web lint');
  assert.ok(workflow.includes('npm run build'), 'expected workflow to run the production web build');
  assert.ok(workflow.includes('npm run smoke:routes'), 'expected workflow to run built-route smoke');
  assert.ok(workflow.includes('npm run smoke:rendered:built'), 'expected workflow to run rendered responsive smoke');
  assert.ok(workflow.includes('working-directory: apps/mobile'), 'expected workflow to run mobile commands from apps/mobile');
  assert.ok(workflow.includes('npm run build:web'), 'expected workflow to build the Expo web export');
  assert.ok(workflow.includes('npm run smoke:web-export'), 'expected workflow to smoke the Expo web export');
  assert.ok(workflow.includes('npm run check'), 'expected workflow to run mobile type-checks');
  assert.ok(
    workflow.includes('node scripts/mobile-port-contract-tests.cjs'),
    'expected workflow to run the shared mobile contract tests'
  );
  assert.ok(workflow.includes('npm run smoke:ios'), 'expected workflow to verify the iOS smoke guard');
  assert.ok(
    workflow.includes('iOS Expo Go smoke requires macOS with Xcode and Simulator.'),
    'expected workflow to assert the explicit non-macOS iOS smoke blocker'
  );
});

test('manual release smoke protects deployed web and optional mobile export gates', () => {
  const workflowPath = path.join(repoRoot, '.github/workflows/release-smoke.yml');

  assert.ok(fs.existsSync(workflowPath), 'expected a committed manual release smoke workflow');
  const workflow = fs.readFileSync(workflowPath, 'utf8');

  assert.ok(workflow.includes('workflow_dispatch:'), 'expected release smoke to run manually');
  assert.ok(workflow.includes('production_origin:'), 'expected release smoke to accept a target origin');
  assert.ok(workflow.includes('VERCEL_AUTOMATION_BYPASS_SECRET'), 'expected release smoke to support protected Vercel previews');
  assert.ok(workflow.includes('npm run smoke:production'), 'expected release smoke to verify deployed web routes');
  assert.ok(workflow.includes('run_mobile_export'), 'expected release smoke to support optional Expo export checks');
  assert.ok(workflow.includes('npm run check'), 'expected release smoke to type-check the mobile app when export checks run');
  assert.ok(workflow.includes('npm run build:web'), 'expected release smoke to build the Expo web export');
  assert.ok(workflow.includes('npm run smoke:web-export'), 'expected release smoke to verify the Expo web export');
  assert.ok(
    workflow.includes('node scripts/mobile-port-contract-tests.cjs'),
    'expected release smoke to run shared mobile contract tests'
  );
});

test('manual iOS native smoke runs on a macOS simulator host', () => {
  const workflowPath = path.join(repoRoot, '.github/workflows/mobile-ios-smoke.yml');

  assert.ok(fs.existsSync(workflowPath), 'expected a committed manual iOS native smoke workflow');
  const workflow = fs.readFileSync(workflowPath, 'utf8');

  assert.ok(workflow.includes('workflow_dispatch:'), 'expected iOS smoke to run manually');
  assert.ok(workflow.includes('simulator:'), 'expected iOS smoke to accept a simulator override');
  assert.ok(workflow.includes('require_simulator:'), 'expected iOS smoke to support strict simulator-only mode');
  assert.ok(workflow.includes('runs-on: macos-latest'), 'expected iOS smoke to use a macOS runner');
  assert.ok(workflow.includes('apps/mobile/package-lock.json'), 'expected mobile npm cache to use the mobile lockfile');
  assert.ok(workflow.includes('working-directory: apps/mobile'), 'expected iOS smoke to run from the Expo app');
  assert.ok(workflow.includes('xcode-select'), 'expected iOS smoke to select the available Xcode app before simctl use');
  assert.ok(workflow.includes('xcrun simctl list runtimes'), 'expected iOS smoke to warm Simulator tooling before npm smoke');
  assert.ok(workflow.includes('npm run check'), 'expected iOS smoke to type-check before running native smoke');
  assert.ok(workflow.includes('IOS_SMOKE_SIMULATOR'), 'expected iOS smoke to pass the requested simulator through');
  assert.ok(workflow.includes('IOS_SMOKE_TIMEOUT_MS: 240000'), 'expected hosted iOS smoke fallback mode to use a bounded simulator attempt');
  assert.ok(workflow.includes('IOS_BUNDLE_TIMEOUT_MS: 420000'), 'expected hosted iOS bundle export to use the same long timeout');
  assert.ok(workflow.includes('STRICT_IOS_SIMULATOR'), 'expected iOS smoke to allow strict simulator mode');
  assert.ok(workflow.includes('Retrying iOS smoke once'), 'expected hosted iOS smoke to retry first-run Simulator openurl timeouts once');
  assert.ok(workflow.includes('npm run smoke:ios'), 'expected iOS smoke to run the committed Expo Go simulator smoke');
  assert.ok(
    workflow.includes('Hosted iOS Simulator launch did not complete; validating the iOS bundle export fallback.'),
    'expected hosted iOS smoke to explain the fallback'
  );
  assert.ok(workflow.includes('IOS_BUNDLE_OUTPUT_DIR=dist-ios npm run smoke:ios-bundle'), 'expected iOS smoke to validate the bundle fallback');
  assert.ok(workflow.includes('actions/upload-artifact@v4'), 'expected iOS smoke to upload bundle fallback evidence');
});

test('manual Android native smoke runs on a GitHub emulator host', () => {
  const workflowPath = path.join(repoRoot, '.github/workflows/mobile-android-smoke.yml');

  assert.ok(fs.existsSync(workflowPath), 'expected a committed manual Android native smoke workflow');
  const workflow = fs.readFileSync(workflowPath, 'utf8');

  assert.ok(workflow.includes('workflow_dispatch:'), 'expected Android smoke to run manually');
  assert.ok(workflow.includes('api_level:'), 'expected Android smoke to accept an API level override');
  assert.ok(workflow.includes('avd_name:'), 'expected Android smoke to accept an AVD name override');
  assert.ok(workflow.includes('require_emulator:'), 'expected Android smoke to support strict emulator-only mode');
  assert.ok(workflow.includes('runs-on: ubuntu-latest'), 'expected Android smoke to use a Linux runner');
  assert.ok(workflow.includes('apps/mobile/package-lock.json'), 'expected mobile npm cache to use the mobile lockfile');
  assert.ok(workflow.includes('actions/setup-java@v4'), 'expected Android SDK tooling to have Java available');
  assert.ok(workflow.includes('cmdline-tools/latest/bin'), 'expected Android smoke to expose SDK command-line tools on PATH');
  assert.ok(workflow.includes('GITHUB_PATH'), 'expected Android smoke to persist Android SDK tool paths for later steps');
  assert.ok(workflow.includes('ANDROID_AVD_HOME'), 'expected Android smoke to align AVD creation and launch directories');
  assert.ok(workflow.includes('mkdir -p "$ANDROID_AVD_HOME"'), 'expected Android smoke to create the shared AVD directory');
  assert.ok(workflow.includes('test -x "$ANDROID_SDK_ROOT/cmdline-tools/latest/bin/sdkmanager"'), 'expected Android smoke to fail clearly when sdkmanager is missing');
  assert.ok(workflow.includes('sdkmanager'), 'expected Android smoke to install emulator tooling');
  assert.ok(workflow.includes('avdmanager create avd'), 'expected Android smoke to create an emulator profile');
  assert.ok(workflow.includes('emulator -list-avds'), 'expected Android smoke to verify the created AVD is visible to the emulator');
  assert.ok(workflow.includes('test -f "$ANDROID_AVD_HOME/${{ inputs.avd_name }}.ini"'), 'expected Android smoke to verify the AVD ini path');
  assert.ok(workflow.includes('ANDROID_SMOKE_AVD'), 'expected Android smoke to pass the requested AVD through');
  assert.ok(workflow.includes('ANDROID_SMOKE_SCREENSHOT'), 'expected Android smoke to capture a workflow artifact screenshot');
  assert.ok(workflow.includes('ANDROID_SMOKE_TIMEOUT_MS: 480000'), 'expected hosted Android smoke fallback mode to use a bounded emulator attempt');
  assert.ok(workflow.includes('ANDROID_BUNDLE_TIMEOUT_MS: 420000'), 'expected hosted Android bundle export to use a long timeout');
  assert.ok(workflow.includes('STRICT_ANDROID_EMULATOR'), 'expected Android smoke to allow strict emulator mode');
  assert.ok(workflow.includes('timeout 12m npm run smoke:android'), 'expected Android smoke to have a shell-level hosted timeout');
  assert.ok(
    workflow.includes('Hosted Android emulator launch did not complete; validating the Android bundle export fallback.'),
    'expected hosted Android smoke to explain the fallback'
  );
  assert.ok(
    workflow.includes('ANDROID_BUNDLE_OUTPUT_DIR=dist-android npm run smoke:android-bundle'),
    'expected Android smoke to validate the bundle fallback'
  );
  assert.ok(workflow.includes('sudo chown "$USER" /dev/kvm'), 'expected Android smoke to make hosted KVM access explicit');
  assert.ok(workflow.includes('/dev/kvm is not available'), 'expected Android smoke to fail clearly when hosted KVM is unavailable');
  assert.ok(workflow.includes('npm run smoke:android'), 'expected Android smoke to run the committed Expo Go emulator smoke');
  assert.ok(workflow.includes('interestshield-android-bundle'), 'expected Android smoke to upload bundle fallback evidence');
  assert.ok(workflow.includes('interestshield-android-smoke'), 'expected Android smoke to upload visual evidence');
});

test('mobile native release config is explicit for Android and iOS builds', () => {
  const appConfig = readJson('apps/mobile/app.json');
  const easConfig = readJson('apps/mobile/eas.json');
  const nativePreflightPath = path.join(repoRoot, 'apps/mobile/scripts/native-preflight.cjs');
  const nativePreflight = fs.readFileSync(nativePreflightPath, 'utf8');

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

  assert.ok(fs.existsSync(nativePreflightPath), 'expected a repeatable native smoke preflight script');
  assert.ok(nativePreflight.includes('adb'), 'expected Android device bridge check');
  assert.ok(nativePreflight.includes('emulator'), 'expected Android emulator check');
  assert.ok(nativePreflight.includes('findCommand'), 'expected native preflight to discover tools outside PATH');
  assert.ok(nativePreflight.includes('ANDROID_HOME'), 'expected native preflight to inspect Android SDK environment paths');
  assert.ok(nativePreflight.includes('Android connected device'), 'expected native preflight to report device availability separately');
  assert.ok(nativePreflight.includes('Android virtual device'), 'expected native preflight to report AVD availability separately');
  assert.ok(nativePreflight.includes('Android smoke target'), 'expected native preflight to report the effective Android smoke target');
  assert.ok(nativePreflight.includes('Android smoke can auto-boot an AVD'), 'expected AVD auto-boot readiness copy');
  assert.ok(nativePreflight.includes('{ blocking: !hasAndroidAvd }'), 'expected no-device Android preflight to be non-blocking when an AVD exists');
  assert.ok(nativePreflight.includes('xcrun'), 'expected iOS simulator tool check');
  assert.ok(nativePreflight.includes('process.platform'), 'expected host platform awareness');
  assert.ok(nativePreflight.includes('com.islanddevcrew.interestshield'), 'expected app id validation');
  assert.ok(nativePreflight.includes('build:android:preview'), 'expected Android build script validation');
  assert.ok(nativePreflight.includes('build:ios:preview'), 'expected iOS build script validation');
  assert.ok(nativePreflight.includes('Native smoke preflight'), 'expected clear CLI output heading');
  assert.ok(nativePreflight.includes('process.exitCode = 1'), 'expected preflight to fail when smoke tools are missing');
});

test('mobile web export is configured for Vercel SPA hosting and repeatable smoke tests', () => {
  const vercelConfig = readJson('apps/mobile/vercel.json');
  const serveScript = fs.readFileSync(path.join(repoRoot, 'apps/mobile/scripts/serve-web-export.cjs'), 'utf8');
  const smokeScriptPath = path.join(repoRoot, 'apps/mobile/scripts/smoke-web-export.cjs');
  const smokeScript = fs.readFileSync(smokeScriptPath, 'utf8');

  assert.equal(vercelConfig.$schema, 'https://openapi.vercel.sh/vercel.json');
  assert.equal(vercelConfig.buildCommand, 'npm run build:web');
  assert.equal(vercelConfig.outputDirectory, 'dist-web');
  assert.deepEqual(vercelConfig.rewrites, [{ source: '/(.*)', destination: '/' }]);

  assert.ok(serveScript.includes('dist-web'), 'expected server to serve the Expo export directory');
  assert.ok(serveScript.includes('index.html'), 'expected server to fall back to index.html for direct routes');
  assert.ok(serveScript.includes('process.env.PORT'), 'expected configurable local smoke-test port');
  assert.ok(serveScript.includes('path.relative(root, requestedPath)'), 'expected path traversal protection');
  assert.ok(serveScript.includes('path.isAbsolute(relativePath)'), 'expected absolute escape protection');

  assert.ok(fs.existsSync(smokeScriptPath), 'expected a repeatable Expo export smoke script');
  assert.ok(smokeScript.includes("['/', 'Dashboard'"), 'expected smoke script to cover the dashboard route');
  assert.ok(smokeScript.includes("['/simulator', 'Simulator'"), 'expected smoke script to cover the simulator route');
  assert.ok(smokeScript.includes("['/cockpit', 'Cockpit'"), 'expected smoke script to cover the cockpit route');
  assert.ok(smokeScript.includes("['/portfolio', 'Portfolio'"), 'expected smoke script to cover the portfolio route');
  assert.ok(smokeScript.includes("['/learn', 'Learn'"), 'expected smoke script to cover the learn route');
  assert.ok(smokeScript.includes("['/vault', 'Vault'"), 'expected smoke script to cover the vault route');
  assert.ok(smokeScript.includes("spawn(process.execPath"), 'expected smoke script to start the committed export server');
  assert.ok(smokeScript.includes('scripts/serve-web-export.cjs'), 'expected smoke script to reuse the committed server');
  assert.ok(smokeScript.includes('response.statusCode !== 200'), 'expected smoke script to fail non-200 routes');
  assert.ok(smokeScript.includes("content-type") && smokeScript.includes("text/html"), 'expected smoke script to verify HTML responses');
  assert.ok(smokeScript.includes('requiredDashboardBundleText'), 'expected smoke script to verify compiled Dashboard hooks');
  assert.ok(smokeScript.includes('mobile-payoff-orbit'), 'expected smoke script to require the mobile orbit hook in the export bundle');
  assert.ok(smokeScript.includes('mobile-payoff-orbit-node-'), 'expected smoke script to require mobile orbit node hooks in the export bundle');
  assert.ok(smokeScript.includes('aria-checked'), 'expected smoke script to require exported active orbit state');
  assert.ok(smokeScript.includes('linkedWebBundlePaths'), 'expected smoke script to inspect the emitted Expo JS bundle');
  assert.ok(smokeScript.includes('finally') && smokeScript.includes('server.kill'), 'expected smoke script to clean up the server');
});

test('shared financial engine matches current web engine on core fixtures', () => {
  const sharedEngine = loadTsFile(path.join(repoRoot, 'packages/financial-engine/src/index.ts'));
  const webEngine = loadTsFile(path.join(repoRoot, 'apps/web/src/engine/calculations.ts'));
  const baselineInputs = {
    monthlyIncome: 6500,
    monthlyExpenses: 5000,
    carLoan: {
      balance: 18450,
      apr: 0.069,
      monthlyPayment: 425,
      termMonths: 48,
    },
    extraPayment: 0,
  };
  const webBaseline = webEngine.simulateBaseline(baselineInputs);
  const sharedBaseline = sharedEngine.simulateAmortizedPayoff({
    principalBalance: baselineInputs.carLoan.balance,
    apr: baselineInputs.carLoan.apr,
    monthlyPayment: baselineInputs.carLoan.monthlyPayment,
    maxMonths: 600,
  });

  assert.equal(sharedEngine.calculateCashFlow(8000, 4500), webEngine.calculateCashFlow(8000, 4500));
  assert.equal(
    sharedEngine.calculateAmortizationPayment(300000, 0.065, 360).toFixed(2),
    webEngine.calculateAmortizationPayment(300000, 0.065, 360).toFixed(2)
  );
  assert.equal(
    sharedEngine.calculateAmortizationPayment(300000, 6.5, 360).toFixed(2),
    sharedEngine.calculateAmortizationPayment(300000, 0.065, 360).toFixed(2)
  );
  assert.equal(
    webEngine.calculateAmortizationPayment(300000, 6.5, 360).toFixed(2),
    webEngine.calculateAmortizationPayment(300000, 0.065, 360).toFixed(2)
  );
  assert.equal(
    sharedEngine.calculateTotalAmortizationInterest(300000, 0.065, 360).toFixed(2),
    webEngine.calculateTotalAmortizationInterest(300000, 0.065, 360).toFixed(2)
  );
  assert.equal(
    sharedEngine.calculateTotalAmortizationInterest(300000, 6.5, 360).toFixed(2),
    sharedEngine.calculateTotalAmortizationInterest(300000, 0.065, 360).toFixed(2)
  );
  assert.equal(
    sharedEngine.calculateADBInterest(3200, 0.085, 7000, 4500).toFixed(2),
    webEngine.calculateADBInterest(3200, 0.085, 7000, 4500).toFixed(2)
  );
  assert.equal(
    sharedEngine.calculateADBInterest(3200, 8.5, 7000, 4500).toFixed(2),
    sharedEngine.calculateADBInterest(3200, 0.085, 7000, 4500).toFixed(2)
  );
  assert.equal(
    webEngine.calculateADBInterest(3200, 8.5, 7000, 4500).toFixed(2),
    webEngine.calculateADBInterest(3200, 0.085, 7000, 4500).toFixed(2)
  );
  assert.equal(
    sharedEngine.calculateDailyInterest(18450, 0.069).toFixed(2),
    webEngine.calculateDailyInterest(18450, 0.069).toFixed(2)
  );
  assert.equal(sharedEngine.calculateDailyInterest(18450, 6.9).toFixed(2), '3.49');
  assert.equal(sharedEngine.formatCurrency(3500), webEngine.formatCurrency(3500));
  assert.equal(sharedBaseline.payoffMonths, webBaseline.payoffMonths);
  assert.equal(sharedBaseline.totalInterest.toFixed(2), webBaseline.totalInterest.toFixed(2));
  assert.equal(sharedBaseline.isPayoffPossible, webBaseline.isPayoffPossible);
});

test('shared mobile velocity delegates to the canonical Money Loop payoff engine', () => {
  const sharedEnginePath = path.join(repoRoot, 'packages/financial-engine/src/index.ts');
  const sharedEngine = loadTsFile(sharedEnginePath);
  const sharedEngineSource = fs.readFileSync(sharedEnginePath, 'utf8');
  const wrapperStart = sharedEngineSource.indexOf('function simulateMobileMoneyLoopPayoff');
  const wrapperEnd = sharedEngineSource.indexOf('function simulateMobileVelocity', wrapperStart);
  const wrapperSource = sharedEngineSource.slice(wrapperStart, wrapperEnd);
  const defaultInput = sharedEngine.defaultMobileDashboardInput;
  const cashFlowPaydown = defaultInput.monthlyIncome - defaultInput.monthlyExpenses - defaultInput.activeDebt.monthlyPayment;
  const canonicalProjection = sharedEngine.simulateMoneyLoopPayoff({
    principalBalance: defaultInput.activeDebt.balance,
    debtApr: defaultInput.activeDebt.apr,
    debtPayment: defaultInput.activeDebt.monthlyPayment,
    loc: {
      ...defaultInput.loc,
      balance: Math.max(0, defaultInput.loc.balance),
    },
    chunkAmount: defaultInput.chunkAmount,
    cashFlowPaydown,
    locDepositAmount: defaultInput.monthlyIncome,
    locExpenseAmount: defaultInput.monthlyExpenses + defaultInput.activeDebt.monthlyPayment,
    maxMonths: 600,
  });
  const mobileVelocity = sharedEngine
    .buildMobileSimulatorSnapshot(defaultInput)
    .strategies.find((strategy) => strategy.name === 'Velocity');

  assert.ok(wrapperSource.includes('simulateMoneyLoopPayoff({'), 'expected mobile wrapper to call the canonical payoff engine');
  assert.ok(!wrapperSource.includes('while (('), 'expected mobile wrapper not to duplicate the payoff loop');
  assert.ok(!wrapperSource.includes('calculateADBInterest('), 'expected LOC interest to flow through the canonical payoff engine');
  assert.ok(mobileVelocity, 'expected Velocity strategy in the mobile simulator snapshot');
  assert.equal(mobileVelocity.months, canonicalProjection.payoffMonths);
  assert.equal(mobileVelocity.totalInterest.toFixed(2), canonicalProjection.totalInterest.toFixed(2));
  assert.equal(mobileVelocity.isPayoffPossible, canonicalProjection.isPayoffPossible);
});

test('shared mobile amortized strategies delegate to the canonical payoff helper', () => {
  const sharedEnginePath = path.join(repoRoot, 'packages/financial-engine/src/index.ts');
  const sharedEngine = loadTsFile(sharedEnginePath);
  const sharedEngineSource = fs.readFileSync(sharedEnginePath, 'utf8');
  const baselineStart = sharedEngineSource.indexOf('function simulateMobileBaseline');
  const baselineEnd = sharedEngineSource.indexOf('function simulateMobileWithExtraPayments', baselineStart);
  const extraStart = baselineEnd;
  const extraEnd = sharedEngineSource.indexOf('function formatMobileMonths', extraStart);
  const baselineWrapper = sharedEngineSource.slice(baselineStart, baselineEnd);
  const extraWrapper = sharedEngineSource.slice(extraStart, extraEnd);
  const defaultInput = sharedEngine.defaultMobileDashboardInput;
  const cashFlow = defaultInput.monthlyIncome - defaultInput.monthlyExpenses;
  const surplusAfterMinimum = Math.max(0, cashFlow - defaultInput.activeDebt.monthlyPayment);
  const canonicalBaseline = sharedEngine.simulateAmortizedPayoff({
    principalBalance: defaultInput.activeDebt.balance,
    apr: defaultInput.activeDebt.apr,
    monthlyPayment: defaultInput.activeDebt.monthlyPayment,
    maxMonths: 600,
  });
  const canonicalAccelerated = sharedEngine.simulateAmortizedPayoff({
    principalBalance: defaultInput.activeDebt.balance,
    apr: defaultInput.activeDebt.apr,
    monthlyPayment: defaultInput.activeDebt.monthlyPayment,
    extraPayment: surplusAfterMinimum,
    maxMonths: 600,
  });
  const strategies = sharedEngine.buildMobileSimulatorSnapshot(defaultInput).strategies;
  const traditional = strategies.find((strategy) => strategy.name === 'Traditional');
  const snowball = strategies.find((strategy) => strategy.name === 'Snowball');
  const avalanche = strategies.find((strategy) => strategy.name === 'Avalanche');

  assert.ok(baselineWrapper.includes('simulateAmortizedPayoff({'), 'expected baseline wrapper to call the shared amortized payoff helper');
  assert.ok(extraWrapper.includes('simulateAmortizedPayoff({'), 'expected extra-payment wrapper to call the shared amortized payoff helper');
  assert.ok(!baselineWrapper.includes('while (balance'), 'expected baseline wrapper not to duplicate an amortized payoff loop');
  assert.ok(!extraWrapper.includes('while (balance'), 'expected extra-payment wrapper not to duplicate an amortized payoff loop');
  assert.ok(traditional, 'expected Traditional strategy in the mobile simulator snapshot');
  assert.ok(snowball, 'expected Snowball strategy in the mobile simulator snapshot');
  assert.ok(avalanche, 'expected Avalanche strategy in the mobile simulator snapshot');
  assert.equal(traditional.months, canonicalBaseline.payoffMonths);
  assert.equal(traditional.totalInterest.toFixed(2), canonicalBaseline.totalInterest.toFixed(2));
  assert.equal(snowball.months, canonicalAccelerated.payoffMonths);
  assert.equal(snowball.totalInterest.toFixed(2), canonicalAccelerated.totalInterest.toFixed(2));
  assert.equal(avalanche.months, canonicalAccelerated.payoffMonths);
  assert.equal(avalanche.totalInterest.toFixed(2), canonicalAccelerated.totalInterest.toFixed(2));
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
  assert.equal(
    stableSnapshot.loop.map((step) => step.label).join('|'),
    'Income|LOC|Expenses|Cash Flow|Principal'
  );
  assert.equal(stableSnapshot.loop.length, 5);
  assert.equal(stableSnapshot.loop.find((step) => step.label === 'LOC').value, '$21,800 open');
  assert.equal(stableSnapshot.loop.find((step) => step.label === 'Income').pressurePercent, 100);
  assert.equal(stableSnapshot.loop.find((step) => step.label === 'Expenses').pressurePercent, 56);
  assert.equal(stableSnapshot.loop.find((step) => step.label === 'Cash Flow').pressurePercent, 44);
  assert.equal(stableSnapshot.loop.find((step) => step.label === 'Principal').pressurePercent, 8);
  assert.equal(unsafeSnapshot.loop.find((step) => step.label === 'Cash Flow').pressurePercent, 8);
  assert.ok(
    stableSnapshot.loop.every((step) => step.pressurePercent >= 8 && step.pressurePercent <= 100),
    'expected mobile Money Loop pressure values to stay bounded'
  );
  assert.ok(
    stableSnapshot.loop.find((step) => step.label === 'LOC').detail.includes('13% used'),
    'expected mobile Money Loop to include LOC utilization context'
  );
});

test('native dashboard renders the four vitals before coach or review cards', () => {
  const dashboardRoute = fs.readFileSync(
    path.join(repoRoot, 'apps/mobile/components/mobile-routes/dashboard-route.tsx'),
    'utf8'
  );
  const vitalsIndex = dashboardRoute.indexOf('snapshot.vitals.map');
  const reviewIndex = dashboardRoute.indexOf('Review Before Modeling');
  const coachIndex = dashboardRoute.indexOf('Coach Note');

  assert.ok(vitalsIndex >= 0, 'expected native DashboardRoute to render snapshot vitals');
  assert.ok(reviewIndex > vitalsIndex, 'expected review guardrail card after the four vitals');
  assert.ok(coachIndex > vitalsIndex, 'expected coach note after the four vitals');
  assert.ok(!dashboardRoute.includes('title="Next Move"'), 'expected native DashboardRoute not to duplicate Next Move outside the four vitals');
});

test('shared mobile default assumptions start with the verified web demo Money Loop', () => {
  const sharedEngine = loadTsFile(path.join(repoRoot, 'packages/financial-engine/src/index.ts'));
  const webStoreSource = fs.readFileSync(path.join(repoRoot, 'apps/web/src/stores/financial-store.ts'), 'utf8');
  const defaultInput = sharedEngine.defaultMobileDashboardInput;
  const dashboard = sharedEngine.buildMobileDashboardSnapshot();
  const simulator = sharedEngine.buildMobileSimulatorSnapshot();
  const cockpit = sharedEngine.buildMobileCockpitSnapshot();
  const vault = sharedEngine.buildMobileVaultSnapshot();
  const learn = sharedEngine.buildMobileLearnSnapshot();

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
  assert.equal(learn.guardrail, null);
  assert.equal(learn.lessons.length, 4);
  assert.ok(learn.lessons.find((lesson) => lesson.title === 'Cash Flow').value.includes('$'));
});

test('shared mobile snapshots sanitize non-finite assumptions before rendering labels', () => {
  const sharedEngine = loadTsFile(path.join(repoRoot, 'packages/financial-engine/src/index.ts'));
  const corruptedInput = {
    monthlyIncome: Number.NaN,
    monthlyExpenses: Number.POSITIVE_INFINITY,
    chunkAmount: Number.NaN,
    activeDebtName: '',
    activeDebt: {
      balance: Number.NaN,
      apr: Number.NaN,
      monthlyPayment: Number.NaN,
      termMonths: Number.NaN,
    },
    loc: {
      limit: Number.NaN,
      apr: Number.NaN,
      balance: Number.NaN,
    },
  };
  const snapshots = [
    sharedEngine.buildMobileDashboardSnapshot(corruptedInput),
    sharedEngine.buildMobilePortfolioSnapshot(corruptedInput),
    sharedEngine.buildMobileSimulatorSnapshot(corruptedInput),
    sharedEngine.buildMobileCockpitSnapshot(corruptedInput),
    sharedEngine.buildMobileVaultSnapshot(corruptedInput),
    sharedEngine.buildMobileLearnSnapshot(corruptedInput),
  ];
  const stringified = JSON.stringify(snapshots);
  const dashboard = snapshots[0];
  const portfolio = snapshots[1];
  const simulator = snapshots[2];
  const cockpit = snapshots[3];
  const vault = snapshots[4];
  const learn = snapshots[5];

  assert.ok(!stringified.includes('NaN'), stringified);
  assert.ok(!stringified.includes('Infinity'), stringified);
  assert.equal(dashboard.cashFlow, 0);
  assert.equal(dashboard.locNeedsSetup, true);
  assert.equal(dashboard.locUtilization, 0);
  assert.equal(dashboard.availableLoc, 0);
  assert.equal(dashboard.dailyInterestBurn, 0);
  assert.equal(dashboard.loop.find((step) => step.label === 'Principal').value, 'Auto Loan');
  assert.equal(portfolio.totalDebt, 0);
  assert.equal(portfolio.totalMinimums, 0);
  assert.equal(portfolio.payoffPath.points[0].balance, 0);
  assert.equal(simulator.guardrail, 'Income needs to exceed expenses before velocity payoff claims are projected.');
  assert.equal(simulator.velocity.interestSaved, 0);
  assert.equal(simulator.velocity.monthsSaved, 0);
  assert.equal(cockpit.instruments.find((instrument) => instrument.label === 'Heading').value, 'Auto Loan');
  assert.equal(cockpit.flightStatusLabel, 'Review inputs');
  assert.equal(vault.freedomPathLabel, 'Review inputs');
  assert.equal(learn.lessons.find((lesson) => lesson.title === 'LOC Room').value, 'Enter LOC terms');
});

test('Expo app uses dedicated shared-engine route modules instead of a monolithic shell', () => {
  const routeSource = fs.readFileSync(path.join(repoRoot, 'apps/mobile/app/index.tsx'), 'utf8');
  const layoutSource = fs.readFileSync(path.join(repoRoot, 'apps/mobile/app/_layout.tsx'), 'utf8');
  const routeFrameSource = fs.readFileSync(
    path.join(repoRoot, 'apps/mobile/components/mobile-routes/route-screen.tsx'),
    'utf8'
  );
  const assumptionsProviderPath = path.join(
    repoRoot,
    'apps/mobile/components/mobile-assumptions-provider.tsx'
  );
  const routesSource = readMobileRoutesSource();
  const sharedEngine = loadTsFile(path.join(repoRoot, 'packages/financial-engine/src/index.ts'));

  assert.ok(routeSource.includes("from '@/components/mobile-routes/dashboard-route'"), 'expected route to import its owning module directly');
  assert.ok(routeFrameSource.includes('<MobileModeNavigation'), 'expected route frame to mount extracted navigation');
  assert.ok(fs.existsSync(assumptionsProviderPath), 'expected one assumptions provider above the retained route stack');
  const assumptionsProviderSource = fs.readFileSync(assumptionsProviderPath, 'utf8');
  assert.ok(routeFrameSource.includes('useMobileAssumptions'), 'expected retained routes to consume shared assumptions');
  assert.ok(routeFrameSource.includes('disabled={!context.isHydrated}'), 'expected assumption edits to wait for owner hydration');
  assert.ok(!routeFrameSource.includes('usePersistedMobileAssumptions'), 'expected retained routes not to own persistence');
  assert.equal(
    (assumptionsProviderSource.match(/usePersistedMobileAssumptions\(/g) ?? []).length,
    1,
    'expected exactly one persisted assumptions owner'
  );
  const providerOpenIndex = layoutSource.indexOf('<MobileAssumptionsProvider>');
  const stackIndex = layoutSource.indexOf('<Stack');
  const providerCloseIndex = layoutSource.indexOf('</MobileAssumptionsProvider>');
  assert.ok(
    providerOpenIndex >= 0 && stackIndex > providerOpenIndex && providerCloseIndex > stackIndex,
    'expected the assumptions provider to enclose the retained route stack'
  );
  assert.ok(!routeFrameSource.includes('buildMobile'), 'expected shared route frame to remain free of financial snapshot builders');
  assert.ok(!routeFrameSource.includes('useState<MobileMode>'), 'expected route identity to come from the mounted Expo route');
  assert.ok(!routeFrameSource.includes('setMode'), 'expected navigation not to mutate retained route content');
  assert.ok(routeFrameSource.includes('activeMode={mode}'), 'expected navigation selection to match the mounted route');
  assert.ok(
    !fs.existsSync(path.join(repoRoot, 'apps/mobile/components/mobile-shell.tsx')),
    'expected the monolithic MobileShell entry to be removed'
  );

  assert.ok(
    routesSource.includes("@interestshield/financial-engine"),
    'expected route modules to import the shared financial engine package'
  );
  assert.ok(
    routesSource.includes('buildMobileDashboardSnapshot'),
    'expected dashboard route to render the shared dashboard snapshot'
  );
  assert.ok(!routesSource.includes('8000 - 4500'), 'expected routes not to inline cash-flow arithmetic');
  for (const mode of ['dashboard', 'simulator', 'cockpit', 'portfolio', 'learn', 'vault', 'settings']) {
    assert.ok(routesSource.includes(`| '${mode}'`), `expected MobileMode to include ${mode}`);
  }
  assert.ok(routesSource.includes("const modes: Array<{ id: MobileMode; label: string }>"));
  assert.ok(routesSource.includes("{ id: 'simulator', label: 'Simulator' }"));
  assert.ok(routesSource.includes("{ id: 'cockpit', label: 'Cockpit' }"));
  assert.ok(routesSource.includes("{ id: 'portfolio', label: 'Portfolio' }"));
  assert.ok(routesSource.includes('{modes.map((mobileMode) => ('));
  assert.ok(routesSource.includes('onPress={() => onModeChange(mobileMode.id)}'));
  assert.ok(routeFrameSource.includes('onModeChange={handleModeChange}'));
  assert.ok(routesSource.includes('testID={`mobile-mode-tab-${id}`}'));
  assert.ok(routesSource.includes('TextInput'), 'expected native editable assumption controls');
  assert.ok(routesSource.includes('accessibilityLabel="Active debt name"'));
  assert.ok(routesSource.includes('accessibilityLabel="Monthly income"'));
  assert.ok(routesSource.includes('accessibilityLabel="Monthly expenses"'));
  assert.ok(routesSource.includes('accessibilityLabel="Line of credit limit"'));
  assert.ok(routesSource.includes('accessibilityLabel="Line of credit balance"'));
  assert.ok(routesSource.includes('accessibilityLabel="Line of credit APR"'));
  assert.ok(routesSource.includes('accessibilityLabel="Active debt balance"'));
  assert.ok(routesSource.includes('accessibilityLabel="Active debt APR"'));
  assert.ok(routesSource.includes('accessibilityLabel="Active debt monthly payment"'));
  assert.ok(routesSource.includes('accessibilityLabel="Active debt term months"'));
  assert.ok(
    routesSource.includes('function finiteNonNegativeInputValue(value: number): number'),
    'expected native numeric inputs to sanitize non-finite display values'
  );
  assert.ok(routesSource.includes('value={formatMoneyInputValue(value)}'), 'expected money inputs to use finite display formatting');
  assert.ok(
    routesSource.includes('value={formatWholeNumberInputValue(value)}'),
    'expected whole-number inputs to use finite display formatting'
  );
  assert.ok(
    routesSource.includes('value={formatPercentageInputValue(value)}'),
    'expected percentage inputs to use finite display formatting'
  );
  assert.ok(
    routesSource.includes('Math.round(finiteNonNegativeInputValue(value) * 10000) / 100'),
    'expected APR input to preserve two decimal display precision after sanitizing'
  );
  assert.ok(
    !routesSource.includes('value={String(Math.round(value))}') &&
      !routesSource.includes('value={String(value)}') &&
      !routesSource.includes('value={String(Math.round(value * 10000) / 100)}'),
    'expected native inputs not to render raw numeric state directly'
  );
  assert.ok(routesSource.includes('buildMobileCockpitSnapshot'));
  assert.ok(routesSource.includes('CockpitRoute'));
  assert.ok(routesSource.includes('buildMobileSimulatorSnapshot'));
  assert.ok(routesSource.includes('SimulatorStrategyPanel'));
  assert.ok(routesSource.includes('buildMobileVaultSnapshot'));
  assert.ok(!routesSource.includes('until scenarios are editable'));
  assert.ok(routesSource.includes('buildMobileLearnSnapshot'));
  assert.ok(!routesSource.includes('const lessons = ['));
  assert.ok(assumptionsProviderSource.includes('usePersistedMobileAssumptions'));
  assert.ok(!routesSource.includes('usePersistedMobileAssumptions'));
  assert.ok(routesSource.includes('StorageStatusCard'));
  assert.ok(routesSource.includes('SettingsPanel'), 'expected mobile Settings route to render native readiness status');
  assert.ok(routesSource.includes('testID="settings-backend-readiness"'), 'expected mobile Settings backend readiness smoke hook');
  assert.ok(routesSource.includes('testID="settings-reset-mobile-assumptions"'), 'expected mobile Settings reset smoke hook');
  assert.ok(
    routesSource.includes('testID="settings-reset-mobile-assumptions-status"'),
    'expected mobile Settings reset status smoke hook'
  );
  assert.ok(routesSource.includes('Reset Starter Assumptions'), 'expected mobile Settings to expose a reset action');
  assert.ok(routesSource.includes('resetAssumptions()'), 'expected mobile Settings reset to use the persisted assumptions hook');
  assert.ok(routesSource.includes("Reset could not save locally"), 'expected mobile Settings reset to expose save-failure feedback');
  assert.ok(routesSource.includes('mobileBackendReadinessOptions'), 'expected mobile Settings to list backend candidates explicitly');
  assert.ok(
    routesSource.includes('six-collection schema plus RLS policy review'),
    'expected mobile Supabase readiness to match the six-collection backend contract'
  );
  assert.ok(
    routesSource.includes('explicit report export, download, and deletion') &&
      routesSource.includes('dedicated R2 buckets and deployed owner-isolation smoke'),
    'expected mobile Cloudflare readiness to match the report-only private R2 gate'
  );
  assert.ok(routesSource.includes('MobileMoneyLoopOrbit'), 'expected dashboard to render the native payoff orbit');
  assert.ok(routesSource.includes('testID="mobile-payoff-orbit"'), 'expected mobile payoff orbit smoke hook');
  assert.ok(routesSource.includes('MobileMoneyLoopPressureStrip'), 'expected dashboard to render the native pressure strip');
  assert.ok(routesSource.includes('testID="mobile-money-loop-pressure"'), 'expected mobile pressure strip smoke hook');
  assert.ok(!routesSource.includes('savings claim'), 'expected mobile simulator copy to avoid savings-claim framing');
  assert.ok(
    routesSource.includes('before any modeled payoff difference is shown'),
    'expected mobile simulator copy to frame payoff deltas as modeled differences'
  );
  assert.ok(
    routesSource.includes('testID={`mobile-money-loop-pressure-segment-${loopNodeId(step.label)}`}'),
    'expected one pressure segment per shared Money Loop step'
  );
  assert.ok(routesSource.includes('accessibilityRole="progressbar"'), 'expected pressure segments to expose progress values');
  assert.ok(
    routesSource.includes('width: `${pressurePercent}%`'),
    'expected pressure segment width to be model-bound'
  );
  assert.ok(routesSource.includes('MobilePortfolioPath'), 'expected Portfolio mode to render the native payoff path');
  assert.ok(routesSource.includes('testID="mobile-portfolio-payoff-path"'), 'expected mobile Portfolio payoff path smoke hook');
  assert.ok(
    routesSource.includes('testID={`mobile-portfolio-payoff-path-node-${index}`}'),
    'expected mobile Portfolio payoff path to render one node per engine point'
  );
  assert.ok(routesSource.includes('accessibilityRole="radiogroup"'), 'expected mobile payoff orbit to group one active node');
  assert.ok(
    routesSource.includes('testID={`mobile-payoff-orbit-node-${loopNodeId(step.label)}`}'),
    'expected one selectable orbit node per shared Money Loop step'
  );
  assert.ok(
    routesSource.includes('accessibilityRole="radio"'),
    'expected orbit nodes to expose a single-choice role'
  );
  assert.ok(
    routesSource.includes('accessibilityState={{ checked: isActive, selected: isActive }}'),
    'expected active mobile orbit nodes to expose checked and selected state'
  );
  assert.ok(routesSource.includes('aria-checked={isActive}'), 'expected mobile web export to expose checked state');
  assert.ok(routesSource.includes('aria-selected={isActive}'), 'expected mobile web export to expose selected state');
  assert.equal(typeof sharedEngine.buildMobileCockpitSnapshot, 'function');
  assert.equal(typeof sharedEngine.buildMobilePortfolioSnapshot, 'function');
  assert.equal(typeof sharedEngine.buildMobileSimulatorSnapshot, 'function');
  assert.equal(typeof sharedEngine.buildMobileVaultSnapshot, 'function');
  assert.equal(typeof sharedEngine.buildMobileLearnSnapshot, 'function');
  assert.ok(
    !fs.existsSync(path.join(repoRoot, 'apps/mobile/app/(tabs)/_layout.tsx')),
    'expected static-export shell not to rely on tab route hydration'
  );
});

test('Expo mobile app exposes direct route parity for every demo mode', () => {
  const layoutSource = fs.readFileSync(path.join(repoRoot, 'apps/mobile/app/_layout.tsx'), 'utf8');
  const routeFrameSource = fs.readFileSync(
    path.join(repoRoot, 'apps/mobile/components/mobile-routes/route-screen.tsx'),
    'utf8'
  );
  const routeExpectations = [
    ['index.tsx', 'DashboardRoute', 'dashboard-route.tsx', ['buildMobileDashboardSnapshot'], 'index', 'InterestShield'],
    ['simulator.tsx', 'SimulatorRoute', 'simulator-route.tsx', ['buildMobileDashboardSnapshot', 'buildMobileSimulatorSnapshot'], 'simulator', 'Simulator'],
    ['cockpit.tsx', 'CockpitRoute', 'cockpit-route.tsx', ['buildMobileCockpitSnapshot'], 'cockpit', 'Cockpit'],
    ['portfolio.tsx', 'PortfolioRoute', 'portfolio-route.tsx', ['buildMobilePortfolioSnapshot'], 'portfolio', 'Portfolio'],
    ['learn.tsx', 'LearnRoute', 'learn-route.tsx', ['buildMobileLearnSnapshot'], 'learn', 'Learn'],
    ['vault.tsx', 'VaultRoute', 'vault-route.tsx', ['buildMobileVaultSnapshot'], 'vault', 'Vault'],
    ['settings.tsx', 'SettingsRoute', 'settings-route.tsx', [], 'settings', 'Settings'],
  ];

  assert.ok(routeFrameSource.includes("import { useRouter, type Href } from 'expo-router'"));
  assert.ok(routeFrameSource.includes("type Href"), 'expected mobile navigation to use Expo Href at the route boundary');
  assert.ok(routeFrameSource.includes('modeRoutes'));
  assert.ok(routeFrameSource.includes('router.push(modeRoutes[nextMode] as Href)'));

  for (const [filename, component, moduleName, expectedBuilders, routeName, title] of routeExpectations) {
    const routeFile = path.join(repoRoot, 'apps/mobile/app', filename);
    assert.ok(fs.existsSync(routeFile), `expected direct Expo route file ${filename}`);
    const routeSource = fs.readFileSync(routeFile, 'utf8');
    assert.ok(
      routeSource.includes(`<${component} />`),
      `expected ${filename} to render its dedicated ${component}`
    );
    const moduleImport = moduleName.replace(/\.tsx$/, '');
    assert.ok(
      routeSource.includes(`from '@/components/mobile-routes/${moduleImport}'`),
      `expected ${filename} to import ${moduleImport} directly`
    );
    const moduleSource = fs.readFileSync(
      path.join(repoRoot, 'apps/mobile/components/mobile-routes', moduleName),
      'utf8'
    );
    const expectedMode = routeName === 'index' ? 'dashboard' : routeName;
    assert.ok(
      moduleSource.includes(`mode="${expectedMode}"`),
      `expected ${moduleName} content identity to remain fixed to ${expectedMode}`
    );
    for (const builder of expectedBuilders) {
      assert.ok(moduleSource.includes(builder), `expected ${moduleName} to own ${builder}`);
    }
    for (const otherBuilder of [
      'buildMobileDashboardSnapshot',
      'buildMobileSimulatorSnapshot',
      'buildMobileCockpitSnapshot',
      'buildMobilePortfolioSnapshot',
      'buildMobileLearnSnapshot',
      'buildMobileVaultSnapshot',
    ]) {
      if (!expectedBuilders.includes(otherBuilder)) {
        assert.ok(!moduleSource.includes(otherBuilder), `expected ${moduleName} not to import ${otherBuilder}`);
      }
    }
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
  assert.equal(snapshot.payoffPath.isProjected, true);
  assert.equal(snapshot.payoffPath.statusLabel, 'Projected path');
  assert.equal(snapshot.payoffPath.startingBalanceLabel, '$18,450');
  assert.equal(snapshot.payoffPath.progressPercent, 100);
  assert.ok(snapshot.payoffPath.payoffMonthsLabel.endsWith('mo'));
  assert.ok(snapshot.payoffPath.totalInterestLabel.startsWith('$'));
  assert.ok(snapshot.payoffPath.points.length <= 7, 'expected bounded native payoff path points');
  assert.equal(snapshot.payoffPath.points[0].month, 0);
  assert.equal(snapshot.payoffPath.points[snapshot.payoffPath.points.length - 1].progressPercent, 100);
});

test('shared mobile portfolio payoff path stays in review mode when inputs are unsafe', () => {
  const sharedEngine = loadTsFile(path.join(repoRoot, 'packages/financial-engine/src/index.ts'));
  const snapshot = sharedEngine.buildMobilePortfolioSnapshot({
    monthlyIncome: 4000,
    monthlyExpenses: 4200,
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

  assert.equal(snapshot.payoffPath.isProjected, false);
  assert.equal(snapshot.payoffPath.statusLabel, 'Review inputs');
  assert.equal(snapshot.payoffPath.payoffMonthsLabel, 'Review inputs');
  assert.equal(snapshot.payoffPath.totalInterestLabel, 'Not projected');
  assert.equal(snapshot.payoffPath.points.length, 1);
  assert.equal(snapshot.payoffPath.points[0].progressPercent, 0);
});

test('shared mobile portfolio payoff path delegates to the canonical amortized helper', () => {
  const sharedEnginePath = path.join(repoRoot, 'packages/financial-engine/src/index.ts');
  const sharedEngine = loadTsFile(sharedEnginePath);
  const sharedEngineSource = fs.readFileSync(sharedEnginePath, 'utf8');
  const pathStart = sharedEngineSource.indexOf('function buildMobilePortfolioPathSnapshot');
  const pathEnd = sharedEngineSource.indexOf('function simulateMobileMoneyLoopPayoff', pathStart);
  const pathSource = sharedEngineSource.slice(pathStart, pathEnd);
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
  const extraPayment = Math.max(0, input.monthlyIncome - input.monthlyExpenses - input.activeDebt.monthlyPayment);
  const canonical = sharedEngine.simulateAmortizedPayoff({
    principalBalance: input.activeDebt.balance,
    apr: input.activeDebt.apr,
    monthlyPayment: input.activeDebt.monthlyPayment,
    extraPayment,
    maxMonths: 600,
  });
  const snapshot = sharedEngine.buildMobilePortfolioSnapshot(input);
  const payoffPath = snapshot.payoffPath;
  const finalPoint = payoffPath.points[payoffPath.points.length - 1];

  assert.ok(pathSource.includes('simulateAmortizedPayoff({'), 'expected mobile Portfolio payoff path to call the shared helper');
  assert.ok(!pathSource.includes('while (balance'), 'expected mobile Portfolio payoff path not to duplicate an amortized payoff loop');
  assert.equal(payoffPath.isProjected, canonical.isPayoffPossible);
  assert.equal(payoffPath.payoffMonthsLabel, `${canonical.payoffMonths} mo`);
  assert.equal(payoffPath.totalInterestLabel, sharedEngine.formatCurrency(canonical.totalInterest));
  assert.ok(finalPoint, 'expected sampled payoff path to include a final point');
  assert.equal(finalPoint.month, canonical.payoffMonths);
  assert.equal(finalPoint.balance.toFixed(2), canonical.monthlyData.at(-1).balance.toFixed(2));
  assert.equal(finalPoint.progressPercent, 100);
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
  assert.equal(snapshot.velocity.interestSavedLabel.includes('modeled interest difference'), true);
  assert.equal(snapshot.velocity.interestSavedLabel.startsWith('Saves $'), false);
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

test('shared mobile simulator snapshot treats a missing LOC limit as setup needed instead of over-limit', () => {
  const sharedEngine = loadTsFile(path.join(repoRoot, 'packages/financial-engine/src/index.ts'));
  const dashboard = sharedEngine.buildMobileDashboardSnapshot({
    ...sharedEngine.defaultMobileDashboardInput,
    loc: {
      limit: 0,
      apr: 0.085,
      balance: 0,
    },
  });
  const snapshot = sharedEngine.buildMobileSimulatorSnapshot({
    ...sharedEngine.defaultMobileDashboardInput,
    loc: {
      limit: 0,
      apr: 0.085,
      balance: 0,
    },
  });
  const velocity = snapshot.strategies.find((strategy) => strategy.name === 'Velocity');

  assert.equal(dashboard.nextMove, 'Enter known LOC terms');
  assert.equal(dashboard.warning, 'Enter known LOC limit, APR, fees, and draw rules before trusting velocity chunk projections.');
  assert.equal(dashboard.loop.find((step) => step.label === 'LOC').value, 'Enter LOC terms');
  assert.equal(
    dashboard.loop.find((step) => step.label === 'LOC').detail,
    'LOC capacity needs known terms before chunk projections are meaningful.'
  );
  assert.equal(snapshot.guardrail, 'Enter known LOC terms before trusting velocity payoff projections.');
  assert.equal(snapshot.velocity.interestSavedLabel, 'Not projected');
  assert.equal(snapshot.velocity.monthsSavedLabel, 'Review inputs');
  assert.equal(velocity.isPayoffPossible, false);
  assert.equal(velocity.monthsLabel, 'Review inputs');
  assert.equal(velocity.interestLabel, 'Not projected');
  assert.equal(velocity.statusLabel, 'Enter LOC terms');
});

test('shared mobile simulator snapshot treats a full LOC as no available room instead of over-limit', () => {
  const sharedEngine = loadTsFile(path.join(repoRoot, 'packages/financial-engine/src/index.ts'));
  const input = {
    ...sharedEngine.defaultMobileDashboardInput,
    loc: {
      limit: 10000,
      apr: 0.085,
      balance: 10000,
    },
  };
  const dashboard = sharedEngine.buildMobileDashboardSnapshot(input);
  const portfolio = sharedEngine.buildMobilePortfolioSnapshot(input);
  const snapshot = sharedEngine.buildMobileSimulatorSnapshot(input);
  const vault = sharedEngine.buildMobileVaultSnapshot(input);
  const learn = sharedEngine.buildMobileLearnSnapshot(input);
  const cockpit = sharedEngine.buildMobileCockpitSnapshot(input);
  const velocity = snapshot.strategies.find((strategy) => strategy.name === 'Velocity');
  const noCapacityWarning = 'LOC balance is at the entered limit. Pay it down before modeling another chunk.';

  assert.equal(dashboard.warning, noCapacityWarning);
  assert.equal(dashboard.nextMove, 'Create LOC room');
  assert.equal(dashboard.loop.find((step) => step.label === 'LOC').value, '$0 open');
  assert.equal(portfolio.guardrail, noCapacityWarning);
  assert.equal(portfolio.payoffPath.statusLabel, 'Review inputs');
  assert.equal(snapshot.guardrail, noCapacityWarning);
  assert.equal(snapshot.velocity.interestSavedLabel, 'Not projected');
  assert.equal(snapshot.velocity.monthsSavedLabel, 'Review inputs');
  assert.equal(velocity.isPayoffPossible, false);
  assert.equal(velocity.monthsLabel, 'Review inputs');
  assert.equal(velocity.interestLabel, 'Not projected');
  assert.equal(velocity.statusLabel, 'No LOC room');
  assert.equal(vault.guardrail, noCapacityWarning);
  assert.equal(learn.guardrail, noCapacityWarning);
  assert.equal(
    learn.lessons.find((lesson) => lesson.title === 'LOC Room').detail,
    'The LOC is at the limit, so create room before modeling another chunk.'
  );
  assert.equal(cockpit.warning, noCapacityWarning);
  assert.equal(cockpit.flightStatusLabel, 'Review inputs');
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
  assert.ok(hookSource.includes('loadMobileAssumptionsForOwner'));
  assert.ok(hookSource.includes('saveMobileAssumptionsForOwner'));
  assert.ok(hookSource.includes('ownerId'));
  assert.ok(hookSource.includes('authReady'));
  assert.ok(hookSource.includes('isHydrated'));
  assert.ok(hookSource.includes('setLoadedScope(scope)'), 'expected storage failures to enter session-only hydrated mode');
  assert.ok(hookSource.includes('updateAssumptions'), 'expected assumption edits to use a guarded update action');
  assert.ok(hookSource.includes('activeScope.current !== scope'), 'expected stale owner-scope edits to be rejected');
  assert.ok(hookSource.includes('lastPersistedInput'), 'expected restored and explicitly saved inputs not to be written twice');
  assert.ok(hookSource.includes('canPersist'), 'expected persistence availability to remain separate from display status');
  assert.ok(hookSource.includes('saveVersion'), 'expected only the newest queued write to control persistence status');
  assert.ok(hookSource.includes("throw new Error('Mobile assumptions are still loading for this account.')"));
  assert.ok(hookSource.includes('resetAssumptions'), 'expected Settings to reset assumptions through the persistence hook');
  assert.ok(hookSource.includes('cloneDefaultMobileInput'), 'expected reset to clone the starter assumptions');

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
  const ownerA = '00000000-0000-4000-8000-00000000000a';
  const ownerB = '00000000-0000-4000-8000-00000000000b';
  const ownerEncoded = storageModule.encodeMobileAssumptions(decoded, '2026-07-13T00:00:00.000Z', ownerA);

  assert.equal(storageModule.MOBILE_ASSUMPTIONS_STORAGE_KEY, 'interestshield.mobile.assumptions.v1');
  assert.equal(decoded.monthlyIncome, 8123);
  assert.equal(decoded.monthlyExpenses, 4321);
  assert.equal(decoded.chunkAmount, 987);
  assert.equal(storageModule.decodeMobileAssumptions('{bad json'), null);
  assert.equal(storageModule.decodeMobileAssumptions(JSON.stringify({ version: 1, input: { monthlyIncome: -1 } })), null);
  assert.notEqual(storageModule.mobileAssumptionsStorageKey(ownerA), storageModule.mobileAssumptionsStorageKey(ownerB));
  assert.equal(storageModule.decodeMobileAssumptions(ownerEncoded, ownerB), null);
  assert.equal(storageModule.decodeMobileAssumptions(ownerEncoded, ownerA).monthlyIncome, 8123);
  assert.equal(storageModule.decodeMobileAssumptions(encoded, ownerA), null, 'expected guest data not to enter an owner scope implicitly');
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
  assert.equal(
    snapshot.flightChecks.find((check) => check.label === 'LOC capacity loaded').detail,
    'Enter known LOC terms before trusting chunk movement.'
  );
  assert.equal(
    snapshot.flightChecks.find((check) => check.label === 'Utilization under 80%').detail,
    'Utilization needs known LOC terms.'
  );
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
  assert.ok(vault.interestFreedLabel.includes('modeled interest difference'));
  assert.equal(vault.interestFreedLabel.startsWith('Saves $'), false);
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

test('shared mobile learn snapshot teaches from current Money Loop inputs', () => {
  const sharedEngine = loadTsFile(path.join(repoRoot, 'packages/financial-engine/src/index.ts'));
  const learn = sharedEngine.buildMobileLearnSnapshot({
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

  assert.equal(learn.guardrail, null);
  assert.equal(learn.lessons.length, 4);
  assert.ok(learn.lessons.find((lesson) => lesson.title === 'Money Loop').detail.includes('Credit Card'));
  assert.equal(learn.lessons.find((lesson) => lesson.title === 'Cash Flow').value, '$1,500/mo');
  assert.equal(learn.lessons.find((lesson) => lesson.title === 'LOC Room').value, '$21,800 open');
  assert.ok(learn.lessons.find((lesson) => lesson.title === 'Interest Visibility').value.endsWith('/day'));

  const unsafeLearn = sharedEngine.buildMobileLearnSnapshot({
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

  assert.ok(unsafeLearn.guardrail.includes('Income needs to exceed expenses'));
  assert.ok(unsafeLearn.lessons.find((lesson) => lesson.title === 'Cash Flow').detail.includes('learning mode'));
});

if (process.exitCode) {
  console.error('Mobile port contract failed.');
  process.exit(process.exitCode);
}

console.log('Mobile port contract passed.');
