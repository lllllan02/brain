import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {buildGraph,moduleOf} from './graph';
import {Home} from './Home';
import './neural.css';
import './documents.css';
const staticPages=typeof __STATIC_PAGES__!=='undefined'&&__STATIC_PAGES__;
function App(){
 const [library,setLibrary]=useState(null),[error,setError]=useState(''),[focus,updateFocus]=useState({mod:null,sel:null});
 const reduced=useMemo(()=>matchMedia('(prefers-reduced-motion: reduce)').matches,[]);
 useEffect(()=>{let active=true;const load=async()=>{try{const r=await fetch(staticPages?import.meta.env.BASE_URL+'library.json':'/api/library');if(!r.ok)throw Error('无法读取文档');const next=await r.json();if(active)setLibrary(old=>old?.version===next.version?old:next);}catch(e){if(active)setError(e.message);}};load();const timer=staticPages?null:setInterval(()=>{if(!document.hidden)load();},4000);return()=>{active=false;clearInterval(timer);};},[]);
 const graph=useMemo(()=>library?buildGraph(library):null,[library]);
 const setFocus=useCallback(next=>{updateFocus(next);history.pushState(null,'',next.sel?'#/doc/'+encodeURIComponent(next.sel):next.mod?'#/module/'+next.mod:'#/');},[]);
 useEffect(()=>{if(!graph)return;const route=()=>{const parts=location.hash.replace(/^#\//,'').split('/');if(parts[0]==='doc'){const node=graph.index.get(decodeURIComponent(parts[1]||''));updateFocus(old=>node?.module?{mod:moduleOf(graph,node,old.mod).id,sel:node.id}:{mod:null,sel:null});}else if(parts[0]==='module'){updateFocus({mod:graph.modules.some(m=>m.id===parts[1])?parts[1]:null,sel:null});}else updateFocus({mod:null,sel:null});};route();window.addEventListener('hashchange',route);window.addEventListener('popstate',route);return()=>{window.removeEventListener('hashchange',route);window.removeEventListener('popstate',route);};},[graph]);
 if(!graph)return <div className="neural loading-screen">{error||'正在展开星云…'}</div>;
 return <div className="neural page-home"><Home graph={graph} focus={focus} setFocus={setFocus} reduced={reduced}/></div>;
}
createRoot(document.getElementById('root')).render(<App/>);
