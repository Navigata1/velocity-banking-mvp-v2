/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ts = require('typescript'), React = require('react'), runtime = require('react/jsx-runtime');
const { renderToStaticMarkup } = require('react-dom/server');

function registerPortfolioNavigationTests({ test, webRoot = path.resolve(__dirname, '..'), source }) {
  const read = file => fs.readFileSync(path.resolve(webRoot, file), 'utf8');
  source = source ?? read('src/components/Navigation.tsx');
  const parse = text => ts.createSourceFile('source.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function nodes(tree, predicate) {
    const found = []; function walk(n) { if (predicate(n)) found.push(n); ts.forEachChild(n, walk); } walk(tree); return found;
  }
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  function render(pathname, query = '', pending = false) {
    const links = [], mod = { exports: {} }, Icon = () => null;
    const Link = props => { links.push(props); return React.createElement('a', props, props.children); };
    const element = create => (type, props, key) => create(type, type === 'style' ? { ...props, jsx: undefined } : props, key);
    const imports = {
      react: React, 'react/jsx-runtime': { ...runtime, jsx: element(runtime.jsx), jsxs: element(runtime.jsxs) },
      'next/link': { __esModule: true, default: Link }, 'next/image': { __esModule: true, default: Icon },
      'next/navigation': { usePathname: () => pathname, useSearchParams: () => { if (pending) throw new Promise(() => {}); return new URLSearchParams(query); } },
      'lucide-react': new Proxy({}, { get: () => Icon }), '@/hooks/useIsClient': { useIsClient: () => true },
      '@/stores/theme-store': { useThemeStore: () => ({ theme: 'original' }), themeClasses: { original: {} } },
      '@/stores/financial-store': { useFinancialStore: () => ({ monthlyIncome: 0, monthlyExpenses: 0, activeDomain: 'car' }) },
      '@/stores/preferences-store': { usePreferencesStore: () => ({ teacherMode: false }) },
      '@/data/shield-guardian-qa': { getGuardianResponse: () => { throw Error('Guardian must not run in navigation tests'); } },
    };
    vm.runInNewContext(code, { module: mod, exports: mod.exports, require: id => { assert.ok(id in imports, id); return imports[id]; } });
    return { html: renderToStaticMarkup(React.createElement(mod.exports.default)), links };
  }
  const primary = (view, label) => view.links.find(link => link['aria-label'] === label);
  for (const [pathname, query] of [['/portfolio', ''], ['/', 'scenario=portfolio'], ['/simulator', 'scenario=portfolio']]) {
    for (const [label, href] of [['Dashboard', '/?scenario=portfolio'], ['Simulator', '/simulator?scenario=portfolio']]) {
      test(`Portfolio primary ${pathname}?${query} -> ${label}`, () => {
        const view = render(pathname, query); assert.equal(primary(view, label).href, href); assert.ok(view.html.includes(`href="${href}"`));
      });
    }
  }
  test('primary navigation keeps default, first-query, unsupported and explicit Portfolio semantics', () => {
    for (const [pathname, query] of [
      ['/', ''], ['/simulator', 'scenario=Portfolio'], ['/', 'scenario=x&scenario=portfolio'],
      ['/cockpit', 'scenario=portfolio'], ['/vault', 'scenario=portfolio'],
    ]) {
      const view = render(pathname, query); assert.equal(primary(view, 'Dashboard').href, '/'); assert.equal(primary(view, 'Simulator').href, '/simulator');
    }
    assert.equal(primary(render('/portfolio', 'scenario=x'), 'Dashboard').href, '/?scenario=portfolio');
  });
  test('resolved href does not change bare-path active state or unsupported destinations', () => {
    for (const [pathname, label] of [['/', 'Dashboard'], ['/simulator', 'Simulator'], ['/portfolio', 'Portfolio']]) {
      const view = render(pathname, 'scenario=portfolio'); assert.equal(primary(view, label)['aria-current'], 'page');
      assert.match(primary(view, label).className, /border-emerald-400/);
      for (const [name, href] of [['Portfolio', '/portfolio'], ['Cockpit', '/cockpit'], ['Wealth Timeline', '/vault']]) assert.equal(primary(view, name).href, href);
    }
  });
  test('pending query renders stable noninteractive local Suspense fallback', () => {
    const view = render('/', 'scenario=portfolio', true); assert.equal(view.links.length, 0);
    assert.match(view.html, /aria-busy="true"/); assert.doesNotMatch(view.html, /<(?:a|button)\b/);
    for (const token of ['h-[65px]', 'md:h-screen', 'md:w-56', 'fixed', 'md:sticky']) assert.ok(view.html.includes(token), token);
  });
  // Retain the prior19 source controls; no financial module or operational runner executes.
  const selectors = Object.fromEntries([['/', 'src/app/page.tsx'], ['/simulator', 'src/app/simulator/page.tsx']].map(([route, file]) => {
    const tree = parse(read(file)), branch = nodes(tree, ts.isConditionalExpression).find(n => n.whenTrue.getText(tree).includes('Portfolio'));
    return [route, query => vm.runInNewContext(branch.condition.getText(tree), { params: new URLSearchParams(query) })];
  }));
  const owner = href => { const u = new URL(href, 'https://fixture.invalid'); return u.pathname === '/portfolio' || !!selectors[u.pathname]?.(u.search); };
  for (const [href, expected] of [
    ['/', false], ['/?scenario=portfolio', true], ['/portfolio', true], ['/simulator', false],
    ['/simulator?scenario=portfolio', true], ['/?scenario=Portfolio', false],
    ['/simulator?scenario=unknown', false], ['/cockpit?scenario=portfolio', false], ['/vault?scenario=portfolio', false],
  ]) {
    test('source selector ' + href, () => assert.equal(owner(href), expected));
  }
  const views = [
    ['src/app/portfolio/page.tsx', ['/?scenario=portfolio', '/simulator?scenario=portfolio']],
    ['src/app/PortfolioDashboard.tsx', ['/simulator?scenario=portfolio', '/portfolio']],
    ['src/app/simulator/PortfolioSimulator.tsx', ['/?scenario=portfolio', '/portfolio']],
  ];
  for (const [file, hrefs] of views) for (const href of hrefs) test('existing canonical link ' + file + ' -> ' + href, () => {
    const tree = parse(read(file)); assert.ok(nodes(tree, n => ts.isJsxAttribute(n) && n.name.getText(tree) === 'href' && n.initializer?.text === href).length); assert.equal(owner(href), true);
  });
  for (const [file, href] of [['src/app/PortfolioDashboard.tsx', '/'], ['src/app/simulator/PortfolioSimulator.tsx', '/simulator']]) test('explicit demo exit ' + file, () => {
    const tree = parse(read(file)); assert.ok(nodes(tree, n => ts.isJsxElement(n) && n.children.some(c => ts.isJsxText(c) && c.text.trim() === 'Single-target demo')).some(n => n.openingElement.attributes.properties.some(p => p.name?.getText(tree) === 'href' && p.initializer?.text === href)));
  });
  test('shared Navigation remains mounted in the unchanged layout', () => {
    const tree = parse(read('src/app/layout.tsx')); assert.equal(nodes(tree, n => ts.isJsxSelfClosingElement(n) && n.tagName.getText(tree) === 'Navigation').length, 1);
  });
  test('Expo retains explicit separate routes, not canonical query adoption', () => {
    const tree = parse(read('../mobile/components/mobile-shell/navigation.tsx')), routes = nodes(tree, n => ts.isVariableDeclaration(n) && n.name.getText(tree) === 'modeRoutes')[0].initializer;
    assert.deepEqual(Object.fromEntries(routes.properties.map(p => [p.name.getText(tree), p.initializer.text])), { dashboard: '/', simulator: '/simulator', cockpit: '/cockpit', portfolio: '/portfolio', learn: '/learn', vault: '/vault', settings: '/settings' });
  });
}
module.exports = { registerPortfolioNavigationTests };
