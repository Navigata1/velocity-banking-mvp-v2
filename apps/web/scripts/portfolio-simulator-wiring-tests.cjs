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
  const assigned=value.properties.filter(ts.isPropertyAssignment);
  assert.deepEqual(assigned.map(p=>p.name.text).sort(),[...keys].sort());
  for(const key of keys){const p=assigned.find(p=>p.name.text===key);assert.ok(ts.isPropertyAssignment(p)&&member(p.initializer,'store',key),key+' must retain canonical source');}
  assert.equal(value.properties.filter(ts.isSpreadAssignment).length,1,'one optional dated-context spread');
  const make=new Function('store',`return (${value.getText(view)});`),source=Object.fromEntries(keys.map(key=>[key,{key}]));
  assert.deepEqual(Object.keys(make(source)).sort(),[...keys].sort(),'old books cannot acquire undefined dated fields');
  const datedPlan={contract:'fixed-loc-daily-v1',cashEvents:[]};assert.equal(make({...source,datedPlan}).datedPlan,datedPlan,'full dated context must reach the normal model');
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
test('Portfolio entry preserves a current comparison and initializes a missing result once',()=>{
  const tree=parse(path.join(root,'portfolio/page.tsx'));
  const effects=nodes(tree,n=>ts.isCallExpression(n)&&ident(n.expression,'useEffect'));
  assert.equal(effects.length,1);
  const effect=new Function('persistence','recompute','usePortfolioStore',`return (${effects[0].arguments[0].getText(tree)})();`);
  let calls=0,state={lastResult:{payoffMonths:2},lastRunComparison:{status:'changed'}};
  const store={getState:()=>state},recompute=()=>{calls++;state={lastResult:{payoffMonths:2},lastRunComparison:{status:'baseline'}};};
  const original=state;
  effect({status:'ready'},recompute,store);assert.equal(calls,0,'read-only entry must not replace an existing edit comparison');assert.equal(state,original);
  state={lastResult:undefined,lastRunComparison:undefined};
  effect({status:'ready'},recompute,store);assert.equal(calls,1,'a fresh ready entry still computes a baseline');const initialized=state;
  effect({status:'ready'},recompute,store);assert.equal(calls,1,'a repeated effect must read the latest result, not a stale render');assert.equal(state,initialized);
  for(const status of ['error','unavailable']){state={lastResult:undefined,lastRunComparison:undefined};effect({status},recompute,store);assert.equal(calls,1,status+' storage cannot compute a fallback');}
});
test('per-debt paid-off dates require accepted whole-book authority as well as the numerical result',()=>{
  const tree=parse(path.join(root,'portfolio/PortfolioPayoffOrder.tsx'));
  const condition=nodes(tree,ts.isVariableDeclaration).find(n=>ident(n.name,'portfolioProjectionValid'));
  assert.ok(condition?.initializer);const accepted=new Function('result','store',`return (${condition.initializer.getText(tree)});`);
  assert.equal(accepted({isPayoffPossible:true},{lastRunSummary:{isPayoffPossible:false}}),false,'tolerance-based numerical success is not accepted settlement');
  assert.equal(accepted({isPayoffPossible:true},{lastRunSummary:{isPayoffPossible:true}}),true);
  assert.equal(accepted({isPayoffPossible:false},{lastRunSummary:{isPayoffPossible:true}}),false);
  assert.equal(accepted({isPayoffPossible:true},{}),false);
  assert.equal(accepted(undefined,{}),false);
});
if(failures){console.error(`${failures}/${tests} Portfolio Simulator wiring contracts failed.`);process.exitCode=1;}else console.log(`${tests} Portfolio Simulator wiring contracts passed.`);
