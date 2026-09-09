import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {test} from 'node:test';
const source=readFileSync(process.argv[2] || new URL('./plugin.js',import.meta.url),'utf8');
function harness(){
 const segment=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
 const atom=v=>({get:()=>v,set:n=>v=n});
 const bot={name:'alice',connectionId:'local',canonical_session:{id:'canonical'}};
 const rows=[{id:'canonical',title:'Bot Chat',last_active:100},{id:'other',title:'Fix UI',last_active:200}];
 const opened=[],canon=[]; let collapsed=false;
 const state={profile:atom('alice'),connectionId:atom('local'),gateway:atom('open'),focusedStoredSessionId:atom('other'),focusedSessionOwner:atom({connectionId:'local',profile:'alice'})};
 const ctx=vm.createContext({console,Promise,JSON,Date,Map,Yq:atom,
  Pe:{state,openSession:async(id,opts)=>opened.push([id,opts]),notifyError:e=>{throw e;}},
  fc:()=>({t:{sidebar:{row:{}},common:{delete:'Delete'}}}),te:()=>({bot:{openBotChat:'Open Bot Chat',editMenu:'Edit bot',newChatWith:'New chat'},roster:{needsAttention:'Needs attention'}}),
  Ip:()=>[collapsed,v=>{collapsed=typeof v==='function'?v(collapsed):v;}],or:()=>{},rc:()=>({data:rows}),oc:x=>x,Xt:a=>a.get(),
  ln:atom(null),dt:atom(null),Rn:atom(null),fe:atom(null),B:atom({}),yn:atom({}),Wn:()=>null,j:()=>({}),fo:()=>false,Fr:()=>false,kt:()=>({available:true}),at:()=>[],Xl:()=>false,Wt:()=>true,
  Rt:()=>({}),Ut:()=>null,wi:()=>false,Yo:b=>b.canonical_session?.id,Ne:b=>b.name,Y:b=>b.name,Ql:()=>({}),Mo:x=>x,ee:x=>x,U:b=>b.name,et:b=>`${b.connectionId}::${b.name}`,an:()=>true,
  q:(type,props)=>({type,props}),ot:(type,props,key)=>({type,props,key}),Zt:(...x)=>x.filter(Boolean).join(' '),We:()=>'',gc:n=>String(n),
  xi:async(b,opts)=>canon.push([b,opts]),we:b=>b.route||null,
  Ln:()=>{},jn:b=>ctx.dt.set(b.name),ct:(key,b)=>{ctx.scope=key;},

  Gn:'icon',je:'avatar',ho:'tip',Gp:'lead',Pp:'status',pc:'row',cc:'context',dc:'context-trigger',uc:'context-content',Ft:'context-item',Vo:'context-separator',mu:'dropdown',fu:'dropdown-trigger',pu:'dropdown-content',_n:'dropdown-item',ji:'dropdown-separator',nr:'action',qf:'caret'
 });
 vm.runInContext(segment('function botsModSessionLabel(','function rc('),ctx);
 vm.runInContext(segment('var bp=','var wp='),ctx);
 ctx.botsModShowInternal=atom(false);ctx.botsModCompactCss='';ctx.botsModArchiveEffect=()=>{};
 vm.runInContext(segment('function botsModIsInternalSession','import{CHAT_EMPTY_AREA'),ctx);
 vm.runInContext(segment('const botsModLifecycleCss=','function yc(').replace(/import \{useEffect as botsModArchiveEffect\} from 'react';/,''),ctx);
 const walk=n=>n&&typeof n==='object'?[n,...[n.props?.children].flat(Infinity).flatMap(walk)]:[];
 const render=()=>walk(ctx.hc({bot,onDelete:()=>{},onEdit:()=>{},onGroup:()=>{}}));
 return {ctx,bot,rows,state,opened,canon,render};
}
test('session titles keep canonical identity instead of substituting message previews',()=>{
 const h=harness();
 assert.equal(h.ctx.botsModSessionLabel({title:'Bot Chat',preview:'An unrelated question'},'alice'),'Bot Chat');
 assert.equal(h.ctx.botsModSessionLabel({title:'  Fix UI  '},'alice'),'Fix UI');
 assert.equal(h.ctx.botsModSessionLabel({preview:'You: Untitled work\nMore text'},'alice'),'Untitled work');
});
test('sessions use real last activity, not local message-count watermarks or special title buckets',()=>{
 const h=harness();
 const rows=[{id:'old',title:'Work',started_at:1,last_active:2},{id:'bot',title:'Bot Chat',started_at:3,last_active:20},{id:'new',title:'Other',started_at:10,last_active:10}];
 assert.equal(h.ctx.oc(rows).map(r=>r.id).join(','),'bot,new,old');
 assert.equal(rows[0].id,'old','Do not mutate the query cache');
});
test('session navigation preserves remote owner and canonical resolved selection',async()=>{
 const h=harness();
 h.bot.sourceScoped=true;h.bot.connectionId='remote';h.bot.targetProfile='worker';
 h.bot.route={connectionId:'remote',profile:'alice',targetProfile:'worker',mode:'remote'};
 const row=h.render().find(n=>n.type==='row'&&n.props.title==='Fix UI');
 await row.props.onClick();
 assert.equal(h.opened[0][0],'other');
 assert.equal(h.opened[0][1].route,h.bot.route,'Never fall back to the active gateway for a remote bot');
 assert.equal(h.opened[0][1].workspaceOwnerKey,'remote::alice');
 h.state.focusedSessionOwner.set({connectionId:'local',profile:'worker'});
 assert.equal(h.render().filter(n=>n.props?.['aria-current']==='page').length,0);
 h.state.focusedSessionOwner.set({connectionId:'remote',profile:'worker'});
 assert.equal(h.render().filter(n=>n.props?.['aria-current']==='page').length,1);
 h.ctx.botsModShowInternal.set(true);
 h.rows[0].resolved_id='tip';h.state.focusedStoredSessionId.set('tip');
 assert.equal(h.render().filter(n=>n.props?.['aria-current']==='page').length,1);
});
test('opening another bots session changes roster ownership before host navigation',async()=>{
 const h=harness();h.ctx.dt.set('ops');h.ctx.scope='local::ops';
 h.state.focusedSessionOwner.set({connectionId:'local',profile:'ops'});
 const open=h.ctx.Pe.openSession;
 h.ctx.Pe.openSession=async(...args)=>{
  assert.equal(h.ctx.dt.get(),'alice','Roster refresh must not restore Ops');
  assert.equal(h.ctx.scope,'local::alice');
  return open(...args);
 };
 await h.render().find(n=>n.type==='row'&&n.props.title==='Fix UI').props.onClick();
 assert.equal(h.opened.length,1);
});
test('agent sections stay expanded and have no disclosure controls',()=>{
 const h=harness(),tree=h.render();
 assert.equal(tree.filter(n=>n.props?.['aria-expanded']!==undefined).length,0);
 assert.equal(tree.filter(n=>n.type==='caret').length,0);
 assert.equal(tree.filter(n=>n.type==='status').length,1);
});
test('bot name opens canonical chat; options use a separate button, without a card',async()=>{
 const h=harness(),tree=h.render();
 const name=tree.find(n=>n.props?.['data-bots-action']==='open-canonical');
 assert.ok(name,'Agent name must be a primary navigation target, not the options dropdown');
 assert.ok(name.props.className.includes('justify-center'),'Center avatar and name together');
 assert.ok(!name.props.children.find(n=>n?.type==='span'&&n.props.children==='alice').props.className.includes('flex-1'),'Name must not consume the centering space');
 await name.props.onClick();
 assert.equal(h.canon.length,1); assert.equal(h.canon[0][1].canonical,true);
 assert.ok(tree.some(n=>n.type==='dropdown-trigger' && n.props.children.props['aria-label']==='Options for alice'));
 assert.ok(!tree.some(n=>n.props?.style?.border),'Do not box every agent in a card');
});
