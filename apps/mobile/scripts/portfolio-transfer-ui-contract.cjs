/* eslint-disable @typescript-eslint/no-require-imports */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const book={monthlyIncome:7200,monthlyExpenses:4500,extraMonthlyPayment:50,chunkAmount:1000,
  loc:{limit:1000,balance:50,apr:0.12},strategy:'avalanche',focusMode:'single',splitRatioPrimary:0.7,debts:[]};
const clone=value=>JSON.parse(JSON.stringify(value));
const {plan}=require('./dated-storage-contract.cjs');

// Reuse the existing CPU null host. These are real component callbacks, not rendered UI proof.
module.exports=({React,createRoot,hostElement,document})=>async()=>{
  let cases=0;
  function environment(route=false){
    const cache=new Map(),controls=new Map(),texts=new Map(),shares=[],replacements=[];
    let input,transferProps,mounted=true,props={book:clone(book),revision:7,storageScope:'guest',documentVersion:3,
      onReplace:async(...args)=>{replacements.push(args);}};
    const Fragment=({children})=>React.createElement(React.Fragment,null,children);
    function Pressable(props){const id=React.useRef(Symbol());React.useLayoutEffect(()=>{controls.set(id.current,props);return()=>controls.delete(id.current);});return React.createElement(Fragment,null,props.children);}
    function Text(props){React.useLayoutEffect(()=>{if(props.accessibilityLabel)texts.set(props.accessibilityLabel,props.children);});return null;}
    const native={View:Fragment,Text,Pressable,ScrollView:Fragment,Platform:{OS:'ios'},StyleSheet:{create:x=>x},
      TextInput:props=>{React.useLayoutEffect(()=>{input=props;});return null;},Share:{share:async payload=>{shares.push(payload);}}};
    function load(file){
      if(cache.has(file))return cache.get(file).exports;
      const module={exports:{}};cache.set(file,module);
      const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
      const local=id=>{
        if(id==='react-native')return native;
        if(id==='expo-crypto')return{randomUUID:()=> 'unused'};
        if(route&&id==='@/components/mobile-portfolio-provider')return{useMobilePortfolio:()=>({...props,status:'saved',isHydrated:true,
          replace:async(...args)=>{replacements.push(args);}})};
        if(route&&id==='@/components/mobile-auth-provider')return{useMobileAuth:()=>({recoveryBusy:false})};
        if(route&&id==='@/components/portfolio/portfolio-transfer')return{PortfolioTransfer:p=>{React.useLayoutEffect(()=>{transferProps=p;});return null;}};
        if(route&&id==='./route-screen')return{MobileRouteScreen:p=>p.renderContent({input:{},isHydrated:true})};
        if(route&&id==='@/lib/mobile-portfolio-model')return{buildMobilePortfolioBookView:()=>({warnings:[],path:[]})};
        if(route&&id.startsWith('@/components/'))return new Proxy({},{get:()=>()=>null});
        if(route&&id==='@interestshield/financial-engine')return{formatCurrency:String};
        if(id.startsWith('@interestshield/financial-engine'))return load(fs.realpathSync(require.resolve(id)));
        if(id.startsWith('.'))return load(path.resolve(path.dirname(file),id+'.ts'));
        return require(id);
      };
      vm.runInNewContext(source,{module,exports:module.exports,require:local,console,Error},{filename:file});return module.exports;
    }
    const api=load(path.join(root,route?'components/mobile-routes/portfolio-route.tsx':'components/portfolio/portfolio-transfer.tsx'));
    const container=hostElement('div');container.ownerDocument=document;const mountedRoot=createRoot(container);
    const render=async patch=>{props={...props,...patch};await React.act(async()=>{mountedRoot.render(React.createElement(route?api.PortfolioRoute:api.PortfolioTransfer,props));});};
    const press=async label=>{const control=[...controls.values()].find(p=>p.accessibilityLabel===label);assert.ok(control,`missing ${label}`);
      assert.equal(Boolean(control.disabled),false);await React.act(async()=>{await control.onPress();});};
    return{render,press,shares,replacements,texts,transfer:()=>transferProps,
      draft:async value=>{await React.act(async()=>{input.onChangeText(value);});},
      close:async()=>{if(mounted){await React.act(async()=>{mountedRoot.unmount();});mounted=false;}}};
  }
  async function test(name,action,route=false){const h=environment(route);cases++;
    try{await h.render();await action(h);console.log(`PASS Portfolio transfer callbacks ${name}`);}
    catch(error){console.error(`FAIL Portfolio transfer callbacks ${name}`);console.error(error);process.exitCode=1;}
    finally{await h.close();}}
  await test('export text and native Share retain active3 without terms',async h=>{
    assert.equal(JSON.parse(h.texts.get('Portfolio export JSON')).version,3);await h.press('Share portfolio JSON');
    assert.equal(JSON.parse(h.shares[0].message).version,3);
    await h.render({documentVersion:undefined});assert.equal(JSON.parse(h.texts.get('Portfolio export JSON')).version,2);
  });
  await test('explicit3 import adopts format for an otherwise identical old book',async h=>{
    await h.render({documentVersion:undefined});await h.draft(JSON.stringify({version:3,aprUnit:'decimal',data:book}));
    await h.press('Review imported portfolio');await h.press('Confirm replace portfolio');
    assert.equal(h.replacements.length,1);assert.equal(h.replacements[0][2],3);assert.equal(h.replacements[0][1],7);
  });
  await test('format-only destination changes invalidate the captured import review',async h=>{
    await h.draft(JSON.stringify({version:2,aprUnit:'decimal',data:{...book,monthlyIncome:9000}}));await h.press('Review imported portfolio');
    await h.render({documentVersion:undefined});await h.press('Confirm replace portfolio');assert.equal(h.replacements.length,0);
  });
  await test('Portfolio route threads active3 into export and the fourth replacement argument',async h=>{
    assert.equal(h.transfer().documentVersion,3);await h.transfer().onReplace(clone(book),7,3);
    assert.equal(h.replacements.length,1);assert.equal(h.replacements[0][3],3);assert.equal(h.replacements[0][2],7);
  },true);
  await test('active4 export and Share preserve ordered dated context and sticky context-free format',async h=>{
    await h.render({documentVersion:4,book:{...clone(book),datedPlan:plan()}});await h.press('Share portfolio JSON');
    for(const raw of [h.texts.get('Portfolio export JSON'),h.shares[0].message]){
      const document=JSON.parse(raw);assert.equal(document.version,4);assert.deepEqual(document.data.datedPlan,plan());
    }
    await h.render({book:clone(book)});assert.equal(JSON.parse(h.texts.get('Portfolio export JSON')).version,4);
  });
  await test('explicit4 import adopts context-free format for an otherwise identical old book',async h=>{
    await h.render({documentVersion:undefined});await h.draft(JSON.stringify({version:4,aprUnit:'decimal',data:book}));
    await h.press('Review imported portfolio');await h.press('Confirm replace portfolio');
    assert.equal(h.replacements.length,1);assert.equal(h.replacements[0][2],4);assert.equal(h.replacements[0][1],7);
  });
  await test('active4 destination keeps4 while importing an older3 document',async h=>{
    await h.render({documentVersion:4});await h.draft(JSON.stringify({version:3,aprUnit:'decimal',data:{...book,monthlyIncome:9000}}));
    await h.press('Review imported portfolio');await h.press('Confirm replace portfolio');
    assert.equal(h.replacements.length,1);assert.equal(h.replacements[0][2],4);assert.equal(h.replacements[0][0].monthlyIncome,9000);
  });
  await test('Portfolio route threads active4 into export and the fourth replacement argument',async h=>{
    await h.render({documentVersion:4});assert.equal(h.transfer().documentVersion,4);await h.transfer().onReplace({...clone(book),datedPlan:plan()},7,4);
    assert.equal(h.replacements.length,1);assert.equal(h.replacements[0][3],4);assert.deepEqual(h.replacements[0][0].datedPlan,plan());
  },true);
  console.log(`${cases} Portfolio transfer callback contracts complete. CPU null host only.`);
};
