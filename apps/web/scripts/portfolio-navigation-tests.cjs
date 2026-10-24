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
    const state = [], refs = [], effects = [], pending = [], elements = new Map(), listeners = new Set(), timers = [], calls = [], mod = { exports: {} }, Icon = () => null;
    let cursor = 0, refCursor = 0, effectCursor = 0, reads = 0, controls = [];
    const document = { activeElement: null, addEventListener: (type, fn) => { assert.equal(type, 'keydown'); listeners.add(fn); },
      removeEventListener: (type, fn) => { assert.equal(type, 'keydown'); listeners.delete(fn); } };
    const element = id => { if (!elements.has(id)) elements.set(id, { id, isConnected: true, offsetParent: {}, focus() { document.activeElement = this; },
      querySelectorAll: () => controls.filter(control => !control.disabled) }); return elements.get(id); };
    const current = { pathname, query, status: 'ready', book: { monthlyIncome: 2500, monthlyExpenses: 1550 } };
    const legacy = { monthlyIncome: 8200, monthlyExpenses: 4700, activeDomain: 'car' };
    const imports = {
      react: { ...React, useState: initial => { const i = cursor++; if (!(i in state)) state[i] = initial;
        return [state[i], next => { state[i] = typeof next === 'function' ? next(state[i]) : next; }]; }, useCallback: fn => fn,
        useRef: initial => { const i = refCursor++; return refs[i] ??= { current: initial }; },
        useEffect: (run, deps) => { const i = effectCursor++, old = effects[i];
          if (!old || deps.some((dep, n) => !Object.is(dep, old.deps[n]))) pending.push(() => { old?.cleanup?.(); effects[i] = { deps, cleanup: run() }; }); } },
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
      document, setTimeout: (run, delay) => timers.push({ run, delay }) });
    const walk = (node, visit) => { if (Array.isArray(node)) node.forEach(child => walk(child, visit));
      else if (node?.props) { visit(node); walk(node.props.children, visit); } };
    const tree = () => { cursor = refCursor = effectCursor = 0; pending.length = 0;
      const result = mod.exports.default().props.children.type(); let trigger = 0; controls = [];
      walk(result, node => { const p = node.props, id = p['aria-label'] === 'Open Velocity Guardian' ? `trigger${trigger++}`
        : p['aria-label'] ?? p.role ?? (p['aria-pressed'] !== undefined ? 'teacher' : null);
        if (id) { const target = element(id); target.disabled = !!p.disabled; if (p.ref) p.ref.current = target; } });
      walk(result, node => { if (node.props.role === 'dialog') walk(node.props.children, child => {
        if (['button', 'input'].includes(child.type)) controls.push(element(child.props['aria-label'] ?? 'teacher')); }); });
      pending.splice(0).forEach(run => run()); return result; };
    const find = (node, label) => Array.isArray(node) ? node.map(child => find(child, label)).find(Boolean)
      : node?.props && (node.props['aria-label'] === label ? node : find(node.props.children, label));
    const open = (index = 0) => { const buttons = []; walk(tree(), node => { if (node.props['aria-label'] === 'Open Velocity Guardian') buttons.push(node); });
      buttons[index].props.onClick({ currentTarget: element(`trigger${index}`) }); tree(); };
    return { current, legacy, calls, timers, reads: () => reads, tree, walk, element, open, active: () => document.activeElement,
      controls: () => controls, listeners: () => listeners.size, unmount: () => effects.forEach(effect => effect.cleanup?.()),
      key(key, shiftKey = false) { const event = { key, shiftKey, prevented: false, preventDefault() { this.prevented = true; } };
        [...listeners].forEach(fn => fn(event)); tree(); return event; }, reply: () => state.find(Array.isArray).at(-1),
      close() { find(tree(), 'Close Velocity Guardian').props.onClick(); tree(); },
      submit(input = 'cash flow') { open();
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
  for (const trigger of [0, 1]) test('Guardian open focuses the question; Escape restores exact trigger ' + trigger, () => {
    const f = guardianFixture('/portfolio'); f.element('Choose theme').focus(); f.open(trigger);
    assert.equal(f.active(), f.element('Ask Velocity Guardian a question')); assert.equal(f.listeners(), 1);
    assert.equal(f.key('Escape').prevented, true); assert.equal(f.active(), f.element('trigger' + trigger)); assert.equal(f.listeners(), 0);
  });
  test('Guardian traps Tab boundaries and recovers outside focus without replacing normal Tab', () => {
    const f = guardianFixture('/portfolio'); f.open(); const controls = f.controls();
    assert.deepEqual(controls.map(control => control.id), ['teacher', 'Close Velocity Guardian', 'Ask Velocity Guardian a question', 'Send question']);
    controls[3].focus(); assert.equal(f.key('Tab').prevented, true); assert.equal(f.active(), controls[0]);
    assert.equal(f.key('Tab', true).prevented, true); assert.equal(f.active(), controls[3]);
    controls[2].focus(); assert.equal(f.key('Tab').prevented, false); assert.equal(f.key('Tab', true).prevented, false);
    f.element('Choose theme').focus(); assert.equal(f.key('Tab').prevented, true); assert.equal(f.active(), controls[0]);
    f.element('Choose theme').focus(); assert.equal(f.key('Tab', true).prevented, true); assert.equal(f.active(), controls[3]);
  });
  test('Guardian close and unmount clean listeners; disconnected triggers are not focused', () => {
    const f = guardianFixture('/portfolio'); f.open(1); f.close(); assert.equal(f.active(), f.element('trigger1')); assert.equal(f.listeners(), 0);
    f.open(0); f.unmount(); assert.equal(f.active(), f.element('trigger0')); assert.equal(f.listeners(), 0);
    const gone = guardianFixture('/portfolio'); gone.open(1); gone.element('trigger1').isConnected = false; gone.unmount();
    assert.notEqual(gone.active(), gone.element('trigger1')); assert.equal(gone.listeners(), 0);
  });
  test('Guardian focus stays put on query/reply renders and other keys remain untouched', () => {
    const f = guardianFixture('/portfolio'); f.submit(); const send = f.element('Send question'); send.focus(); f.flush(); f.tree();
    assert.equal(f.active(), send); assert.equal(f.listeners(), 1); assert.equal(f.key('ArrowRight').prevented, false);
  });
  test('Guardian empty focusable set falls back to the dialog; hidden and disabled controls stay excluded', () => {
    const f = guardianFixture('/portfolio'); f.open(); f.controls().forEach(control => { control.offsetParent = null; });
    f.element('Choose theme').focus(); assert.equal(f.key('Tab').prevented, true); assert.equal(f.active(), f.element('dialog'));
    const g = guardianFixture('/portfolio'); g.open(); g.element('teacher').disabled = true; g.element('teacher').offsetParent = null;
    g.element('Send question').focus(); assert.equal(g.key('Tab').prevented, true); assert.equal(g.active(), g.element('Close Velocity Guardian'));
  });
  test('Guardian AI text preserves real response linebreaks with scoped wrapping and unchanged source label', () => {
    const f = guardianFixture('/portfolio'); f.submit(); f.flush(); const spans = [], labels = [];
    f.walk(f.tree(), node => { if (node.type === 'span' && node.props.children === f.reply().text) spans.push(node);
      if (node.type === 'p' && node.props.children === f.reply().source) labels.push(node); });
    assert.equal(spans.length, 1); assert.match(spans[0].props.className, /whitespace-pre-line/); assert.match(spans[0].props.className, /overflow-wrap:anywhere/);
    assert.ok(f.reply().text.includes('\n')); assert.equal(labels.length, 1);
  });
  test('Portfolio return intent survives the existing six information-route journeys', () => {
    for (const [route, query] of [['/portfolio', ''], ['/', 'scenario=portfolio'], ['/simulator', 'scenario=portfolio']]) {
      for (const [label, destination] of [['Learn', '/learn'], ['Settings', '/settings']]) {
        const href = primary(render(route, query), label).href;
        assert.equal(href, `${destination}?scenario=portfolio`);
        const url = new URL(href, 'https://fixture.invalid'), arrival = render(url.pathname, url.search);
        for (const [name, expected] of [['Dashboard', '/?scenario=portfolio'], ['Simulator', '/simulator?scenario=portfolio']]) {
          assert.equal(primary(arrival, name).href, expected); assert.equal(owner(primary(arrival, name).href), true);
        }
      }
    }
  });
  test('information-route intent crosses Learn and Settings while active paths and legacy destinations stay unchanged', () => {
    for (const [route, active] of [['/learn', 'Learn'], ['/settings', 'Settings']]) {
      for (const query of ['scenario=portfolio', 'module=2&scenario=portfolio&scenario=unknown']) {
        const view = render(route, query); assert.equal(primary(view, active)['aria-current'], 'page');
        for (const [label, destination] of [['Dashboard', '/'], ['Simulator', '/simulator'], ['Learn', '/learn'], ['Settings', '/settings']]) {
          assert.equal(primary(view, label).href, `${destination}?scenario=portfolio`);
        }
        for (const [label, destination] of [['Portfolio', '/portfolio'], ['Cockpit', '/cockpit'], ['Wealth Timeline', '/vault']]) {
          assert.equal(primary(view, label).href, destination);
        }
      }
    }
  });
  test('return intent retains bare, first-query, case, unknown, lesson-focus and unsupported route boundaries', () => {
    const cases = ['/', '/simulator', '/learn', '/settings'].flatMap(route =>
      ['', 'scenario=Portfolio', 'scenario=unknown', 'scenario=x&scenario=portfolio', 'scenario=&scenario=portfolio'].map(query => [route, query]));
    cases.push(['/simulator', 'focus=cashflow'], ['/cockpit', 'scenario=portfolio'], ['/vault', 'scenario=portfolio'],
      ['/unknown', 'scenario=portfolio'], ['/learn/', 'scenario=portfolio']);
    for (const [route, query] of cases) {
      const view = render(route, query);
      for (const [label, destination] of [['Dashboard', '/'], ['Simulator', '/simulator'], ['Learn', '/learn'], ['Settings', '/settings']]) {
        assert.equal(primary(view, label).href, destination);
      }
    }
  });
  test('information-route return intent never widens Guardian financial ownership', () => {
    for (const route of ['/learn', '/settings']) for (const query of ['scenario=portfolio', 'scenario=x&scenario=portfolio']) {
      const f = guardianFixture(route, query); f.submit(); f.flush();
      assert.equal(f.calls[0].options.context.cashFlow, 3500); assert.equal(f.calls[0].options.context.activeDomainLabel, 'car');
      assert.equal(f.reads(), 0); assert.match(f.reply().text, /\$3,500 \/ month/);
      assert.equal(f.reply().source, 'Single-target demo at question time');
    }
  });
}
module.exports = { registerPortfolioNavigationTests };
