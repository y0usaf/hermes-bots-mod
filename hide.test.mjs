import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as React from 'react';
import * as JSX from 'react/jsx-runtime';
import {createRoot} from 'react-dom/client';
import {JSDOM} from 'jsdom';

// Entire production module and register() run in a fresh realm for each fixture.
// Real React DOM/hooks/events; the SDK host, network, timers, query cache, and
// SDK UI primitives are synthetic. No live Hermes state or gateway is accessed.
const source=readFileSync(process.argv[2]||new URL('./plugin.js',import.meta.url),'utf8');
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://fixture.test'});
globalThis.window=dom.window;globalThis.document=dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const clone=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
function atom(value){
 const listeners=new Set();return {get:()=>value,set:next=>{
  if(Object.is(value,next))return;value=next;for(const f of listeners)f(value);
 },listen:fn=>{listeners.add(fn);return()=>listeners.delete(fn);}};
}
const worker={name:'worker',connectionId:'local',has_avatar:true,canonical_session:{id:'canonical',title:'Bot Chat'}};
const userRows=[{id:'canonical',title:'Bot Chat',last_active:100},{id:'task',title:'Fix UI',last_active:200}];
function harness({saved={},get,set,profiles=[clone(worker)],sources=[]}={}){
 const persisted=clone(saved),writes=[],requests=[],notices=[],navigation=[],unread=[],registrations=[],disposers=[];
 const fixture={profiles,sources,rows:clone(userRows),fetchedAt:1};
 const storage={get:async key=>get?get(key,persisted):clone(persisted[key]??null),set:async(key,value)=>{
  writes.push([key,clone(value)]);if(set)await set(key,value);persisted[key]=clone(value);
 },remove:async key=>{delete persisted[key];}};
 const stateValues={profile:'default',connectionId:'local',gateway:'open',focusedStoredSessionId:'task',focusedSessionOwner:{connectionId:'local',profile:'worker'},focusedSessionProfile:'worker',busyBySession:{}};
 const state=new Proxy({}, {get:(o,k)=>o[k]??=(atom(stateValues[k]??null))});
 const host={state,request:async(method,args)=>{requests.push([method,args]);if(method==='profiles.list')return {profiles:fixture.profiles,bot_mode_protocol:true};return {};},
  notify:n=>notices.push(n),notifyError:e=>notices.push({kind:'error',message:String(e)}),
  openSession:async(...args)=>navigation.push(['open',...args]),newChat:(...args)=>navigation.push(['new',...args]),
  setWorkspaceScope:(...args)=>navigation.push(['scope',...args]),onEvent:()=>()=>{},activeConnectionId:()=> 'local'};
 const Button=({children,onSelect,onClick,disabled,...props})=>React.createElement('button',{
  onClick:onClick||onSelect,disabled,'aria-label':props['aria-label'],'aria-pressed':props['aria-pressed'],'aria-expanded':props['aria-expanded'],
  'aria-current':props['aria-current'],'data-bots-action':props['data-bots-action'],title:props.title,className:props.className,style:props.style
 },children);
 const Container=({children})=>React.createElement('div',null,children);
 const Invisible=()=>null;
 const sdk={host,atom,LruCache:class extends Map{constructor(){super();}},computed:(deps,fn)=>({get:()=>fn(...deps.map(a=>a.get())),listen:()=>()=>{}}),
  useValue:a=>React.useSyncExternalStore(a.listen,a.get,a.get),
  useI18n:()=>({t:{common:{delete:'Delete'},sidebar:{row:{}},cron:{}}}),
  usePluginI18n:()=>ctx.td,
  useQuery:({queryKey})=>({data:queryKey[1]==='bot-sessions'?fixture.rows:fixture.error?undefined:{profiles:fixture.profiles,sources:fixture.sources,fetchedAt:fixture.fetchedAt},error:fixture.error,refetch}),
  queryClient:{getQueryData:()=>({profiles:fixture.profiles}),invalidateQueries:async()=>{},getQueriesData:()=>[]},
  cn:(...args)=>args.filter(Boolean).join(' '),coarseElapsed:()=>({unit:'s',value:0}),translateNow:x=>x,
  haptic:()=>{},profileColor:()=> '#777',markSessionUnreadFinished:(...x)=>unread.push(x),
  COMPOSER_AREAS:{atCompletions:'atCompletions'},createBudgetedLoop:()=>({dispose(){},wake(){}}),
  SearchField:({value,onChange,...props})=>React.createElement('input',{'aria-label':props['aria-label'],value,onInput:e=>onChange(e.target.value)}),
  PanelEmpty:({title,description})=>React.createElement('div',null,title,description)
 };
 const refetch=async()=>{};
 for(const name of ['Button','RowButton','DropdownMenuItem','ContextMenuItem'])sdk[name]=Button;
 for(const name of ['DropdownMenu','DropdownMenuContent','DropdownMenuTrigger','ContextMenu','ContextMenuContent','ContextMenuTrigger','Tip','SidebarRowLead'])sdk[name]=Container;
 for(const name of ['Codicon','ConnectionGlyph','SessionStatusDot','ConfirmDialog','Dialog','DropdownMenuSeparator','DisclosureCaret','GlyphSpinner','ContextMenuSeparator'])sdk[name]=Invisible;
 const apiSDK=new Proxy(sdk,{get:(o,k)=>k in o?o[k]:undefined});
 const imports={'react':React,'react/jsx-runtime':JSX,'@hermes/plugin-sdk':apiSDK};
 let code=source.replace(/import\s*\{([^}]+)\}\s*from\s*["']([^"']+)["'];?/g,(_,bindings,mod)=>
  'const {'+bindings.split(',').map(x=>x.trim().replace(/\s+as\s+/,':')).join(',')+'}=__imports['+JSON.stringify(mod)+'];');
 code=code.replace(/import\s*\*\s*as\s+(\w+)\s*from\s*["']([^"']+)["'];?/g,(_,name,mod)=>'const '+name+'=__imports['+JSON.stringify(mod)+'];');
 code=code.replace('export{Kw as default};','globalThis.plugin=Kw;');
 const ctx=vm.createContext({__imports:imports,console,window:dom.window,document:dom.window.document,performance,
  requestAnimationFrame:()=>0,cancelAnimationFrame:()=>{},setInterval:()=>0,clearInterval:()=>{},setTimeout:()=>0,clearTimeout:()=>{},
  Map,Set,JSON,Promise,URL,AbortController,TextEncoder,TextDecoder});
 vm.runInContext(code,ctx,{filename:'production-plugin.js'});
 // Server protocol capability fixture: suppress unrelated legacy SOUL setup.
 vm.runInContext('_o=true;',ctx);
 const context={storage,i18n:{register:()=>()=>{},t:ctx.td},register:r=>{registrations.push(r);return()=>{};},onDispose:f=>disposers.push(f)};
 const rootElement=document.createElement('div');document.body.append(rootElement);const root=createRoot(rootElement);
 const mount=async(component=ctx.wu,props={})=>React.act(async()=>{root.render(React.createElement(component,props));await tick();});
 const flush=async()=>React.act(async()=>{await tick();});
 const start=async()=>React.act(async()=>{ctx.plugin.register(context);await tick();});
 const click=async text=>React.act(async()=>{
  const b=[...rootElement.querySelectorAll('button')].find(b=>b.textContent===text||b.getAttribute('aria-label')===text||text==='Hidden bots'&&b.textContent.startsWith(text));
  assert.ok(b,`Missing button ${text}; rendered: ${rootElement.textContent}`);
  b.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true}));await tick();
 });
 const destroy=async()=>{await React.act(async()=>root.unmount());for(const f of disposers)f();rootElement.remove();};
 return {host,ctx,fixture,persisted,writes,requests,notices,navigation,unread,state,registrations,context,rootElement,start,mount,click,flush,destroy};
}

test('full register and React roster: hide last bot, eye, future rows, restore last entry',async()=>{
 const h=harness();await h.start();await h.mount();
 assert.equal(h.rootElement.querySelectorAll('.bots-mod-bot-section').length,1);
 assert.equal(h.rootElement.querySelectorAll('.bots-mod-session-row').length,1);
 await h.click('Hide bot');
 assert.equal(h.rootElement.querySelectorAll('.bots-mod-bot-section').length,0);
 assert.ok(h.rootElement.textContent.includes('Hidden bots'));
 await h.click('Show internal chats');
 h.fixture.rows.push({id:'new',title:'New task'});h.fixture.fetchedAt++;await h.mount();
 assert.equal(h.rootElement.querySelectorAll('.bots-mod-session-row').length,0);
 assert.equal(h.navigation.filter(x=>x[0]==='open'||x[0]==='new').length,0);
 assert.equal(h.state.focusedStoredSessionId.get(),'task');
 await h.click('Hide internal chats');await h.click('Hidden bots');await h.click('Show Worker (local)');
 assert.equal(h.rootElement.querySelectorAll('.bots-mod-bot-section').length,1);
 assert.equal(h.rootElement.querySelectorAll('.bots-mod-session-row').length,2);
 assert.ok(!h.rootElement.textContent.includes('Hidden bots'));
 assert.deepEqual(h.persisted['hidden-bots-v2'],{});
 assert.equal(h.requests.some(([m])=>/delete|archive|cancel|configure/.test(m)),false);
 await h.destroy();
});

test('fresh full module/register reload persists hide AND restore, not just storage.set',async()=>{
 const h=harness();await h.start();await h.mount();await h.click('Hide bot');
 const second=harness({saved:h.persisted});await second.start();await second.mount();
 assert.equal(second.rootElement.querySelectorAll('.bots-mod-bot-section').length,0);
 await second.click('Hidden bots');await second.click('Show Worker (local)');
 const third=harness({saved:second.persisted});await third.start();await third.mount();
 assert.equal(third.rootElement.querySelectorAll('.bots-mod-bot-section').length,1);
 await h.destroy();await second.destroy();await third.destroy();
});

test('delayed startup read cannot resurrect an unhide tombstone or lose a concurrent hide',async()=>{
 const gate=deferred(), key=JSON.stringify(['local','worker']);
 const old={[key]:{name:'worker',connectionId:'local',title:'Worker'}};
 const h=harness({get:async key=>key==='hidden-bots-v2'?gate.promise:null});
 await h.start();await h.mount();
 assert.ok(h.rootElement.textContent.includes('Loading bot visibility'));
 assert.equal(h.ctx.dt.get(),'','No startup autoselection before hide map loads');
 let unhide,hide;
 await React.act(async()=>{
  unhide=h.ctx.botsModSetHidden(key,false);
  hide=h.ctx.botsModSetHidden({name:'ops',connectionId:'remote'},true);
  await tick();
 });
 assert.equal(h.writes.filter(([k])=>k==='hidden-bots-v2').length,0);
 await React.act(async()=>{gate.resolve(old);await Promise.all([unhide,hide]);});
 assert.equal(h.ctx.botsModIsHidden(worker),false);
 assert.equal(h.ctx.botsModIsHidden({name:'ops',connectionId:'remote'}),true);
 assert.equal(h.persisted['hidden-bots-v2'][key],undefined);
 assert.equal(h.rootElement.querySelectorAll('.bots-mod-bot-section').length,1);
 await h.destroy();
});

test('writes are serialized even when storage would finish later requests first',async()=>{
 const first=deferred();let count=0;
 const h=harness({set:async key=>{if(key==='hidden-bots-v2'&&++count===1)await first.promise;}});
 await h.start();let hide,show;
 await React.act(async()=>{hide=h.ctx.botsModSetHidden(worker,true);await tick();show=h.ctx.botsModSetHidden(worker,false);await tick();});
 assert.equal(count,1,'A second write must not overtake the pending first write');
 await React.act(async()=>{first.resolve();await Promise.all([hide,show]);});
 assert.equal(count,2);assert.deepEqual(h.persisted['hidden-bots-v2'],{});
 const next=harness({saved:h.persisted});await next.start();await next.mount();
 assert.equal(next.rootElement.querySelectorAll('.bots-mod-bot-section').length,1);
 await h.destroy();await next.destroy();
});

test('write failure gives truthful notification/banner and real retry button saves state',async()=>{
 let fail=true;
 const h=harness({set:async key=>{if(key==='hidden-bots-v2'&&fail)throw new Error('disk full');}});
 await h.start();await h.mount();await h.click('Hide bot');
 assert.equal(h.rootElement.querySelectorAll('.bots-mod-bot-section').length,0);
 assert.ok(h.notices.some(n=>n.kind==='error'&&n.message.includes('not saved')));
 assert.ok(h.rootElement.querySelector('[role=alert]').textContent.includes('disk full'));
 assert.equal(h.persisted['hidden-bots-v2'],undefined);
 fail=false;await h.click('Retry saving');
 assert.equal(h.rootElement.querySelector('[role=alert]'),null);
 assert.ok(h.persisted['hidden-bots-v2'][h.ctx.botsModHiddenName(worker)]);
 await h.destroy();
});

test('read failure does not overwrite unknown persisted state; retry merges local intent',async()=>{
 let fail=true;const key=JSON.stringify(['remote','ops']);
 const h=harness({get:async k=>{if(k!=='hidden-bots-v2')return null;if(fail)throw new Error('read unavailable');return {[key]:{name:'ops',connectionId:'remote'}};}});
 await h.start();await h.mount();
 assert.ok(h.rootElement.querySelector('[role=alert]').textContent.includes('could not be loaded'));
 await React.act(async()=>{await h.ctx.botsModSetHidden(worker,true);});
 assert.equal(h.writes.filter(([k])=>k==='hidden-bots-v2').length,0);
 fail=false;await h.click('Retry loading');
 assert.ok(h.persisted['hidden-bots-v2'][key]);
 assert.ok(h.persisted['hidden-bots-v2'][h.ctx.botsModHiddenName(worker)]);
 await h.destroy();
});

test('unavailable source/empty roster and unmatched search both keep real restore reachable',async()=>{
 const key=JSON.stringify(['gone','worker']);
 const h=harness({profiles:[],saved:{'hidden-bots-v2':{[key]:{title:'',name:'worker',connectionId:'gone'}}}});
 await h.start();await h.mount();await h.click('Hidden bots');
 assert.ok(h.rootElement.textContent.includes('unavailable'));
 await h.click('Show worker (gone)');assert.deepEqual(h.persisted['hidden-bots-v2'],{});
 await h.destroy();
 const profiles=[worker,...Array.from({length:8},(_,i)=>({...worker,name:`bot${i}`}))];
 const s=harness({profiles});await s.start();await s.mount();
 await React.act(async()=>{await s.ctx.botsModSetHidden(worker,true);});
 const input=s.rootElement.querySelector('input');assert.ok(input);
 await React.act(async()=>{input.value='does-not-match';input.dispatchEvent(new dom.window.Event('input',{bubbles:true}));await tick();});
 assert.equal(s.rootElement.querySelectorAll('.bots-mod-bot-section').length,0);
 await s.click('Hidden bots');await s.click('Show Worker (local)');
 assert.deepEqual(s.persisted['hidden-bots-v2'],{});
 assert.equal(s.rootElement.querySelectorAll('.bots-mod-bot-section').length,0,'Restore does not clear search');
 await React.act(async()=>{input.value='worker';input.dispatchEvent(new dom.window.Event('input',{bubbles:true}));await tick();});
 assert.equal(s.rootElement.querySelectorAll('.bots-mod-bot-section').length,1);
 await s.destroy();
});

test('qualified identity, legacy v1 migration, and metadata.hidden retain independent semantics',async()=>{
 const remote={...worker,connectionId:'remote',sourceScoped:true};
 const h=harness({profiles:[worker,remote],saved:{'hidden-bots-v1':{'local::worker':{name:'worker',connectionId:'local',title:'Worker'},garbage:{name:'bad'}},'bot-meta':{worker:{hidden:true,title:'Legacy worker'}}}});
 await h.start();
 assert.equal(h.ctx.botsModIsHidden(worker),true);assert.equal(h.ctx.botsModIsHidden(remote),false);
 assert.notEqual(h.ctx.botsModHiddenName({connectionId:'a::b',name:'c'}),h.ctx.botsModHiddenName({connectionId:'a',name:'b::c'}));
 assert.equal(Object.keys(h.ctx.botsModHiddenBots.get()).length,1);
 const before=clone(h.ctx.B.get());
 await React.act(async()=>{await h.ctx.botsModSetHidden(worker,false);});
 assert.deepEqual(clone(h.ctx.B.get()),before,'No legacy/profile metadata mutation');
 assert.equal(h.ctx.fo(worker,h.ctx.B.get()),true,'Existing legacy hidden flag still has original semantics');
 assert.equal(h.ctx.botsModIsHidden(worker),false);
 assert.ok(h.writes.every(([key])=>key!=='bot-meta'),'Explicit hide never rewrites legacy metadata');
 await h.destroy();
});

test('hidden bot survives manual mention resolution/middleware and delegation routing unchanged',async()=>{
 const h=harness();await h.start();await h.mount();await h.click('Hide bot');
 assert.equal(h.ctx.xs('Please ask @worker for help',[worker],{name:'default',connectionId:'local'}).length,1);
 await React.act(async()=>h.state.focusedSessionProfile.set('default'));
 const completion=h.registrations.find(r=>r.id==='mention-completions');
 assert.equal(completion.data.provide('worker').length,0,'Only autocomplete is suppressed');
 const middleware=h.registrations.find(r=>r.id==='mention-middleware');
 assert.ok(middleware,'Actual registration must contain composer middleware');
 const result=await middleware.data.handler({text:'Please ask @worker for help'});
 assert.ok(result.text.includes('agent profile "worker"'));
 assert.ok(result.text.includes('message_agent'));
 await React.act(async()=>{await h.ctx.botsModSetHidden(worker,false);});
 assert.equal(completion.data.provide('worker').length,1,'Restoring reveals autocomplete from the same non-self context');
 assert.equal(h.ctx.pe.get().some(b=>b.name==='worker'),true,'Execution roster keeps hidden bot');
 assert.equal(h.requests.some(([m])=>/delete|archive|cancel|configure/.test(m)),false);
 await h.destroy();
});



test('synchronously throwing storage getter remains retryable through the mounted UI',async()=>{
 const h=harness();const get=h.context.storage.get;
 h.context.storage.get=()=>{throw new Error('synchronous failure');};
 await h.start();await h.mount();
 assert.equal(h.ctx.botsModHiddenStatus.get().loaded,false);
 h.context.storage.get=get;await h.click('Retry loading');
 assert.equal(h.ctx.botsModHiddenStatus.get().loaded,true);
 assert.equal(h.rootElement.querySelectorAll('.bots-mod-bot-section').length,1);
 await h.destroy();
});

test('a visible successor never blanks the focused hidden workspace on refresh',async()=>{
 const ops={...worker,name:'ops'};const h=harness({profiles:[worker,ops]});
 await h.start();await h.mount();
 await React.act(async()=>{h.ctx.xn.set(true);h.ctx.dt.set('local::worker');});
 const before=clone(h.navigation);
 await React.act(async()=>{await h.ctx.botsModSetHidden(worker,true);});
 h.fixture.fetchedAt++;await h.mount();
 assert.deepEqual(h.navigation,before,'No workspace scope reset for an already-open hidden pane');
 assert.equal(h.state.focusedStoredSessionId.get(),'task');
 assert.equal(h.rootElement.querySelectorAll('.bots-mod-bot-section').length,1);
 assert.equal(h.rootElement.querySelector('.bots-mod-bot-section').getAttribute('aria-label'),'Ops');
 await h.destroy();
});

test('offline roster errors still expose restore; real hc mount/unmount obeys hook order',async()=>{
 const key=JSON.stringify(['gone','worker']);
 const h=harness({profiles:[],saved:{'hidden-bots-v2':{[key]:{name:'worker',connectionId:'gone'}}}});
 h.fixture.error=new Error('offline');await h.start();await h.mount();
 await h.click('Hidden bots');await h.click('Show worker (gone)');
 assert.deepEqual(h.persisted['hidden-bots-v2'],{});
 h.fixture.error=null;
 await h.mount(h.ctx.hc,{bot:worker});
 assert.equal(h.rootElement.querySelectorAll('.bots-mod-bot-section').length,1);
 await React.act(async()=>{await h.ctx.botsModSetHidden(worker,true);});
 assert.equal(h.rootElement.querySelectorAll('.bots-mod-bot-section').length,0,'hc itself does not fall back to a tile');
 await React.act(async()=>{await h.ctx.botsModSetHidden(worker,false);});
 assert.equal(h.rootElement.querySelectorAll('.bots-mod-bot-section').length,1);
 await h.destroy();
});

test('actual subagent relay still delivers to a hidden remote bot with synthetic gateways',async()=>{
 const h=harness();await h.start();
 await h.ctx.botsModSetHidden({name:'worker',connectionId:'remote'},true);
 const calls=[];
 h.host.profileRoutes=async()=>[{connectionId:'local',profile:'default'},{connectionId:'remote',profile:'default'}];
 h.host.requestProfile=async(route,method,args)=>{
  calls.push([route.connectionId,method,clone(args)]);
  if(method==='bot_relay.outbox.drain')return {envelopes:route.connectionId==='local'?[{id:'fixture-message',target_connection:'remote',target_profile:'worker',message:'fixture delegation'}]:[]};
  if(method==='bot_relay.deliver')return {reply:'synthetic gateway reply'};
  return {};
 };
 await h.ctx.Cl();
 assert.deepEqual(calls.find(([,method])=>method==='bot_relay.deliver'),['remote','bot_relay.deliver',{profile:'worker',message:'fixture delegation'}]);
 assert.ok(calls.some(([,method,args])=>method==='bot_relay.reply'&&args.reply==='synthetic gateway reply'));
 assert.equal(h.ctx.botsModIsHidden({name:'worker',connectionId:'remote'}),true);
 await h.destroy();
});

test('refresh/selection/activity never auto-open or notify hidden bots, including map-only state',async()=>{
 const h=harness();await h.start();await h.mount();
 await React.act(async()=>{h.ctx.dt.set('local::worker');await h.ctx.botsModSetHidden(worker,true);});
 assert.equal(h.ctx.dt.get(),'');
 const before=clone(h.navigation);h.fixture.fetchedAt++;await h.mount();
 assert.deepEqual(h.navigation,before);
 await React.act(async()=>{h.ctx._e.set('other');h.ctx.pe.set([worker]);h.ctx.sc('other');h.ctx.Vf([worker],[],{});});
 assert.equal(h.ctx._e.get(),'other');assert.equal(h.ctx.dt.get(),'');
 h.ctx.tc([worker]);h.ctx.tc([{...worker,canonical_session:{id:'canonical',last_active:99999999,preview:'busy hidden work'}}]);
 assert.equal(h.unread.length,0);assert.equal(h.notices.length,0);
 assert.equal(h.rootElement.querySelectorAll('.bots-mod-bot-section').length,0);
 assert.equal(h.state.focusedStoredSessionId.get(),'task');
 await h.destroy();
});
