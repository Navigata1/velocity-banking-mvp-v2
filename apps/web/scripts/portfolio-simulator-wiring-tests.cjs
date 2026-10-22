/* eslint-disable @typescript-eslint/no-require-imports */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'../src/app'),read=file=>fs.existsSync(file)?fs.readFileSync(file,'utf8'):'';
const parse=(file,text=read(file))=>ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function nodes(tree,predicate){const out=[];function walk(n){if(predicate(n))out.push(n);ts.forEachChild(n,walk);}walk(tree);return out;}
const ident=(n,name)=>ts.isIdentifier(n)&&n.text===name;
const member=(n,object,key)=>!!n&&ts.isPropertyAccessExpression(n)&&ident(n.expression,object)&&n.name.text===key;
const file=path.join(root,'simulator/PortfolioSimulator.tsx'),view=parse(file),entry=parse(path.join(root,'simulator/page.tsx'));
let tests=0,failures=0;function test(name,fn){tests++;try{fn();console.log('PASS Portfolio Simulator wiring '+name);}catch(e){failures++;console.error('FAIL Portfolio Simulator wiring '+name+': '+e.message);}}
test('canonical view subscribes to the existing Portfolio store and persistence',()=>{
  assert.ok(read(file),'canonical view exists');
  const imports=nodes(view,ts.isImportDeclaration).map(n=>n.moduleSpecifier.text);
  assert.ok(imports.includes('@/stores/portfolio-store'));assert.ok(!imports.some(i=>/financial-store|zustand/.test(i)));
  assert.ok(!nodes(view,n=>ts.isCallExpression(n)&&ts.isIdentifier(n.expression)&&['normalizeApr','create','persist'].includes(n.expression.text)).length);
  assert.equal(nodes(view,n=>ts.isCallExpression(n)&&ident(n.expression,'usePortfolioStore')).length,1);
  assert.ok(nodes(view,n=>ts.isCallExpression(n)&&ident(n.expression,'useSyncExternalStore')&&member(n.arguments[0],'portfolioPersistence','subscribe')&&member(n.arguments[1],'portfolioPersistence','getStatus')).length===1);
});
test('whole canonical book reaches the model without inspecting a smaller cohort',()=>{
  const keys=['monthlyIncome','monthlyExpenses','extraMonthlyPayment','chunkAmount','loc','strategy','focusMode','splitRatioPrimary','debts'];
  const declarations=nodes(view,ts.isVariableDeclaration),book=declarations.find(n=>ident(n.name,'book'));
  assert.ok(book&&ts.isCallExpression(book.initializer)&&ident(book.initializer.expression,'useMemo'));
  let value=book.initializer.arguments[0]?.body;while(value&&ts.isParenthesizedExpression(value))value=value.expression;
  assert.ok(value&&ts.isObjectLiteralExpression(value));
  assert.deepEqual(value.properties.map(p=>p.name.text).sort(),[...keys].sort());
  for(const key of keys){const p=value.properties.find(p=>p.name.text===key);assert.ok(ts.isPropertyAssignment(p)&&member(p.initializer,'store',key),key+' must retain canonical source');}
  const calls=nodes(view,n=>ts.isCallExpression(n)&&ident(n.expression,'buildPortfolioSimulatorModel'));
  assert.equal(calls.length,1);assert.ok(ident(calls[0].arguments[0],'book'));
});
test('only the exact explicit query selects a lazy canonical view under Suspense',()=>{
  assert.ok(nodes(entry,n=>ts.isCallExpression(n)&&ident(n.expression,'useSearchParams')).length===1);
  assert.ok(nodes(entry,n=>ts.isStringLiteral(n)&&n.text==='./PortfolioSimulator').length===1);
  const branches=nodes(entry,n=>ts.isConditionalExpression(n)&&ts.isBinaryExpression(n.condition)&&n.condition.operatorToken.kind===ts.SyntaxKind.EqualsEqualsEqualsToken);
  assert.ok(branches.some(n=>ts.isCallExpression(n.condition.left)&&member(n.condition.left.expression,'params','get')&&n.condition.left.arguments[0]?.text==='scenario'&&n.condition.right.text==='portfolio'&&ts.isJsxSelfClosingElement(n.whenTrue)&&ident(n.whenTrue.tagName,'PortfolioSimulator')&&ts.isJsxSelfClosingElement(n.whenFalse)&&ident(n.whenFalse.tagName,'TargetSimulator')));
  assert.ok(nodes(entry,n=>ts.isJsxOpeningElement(n)&&ident(n.tagName,'Suspense')).length===1);
});
test('linked Dashboard and Portfolio path cannot overrule accepted payoff review',()=>{
  const dashboard=parse(path.join(root,'PortfolioDashboard.tsx')),portfolio=parse(path.join(root,'portfolio/PortfolioPlanSection.tsx'));
  assert.equal(nodes(dashboard,n=>ts.isCallExpression(n)&&ident(n.expression,'buildPortfolioSimulatorModel')).length,1);
  assert.ok(nodes(dashboard,n=>ts.isPropertyAccessExpression(n)&&ident(n.expression,'payoff')&&n.name.text==='payoffMonths').length);
  assert.ok(nodes(portfolio,n=>ts.isConditionalExpression(n)&&ts.isBinaryExpression(n.condition)&&member(n.condition.left,'payoffPlan','state')&&n.condition.right.text==='residual'&&ts.isJsxElement(n.whenTrue)&&ts.isJsxSelfClosingElement(n.whenFalse)&&ident(n.whenFalse.tagName,'PortfolioPayoffPath')).length);
});
if(failures){console.error(`${failures}/${tests} Portfolio Simulator wiring contracts failed.`);process.exitCode=1;}else console.log(`${tests} Portfolio Simulator wiring contracts passed.`);
