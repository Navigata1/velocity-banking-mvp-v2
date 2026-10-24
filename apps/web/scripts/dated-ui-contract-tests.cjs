/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const React = require('react'), { renderToStaticMarkup } = require('react-dom/server');
const { datedBookFixture, loadDatedTestModule: engine } = require('./dated-codec-tests.cjs');
const root = path.resolve(__dirname, '../src');
function component(relative) {
  const testModule = { exports: {} }, file = path.join(root, relative);
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText,
    { module: testModule, exports: testModule.exports, require: id => {
      if (id === '@/hooks/useIsClient') return { useIsClient: () => false };
      if (id === '@/stores/theme-store') return { useThemeStore: () => ({ theme: 'original' }), themeClasses: { original: {} } };
      if (id === '@/engine/calculations') return { formatCurrency: value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value) };
      if (id === '@interestshield/financial-engine') return engine('index');
      if (id.startsWith('@interestshield/financial-engine/')) return engine(id.slice('@interestshield/financial-engine/'.length));
      return require(id);
    } }); return testModule.exports.default;
}
function runDatedUIContractTests() {
  let count = 0, failed = 0;
  const result = book => engine('portfolio').simulatePortfolio(engine('portfolio-book').portfolioBookInputs(book));
  const render = (file, props) => renderToStaticMarkup(React.createElement(component(file), props));
  function test(name, fn) { count++; try { fn(); console.log('PASS dated UI ' + name); } catch (error) { failed++; console.error('FAIL dated UI ' + name + ': ' + error.message); } }
  test('review progress is unavailable, never a false zero percentage', () => {
    const b = datedBookFixture(); b.loc.limit = 900;
    const model = engine('portfolio-path').buildPortfolioPathVisualModel(result(b), 900);
    const html = render('components/PortfolioPayoffPath.tsx', { model });
    assert.match(html, /data-testid="portfolio-path-progress"[^>]*>Not projected</);
    assert.doesNotMatch(html, />0%<|>100%<|>Paid off</);
  });
  test('computed dated basis overrides the unsupported raw term assessment', () => {
    const b = datedBookFixture(), computed = result(b).forecastBasis;
    const html = render('components/ForecastBasisStatus.tsx', { terms: b.loc.lenderTerms, computed });
    assert.match(html, /data-basis="lender-dated"/); assert.match(html, /Declared dated estimate/);
    assert.match(html, /Not lender verification/); assert.doesNotMatch(html, /Terms not modeled/);
  });
  test('invalid schedule explains its actual computed review reason', () => {
    const b = datedBookFixture(); b.monthlyIncome++;
    const html = render('components/ForecastBasisStatus.tsx', { terms: b.loc.lenderTerms, computed: result(b).forecastBasis });
    assert.match(html, /data-basis="lender-review"/); assert.match(html, /cash entry totals must exactly match/);
  });
  test('ledger shows separate fees, real accepted date and actual interest balance', () => {
    const html = render('app/portfolio/PortfolioDatedLedger.tsx', { result: result(datedBookFixture()), classes: {} });
    assert.match(html, /Accepted through 2026-04-30/); assert.match(html, /Fees: \$33\.00 through accepted months/);
    assert.match(html, /\$627\.00/); assert.match(html, /Cash change/); assert.match(html, /LOC change/);
    assert.match(html, /not posted daily/); assert.match(html, /bill, not an additional fee/);
  });
  assert.equal(failed, 0, `${failed}/${count} dated UI groups failed`); console.log(count + ' dated UI groups passed.');
}
module.exports = { runDatedUIContractTests }; if (require.main === module) runDatedUIContractTests();
