/* eslint-disable @typescript-eslint/no-require-imports */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
function registerMoneyLoopDetailTruthTests({test,loadTsModule}){
  const filename=path.resolve(__dirname,'../src/components/MoneyLoopArtifactRail.tsx'),source=fs.readFileSync(filename,'utf8');
  function detail(code){
    const tree=ts.createSourceFile(filename,code,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),nodes=[];
    function visit(n){if(ts.isJsxElement(n)&&n.openingElement.attributes.properties.some(a=>ts.isJsxAttribute(a)&&a.name.getText(tree)==='data-testid'&&a.initializer?.text==='money-loop-artifact-detail'))nodes.push(n);ts.forEachChild(n,visit);}visit(tree);assert.equal(nodes.length,1);return{tree,node:nodes[0]};
  }
  function render(artifact,code=source){
    const loaded={exports:{}},modules={
      '@/app/artifact-visual-contract':'src/app/artifact-visual-contract.ts',
      '@/hooks/useIsClient':'src/hooks/useIsClient.ts',
      '@/stores/theme-store':'src/stores/theme-store.ts',
      './money-loop-3d/selection-motion':'src/components/money-loop-3d/selection-motion.ts',
    };
    const request=id=>id==='next/dynamic'?()=>()=>null:modules[id]?loadTsModule(modules[id]):require(id);
    // Render the actual selected detail with its original component bindings.
    const {tree,node}=detail(code),component=tree.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='MoneyLoopArtifactRail');assert.ok(component?.body);
    const returns=component.body.statements.filter(ts.isReturnStatement);assert.equal(returns.length,1);const expression=returns[0].expression;assert.ok(expression);
    const scoped=code.slice(0,expression.getStart(tree))+node.getText(tree)+code.slice(expression.end);
    const output=ts.transpileModule(scoped,{compilerOptions:{esModuleInterop:true,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;
    new Function('exports','require','module','__filename','__dirname',output)(loaded.exports,request,loaded,filename,path.dirname(filename));
    return renderToStaticMarkup(React.createElement(loaded.exports.default,{artifacts:[artifact]}));
  }
  function assertDetail(html,artifact){
    assert.doesNotMatch(html,/>[+-]?\d+(?:\.\d+)?%<\//,'detail must not expose a bare decorative percentage');
    assert.ok(!html.includes('Modeled pressure'),'detail must not label a decorative minimum as modeled pressure');
    for(const value of [artifact.value,artifact.signal,artifact.note])assert.ok(html.includes(value),'actual financial detail must remain: '+value);
  }
  const fixtures=[
    {id:'income',label:'Income',value:'$0',signal:'Fuel',note:'Deposits start the loop.',tone:'amber',operationalState:'caution'},
    {id:'loc',label:'LOC',value:'$0 open',signal:'100% used',note:'Capacity is not income.',tone:'amber',operationalState:'blocked'},
    {id:'expenses',label:'Expenses',value:'$1,000',signal:'Outflow',note:'Planned expenses leave the loop.',tone:'rose',operationalState:'blocked'},
    {id:'cash-flow',label:'Cash Flow',value:'-$1,000',signal:'Stabilize',note:'Restore positive cash flow.',tone:'rose',operationalState:'blocked'},
    {id:'principal',label:'Principal',value:'Set chunk',signal:'Auto Loan',note:'Choose a chunk after reviewing cash flow.',tone:'amber',operationalState:'caution'},
  ];
  for(const fixture of fixtures)test('Money Loop '+fixture.id+' detail preserves real values without a decorative percentage',()=>{
    for(const fillPercent of [12,37,100]){const artifact={...fixture,fillPercent,pressurePercent:8},before=JSON.stringify(artifact);assertDetail(render(artifact),artifact);assert.equal(JSON.stringify(artifact),before);}
  });
  test('Money Loop detail contract rejects reintroduced decorative percentage text',()=>{
    const {tree,node}=detail(source),at=node.closingElement.getStart(tree),mutant=source.slice(0,at)+'<span>{activeArtifact.fillPercent}%</span>'+source.slice(at),artifact={...fixtures[1],fillPercent:12,pressurePercent:8};
    assert.throws(()=>assertDetail(render(artifact,mutant),artifact),/bare decorative percentage/);
  });
  for(const field of ['value','signal','note'])test('Money Loop detail contract rejects removal of selected '+field,()=>{
    const {tree,node}=detail(source),expressions=[];
    function visit(n){if(ts.isPropertyAccessExpression(n)&&n.expression.getText(tree)==='activeArtifact'&&n.name.text===field)expressions.push(n);ts.forEachChild(n,visit);}visit(node);assert.equal(expressions.length,1);
    const expression=expressions[0],mutant=source.slice(0,expression.getStart(tree))+"''"+source.slice(expression.end),artifact={...fixtures[1],fillPercent:12,pressurePercent:8};
    assert.throws(()=>assertDetail(render(artifact,mutant),artifact),/actual financial detail must remain/);
  });
}
module.exports={registerMoneyLoopDetailTruthTests};
