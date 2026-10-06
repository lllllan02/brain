import {T} from './theme';

// Every topic comes from the single category property; tags do not determine groups.
const topicId = category => 'topic:' + encodeURIComponent(category);
const uncategorizedId = 'topic:uncategorized:';
export const moduleOf = (graph, node, preferred) => graph.modules.find(m => m.id === preferred && node?.modules?.includes(m.id)) || graph.modules.find(m => m.id === node?.module) || null;
export function buildGraph(library){
 const topics = new Map();
 const memberships = new Map();
 for(const doc of library.documents){
  const category = (doc.category || '').trim();
  const id = category ? topicId(category) : uncategorizedId;
  topics.set(id,category || '未分类');
  const ids = [id];
  memberships.set(doc.id,ids);
 }
 const modules = [...topics].sort((a,b)=>a[1].localeCompare(b[1],'zh-CN')).map(([id,title],i,all)=>{
  const hue = Math.floor(rng(id)()*360);
  return {id,title,en:'',kind:id,folder:'folder:'+id,angle:-90+i*360/all.length,icon:'tag',color:hslHex(hue,.55,.8),filter:`hue-rotate(${hue}deg) saturate(1)`,flip:i%2?-1:1};
 });
 const styles = Object.fromEntries(modules.map(m=>[m.id,{color:m.color,filter:m.filter,flip:m.flip}]));
 const kinds = {core:{label:'知识宇宙',en:'Cosmos',color:T.kinds.core},folder:{label:'主题',en:'Topic',color:T.kinds.folder},...Object.fromEntries(modules.map(m=>[m.kind,{label:m.title,en:m.en,color:m.color}]))};
 const nodes=[{id:'core',kind:'core',title:'知识宇宙',body:'',tags:[]},...modules.map(m=>({id:m.folder,title:m.title,angle:m.angle,kind:'folder',tags:[]}))];
 for(const doc of library.documents){const ids=memberships.get(doc.id),module=modules.find(m=>m.id===ids[0]);nodes.push({...doc,kind:module.kind,module:module.id,modules:ids,folder:module.folder,text:doc.title+' '+doc.body,short:doc.title});}
 const index=new Map(nodes.map(n=>[n.id,n])),edgeMap=new Map();
 const link=(s,t,kind)=>{if(s===t||!index.has(s)||!index.has(t))return;const [a,b]=s<t?[s,t]:[t,s];const key=JSON.stringify([a,b,kind]);const e=edgeMap.get(key)||{a,b,kind,ab:0,ba:0,w:1};if(s===a)e.ab++;else e.ba++;edgeMap.set(key,e);};
 for(const m of modules){link('core',m.folder,'contain');for(const n of nodes.filter(n=>n.modules?.includes(m.id)))link(m.folder,n.id,'contain');}
 for(const doc of library.documents)for(const ref of doc.references)link(doc.id,ref.id,'wiki');
 const links=[...edgeMap.values()].map(e=>({...e,both:e.ab>0&&e.ba>0,s:e.ab?e.a:e.b,t:e.ab?e.b:e.a}));
 for(const n of nodes){n.in=0;n.out=0;n.deg=0;n.mutual=0;}
 for(const l of links){if(l.kind==='contain')continue;const a=index.get(l.a),b=index.get(l.b);a.deg++;b.deg++;if(l.both){a.mutual++;b.mutual++;a.in++;b.in++;a.out++;b.out++;}else{index.get(l.s).out++;index.get(l.t).in++;}}
 return {nodes,links,index,modules,kinds,styles,public:Boolean(library.public)};
}
function hslHex(h,s,l){
 const a=s*Math.min(l,1-l);
 const channel=n=>{const k=(n+h/30)%12;return Math.round(255*(l-a*Math.max(-1,Math.min(k-3,9-k,1)))).toString(16).padStart(2,'0');};
 return '#'+channel(0)+channel(8)+channel(4);
}
function rng(seed) { let s = 0; for (const c of seed) s = (s * 31 + c.charCodeAt(0)) >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const rad = d => d * Math.PI / 180;

export function forceLayout(graph) {
  const N = graph.nodes, idx = graph.index;
  const FOLDERS = graph.modules.map(m=>({id:m.folder,angle:m.angle}));
  const CONTENT = new Set(graph.modules.map(m=>m.kind));
  const anchor = id => {
    const n = idx.get(id);
    const f = FOLDERS.find(f => f.id === n.folder || f.id === id);
    return f ? [Math.cos(rad(f.angle)), Math.sin(rad(f.angle))] : null;
  };
  for (const n of N) {
    const r = rng(n.id), a = anchor(n.id);
    const R = n.kind === 'core' ? 0 : n.kind === 'folder' ? (n.level ? 300 : 210) : CONTENT.has(n.kind) ? 330 : 420;
    const base = a ? Math.atan2(a[1], a[0]) : r() * Math.PI * 2;
    const ang = base + (r() - .5) * (a ? 1.1 : 6.28);
    n.x = Math.cos(ang) * R * (0.8 + r() * .4); n.y = Math.sin(ang) * R * (0.8 + r() * .4); n.vx = 0; n.vy = 0;
  }
  const rest = {contain: 120, wiki: 95, source: 90, tag: 52, mention: 135, resonance: 170};
  const strength = {contain: .05, wiki: .06, source: .08, tag: .09, mention: .018, resonance: .006};
  for (let it = 0; it < 520; it++) {
    const alpha = 1 - it / 520;
    for (let i = 0; i < N.length; i++) for (let j = i + 1; j < N.length; j++) {
      const A = N[i], B = N[j];
      let dx = B.x - A.x, dy = B.y - A.y, d2 = dx * dx + dy * dy || .01;
      const charge = (A.kind === 'tag' || B.kind === 'tag' ? 900 : 2600) * (A.kind === 'folder' && B.kind === 'folder' ? 3 : 1);
      const f = charge / d2 * alpha, d = Math.sqrt(d2);
      dx /= d; dy /= d;
      A.vx -= dx * f; A.vy -= dy * f; B.vx += dx * f; B.vy += dy * f;
    }
    for (const l of graph.links) {
      const A = idx.get(l.a), B = idx.get(l.b);
      const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || .01;
      const k = (d - rest[l.kind]) * strength[l.kind] * alpha;
      A.vx += dx / d * k; A.vy += dy / d * k; B.vx -= dx / d * k; B.vy -= dy / d * k;
    }
    for (const n of N) {
      const a = anchor(n.id);
      if (n.kind === 'folder' && a) { const R = n.level ? 300 : 230; n.vx += (a[0] * R - n.x) * .04; n.vy += (a[1] * R - n.y) * .04; }
      else if (a && CONTENT.has(n.kind)) { n.vx += (a[0] * 380 - n.x) * .006; n.vy += (a[1] * 380 - n.y) * .006; }
      else if (a) { n.vx += (a[0] * 300 - n.x) * .004; n.vy += (a[1] * 300 - n.y) * .004; }
      n.vx -= n.x * .002; n.vy -= n.y * .002;
      if (n.kind === 'core') { n.x = 0; n.y = 0; n.vx = 0; n.vy = 0; continue; }
      n.x += n.vx; n.y += n.vy; n.vx *= .55; n.vy *= .55;
    }
  }
  return Object.fromEntries(N.map(n => [n.id, [n.x, n.y * .82]]));
}

