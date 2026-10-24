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
      '@/stores/portfolio-store': { usePortfolioStore: { getState: () => { throw Error('Link rendering must not read the Portfolio book'); } },
        portfolioPersistence: { getStatus: () => { throw Error('Link rendering must not read Portfolio persistence'); } } },
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
  // Execute the real component callback and real formatter with fixed hooks, stores and timers; no browser.
  const qa = { exports: {} };
  vm.runInNewContext(ts.transpileModule(read('src/data/shield-guardian-qa.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
    { module: qa, exports: qa.exports, Math: Object.assign(Object.create(Math), { random: () => 0 }) });
  function guardianFixture(pathname, query = '', teacherMode = true) {
    const state = [], timers = [], calls = [], mod = { exports: {} }, Icon = () => null;
    let cursor = 0, reads = 0;
    const current = { pathname, query, status: 'ready', book: { monthlyIncome: 2500, monthlyExpenses: 1550 } };
    const legacy = { monthlyIncome: 8200, monthlyExpenses: 4700, activeDomain: 'car' };
    const imports = {
      react: { ...React, useState: initial => { const i = cursor++; if (!(i in state)) state[i] = initial;
        return [state[i], next => { state[i] = typeof next === 'function' ? next(state[i]) : next; }]; }, useCallback: fn => fn },
      'react/jsx-runtime': runtime, 'next/link': { __esModule: true, default: Icon }, 'next/image': { __esModule: true, default: Icon },
      'next/navigation': { usePathname: () => current.pathname, useSearchParams: () => new URLSearchParams(current.query) },
      'lucide-react': new Proxy({}, { get: () => Icon }), '@/hooks/useIsClient': { useIsClient: () => true },
      '@/stores/theme-store': { useThemeStore: () => ({ theme: 'original' }), themeClasses: { original: {} } },
      '@/stores/financial-store': { useFinancialStore: () => legacy }, '@/stores/preferences-store': { usePreferencesStore: () => ({ teacherMode }) },
      '@/stores/portfolio-store': { usePortfolioStore: { getState: () => { reads++; return current.book; } },
        portfolioPersistence: { getStatus: () => ({ status: current.status }) } },
      '@/data/shield-guardian-qa': { getGuardianResponse: (input, options) => { calls.push({ input, options }); return qa.exports.getGuardianResponse(input, options); } },
    };
    vm.runInNewContext(code, { module: mod, exports: mod.exports, require: id => { assert.ok(id in imports, id); return imports[id]; },
      setTimeout: (run, delay) => timers.push({ run, delay }) });
    const tree = () => { cursor = 0; return mod.exports.default().props.children.type(); };
    const find = (node, label) => Array.isArray(node) ? node.map(child => find(child, label)).find(Boolean)
      : node?.props && (node.props['aria-label'] === label ? node : find(node.props.children, label));
    return { current, legacy, calls, timers, reads: () => reads, tree, reply: () => state.find(Array.isArray).at(-1),
      submit(input = 'cash flow') { find(tree(), 'Open Velocity Guardian').props.onClick();
        find(tree(), 'Ask Velocity Guardian a question').props.onChange({ target: { value: input } }); find(tree(), 'Send question').props.onClick(); },
      flush() { assert.equal(timers.length, 1); assert.equal(timers[0].delay, 300); assert.equal(calls.length, 0); timers.shift().run(); } };
  }
  for (const [route, query] of [['/portfolio', 'scenario=unknown'], ['/', 'scenario=portfolio'], ['/simulator', 'scenario=portfolio']]) {
    test('Guardian teacher uses the actual shared book ' + route, () => {
      const f = guardianFixture(route, query); f.submit(); f.flush();
      assert.equal(f.calls[0].options.context.cashFlow, 950); assert.equal(f.calls[0].options.context.monthlyIncome, 2500);
      assert.equal(f.calls[0].options.context.monthlyExpenses, 1550); assert.match(f.reply().text, /\$950 \/ month/);
      assert.doesNotMatch(f.reply().text, /3,500/); assert.equal(f.reply().source, 'Shared portfolio at question time');
      assert.ok(JSON.stringify(f.tree()).includes(f.reply().source));
    });
  }
  test('Guardian keeps bare, unknown, case, first-query and unsupported routes legacy', () => {
    for (const [route, query] of [['/', ''], ['/simulator', ''], ['/', 'scenario=unknown'], ['/simulator', 'scenario=Portfolio'],
      ['/', 'scenario=x&scenario=portfolio'], ['/cockpit', 'scenario=portfolio'], ['/vault', 'scenario=portfolio'], ['/unknown', 'scenario=portfolio']]) {
      const f = guardianFixture(route, query); f.submit(); f.flush();
      assert.equal(f.calls[0].options.context.cashFlow, 3500); assert.equal(f.calls[0].options.context.activeDomainLabel, 'car');
      assert.match(f.reply().text, /\$3,500 \/ month/); assert.equal(f.reads(), 0);
    }
  });
  test('Guardian unavailable or nonfinite shared data never borrows legacy personalization', () => {
    for (const patch of [{ status: 'error' }, { status: 'unavailable' }, { status: 'unknown' }, { book: { monthlyIncome: NaN, monthlyExpenses: 1550 } },
      { book: { monthlyIncome: 2500, monthlyExpenses: Infinity } }, { book: { monthlyIncome: Number.MAX_VALUE, monthlyExpenses: -Number.MAX_VALUE } }]) {
      const f = guardianFixture('/portfolio'); Object.assign(f.current, patch); f.submit(); f.flush();
      assert.equal(f.calls[0].options.context, undefined); assert.doesNotMatch(f.reply().text, /Your current cash flow estimate/);
      assert.equal(f.reply().source, 'Shared portfolio unavailable at question time');
    }
  });
  for (const shared of [false, true]) test('Guardian snapshots question context across a delayed route change ' + shared, () => {
    const f = guardianFixture(shared ? '/portfolio' : '/'); f.submit();
    f.current.pathname = shared ? '/' : '/portfolio'; f.current.book.monthlyIncome = 9000; f.legacy.monthlyIncome = 9900; f.tree(); f.flush();
    assert.equal(f.calls[0].options.context.cashFlow, shared ? 950 : 3500);
    assert.equal(f.reply().source, shared ? 'Shared portfolio at question time' : 'Single-target demo at question time');
  });
  test('Guardian reads current shared input at submit and preserves zero and negative dollar amounts', () => {
    for (const income of [1550, 1450, 1550.25]) {
      const f = guardianFixture('/portfolio'); f.tree(); f.current.book = { monthlyIncome: income, monthlyExpenses: 1550 };
      f.submit(); f.flush(); assert.equal(f.calls[0].options.context.cashFlow, income - 1550);
    }
  });
  test('Guardian teacher-off answers and query classification remain the real formatter output', () => {
    for (const [route, query] of [['/portfolio', ''], ['/', 'scenario=portfolio'], ['/simulator', 'scenario=portfolio'], ['/', '']]) {
      for (const input of ['cash flow', 'get started', 'chunk', 'LOC', 'interest', 'medical repair', 'dashboard', 'hello', '?']) {
        const f = guardianFixture(route, query, false); f.submit(input); f.flush();
        assert.equal(f.reply().text, qa.exports.getGuardianResponse(input, { teacherMode: false })); assert.equal(f.reply().source, undefined); assert.equal(f.reads(), 0);
      }
    }
  });
  test('Guardian blank questions remain inert', () => {
    const f = guardianFixture('/portfolio'); f.submit('   '); assert.equal(f.timers.length, 0); assert.equal(f.calls.length, 0); assert.equal(f.reads(), 0);
  });
}
module.exports = { registerPortfolioNavigationTests };
