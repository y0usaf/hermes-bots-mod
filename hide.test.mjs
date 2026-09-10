import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {test} from 'node:test';
// Focused regressions for persistent per-bot hide mode. Synthetic bots only.
const source=readFileSync(process.argv[2] || new URL('./plugin.js',import.meta.url),'utf8');
const segment=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));

const atom=v=>({get:()=>v,set:n=>v=n});
const rows=[{id:'canonical',title:'Bot Chat',last_active:100},{id:'task',title:'Fix UI',last_active:200}];
let hiddenStore={};
const hiddenAtom={get:()=>hiddenStore,set:v=>{hiddenStore=typeof v==='function'?v(hiddenStore):v;}};
const persisted={};
const storage={get:async k=>persisted[k]??null,set:async(k,v)=>{persisted[k]=v;},remove:async k=>{delete persisted[k];}};
const notifications=[];
let showInternal=false;
const bot={name:'worker',connectionId:'local'};
const state={profile:atom('worker'),connectionId:atom('local'),gateway:atom('open'),focusedStoredSessionId:atom('task'),focusedSessionOwner:atom({connectionId:'local',profile:'worker'})};
const opened=[],canon=[];
const ctx=vm.createContext({console,Promise,JSON,Date,Map,Set,
 storage,
 Pe:{state,openSession:async(id,opts)=>opened.push([id,opts]),notify:o=>notifications.push(o),notifyError:e=>{throw e;}},
 fc:()=>({t:{sidebar:{row:{}},common:{delete:'Delete'}}}),
 te:()=>({bot:{openBotChat:'Open Bot Chat',editMenu:'Edit bot',newChatWith:'New chat'},roster:{needsAttention:'Needs attention'}}),
 Ip:()=>[showInternal,v=>{showInternal=typeof v==='function'?v(showInternal):v;}],
 or:()=>{},rc:()=>({data:rows}),oc:x=>x,Xt:a=>a.get(),
 ln:atom(null),dt:atom(null),Rn:atom(null),fe:atom(null),B:atom({}),yn:atom({}),Wn:()=>null,j:()=>({}),fo:()=>false,Fr:()=>false,kt:()=>({available:true}),at:()=>[],Xl:()=>false,Wt:()=>true,
 Rt:()=>({}),Ut:()=>null,wi:()=>false,Yo:b=>b.canonical_session?.id,Ne:b=>b.name,Y:b=>b.name,Ql:()=>({}),Mo:x=>x,ee:x=>x,U:b=>b.name,et:b=>`${b.connectionId}::${b.name}`,an:()=>true,
 q:(type,props)=>({type,props}),ot:(type,props,key)=>({type,props,key}),Zt:(...x)=>x.filter(Boolean).join(' '),We:()=>'',gc:n=>String(n),
 xi:async(b,opts)=>canon.push([b,opts]),we:b=>b.route||null,Ln:()=>{},jn:b=>{},ct:()=>{},
 Gn:'icon',je:'avatar',ho:'tip',Gp:'lead',Pp:'status',pc:'row',cc:'context',dc:'context-trigger',uc:'context-content',Ft:'context-item',Vo:'context-separator',mu:'dropdown',fu:'dropdown-trigger',pu:'dropdown-content',_n:'dropdown-item',ji:'dropdown-separator',nr:'action',qf:'caret',
 // tt is replaced by a persistence-capturing stub below via ctx.tt
 tt:async(b,t)=>{persisted.__tt=Object.assign(persisted.__tt||{},t);return{serverPersisted:true,serverOutcome:'persisted'};},
 ar:()=>{},St:r=>`${r?.connectionId||'local'}::${r?.profile||r?.name||'default'}`,we:b=>null,le:()=>({storage}),
});
vm.runInContext(segment('function botsModSessionLabel(','function rc('),ctx);
vm.runInContext(segment('var bp=','var wp='),ctx);
vm.runInContext(segment('function botsModIsInternalSession','import{CHAT_EMPTY_AREA'),ctx);
vm.runInContext(segment('const botsModLifecycleCss=','function yc(').replace(/import \{useEffect as botsModArchiveEffect\} from 'react';/,''),ctx);
// Hidden-mode block lives between var Er= and function fo(.
vm.runInContext(segment('var botsModHiddenBots','function fo('),ctx);
ctx.botsModShowInternal=atom(false);ctx.botsModCompactCss='';ctx.botsModArchiveEffect=()=>{};
const walk=n=>n&&typeof n==='object'?[n,...[n.props?.children].flat(Infinity).flatMap(walk)]:[];
const render=()=>walk(ctx.hc({bot,onDelete:()=>{},onEdit:()=>{},onGroup:()=>{}}));

test('hide bot is opt-in: a default bot renders with all rows',()=>{
 const tree=render();
 assert.equal(tree.filter(n=>n.className==='bots-mod-session-row group row-hover relative').length,2);
 assert.equal(Object.keys(hiddenStore).length,0,'No bot is hidden by default');
});

test('Hide bot removes roster/shelf rows and persists the decision',async()=>{
 const menu=render().find(n=>n.type==='dropdown'&&n.props.children[0].props.children.props['aria-label']==='Options for worker');
 const items=menu.props.children[1].props.children.filter(Boolean);
 const hide=items.find(n=>n.props.children==='Hide bot');
 assert.ok(hide,'Options menu must offer Hide bot');
 hide.props.onSelect();
 await new Promise(r=>setTimeout(r,0));
 assert.equal(hiddenStore['local::worker']?.name,'worker');
 assert.equal(persisted['hidden-bots-v1']['local::worker']?.name,'worker','Hide decision must persist via plugin storage');
 assert.equal(persisted.__tt?.hidden,true,'Hide also records hidden=true in bot metadata');
 assert.equal(render().filter(n=>n.className==='bots-mod-session-row group row-hover relative').length,0,'Hidden bot renders no session rows');
 assert.equal(render().find(n=>n.props?.['data-bots-compact'])?.props['data-bots-compact'],'true');
});

test('the global internal-chat eye toggle cannot reveal an explicitly hidden bot',()=>{
 showInternal=true;ctx.botsModShowInternal.set(true);
 assert.equal(render().filter(n=>n.className==='bots-mod-session-row group row-hover relative').length,0,'Eye toggle must not override explicit per-bot hiding');
 ctx.botsModShowInternal.set(false);showInternal=false;
});

test('newly arriving sessions stay hidden for a hidden bot',()=>{
 rows.push({id:'fresh',title:'New task',last_active:300});
 assert.equal(render().filter(n=>n.className==='bots-mod-session-row group row-hover relative').length,0);
});

test('Show bot restores visibility subject to the internal-chat filter',async()=>{
 const menu=render().find(n=>n.type==='dropdown'&&n.props.children[0].props.children.props['aria-label']==='Options for worker');
 const items=menu.props.children[1].props.children.filter(Boolean);
 const show=items.find(n=>n.props.children==='Show bot');
 assert.ok(show,'Hidden bot menu must offer Show bot');
 show.props.onSelect();
 await new Promise(r=>setTimeout(r,0));
 assert.deepEqual(hiddenStore,{},'Restore clears the persisted hidden entry');
 assert.equal(persisted.__tt?.hidden,false,'Restore records hidden=false in bot metadata');
 // Internal Bot Chat stays filtered by the global eye toggle; user sessions return.
 assert.equal(render().filter(n=>n.className==='bots-mod-session-row group row-hover relative').length,1);
 rows.splice(rows.findIndex(r=>r.id==='fresh'),1);
});

test('canonical navigation still opens internal activity even while hidden',()=>{
 // Access preserved via Open internal activity, without un-hiding the bot.
 const tree=render().filter(n=>n.props?.['data-bots-action']==='open-canonical');
 assert.equal(tree.length,1,'Hidden bot keeps its Open internal activity target');
});
