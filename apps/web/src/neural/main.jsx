import {CONTENT_COLLECTIONS,collectionLabel} from '../collections.js';
import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {buildGraph,moduleOf} from './graph';
import {Home} from './Home';
import {CONFIG} from '../config';
import {useReadingHistory} from './useReadingHistory';
import {parseReadingRoute} from './reading-history';
import './neural.css';
import './documents.css';
import './horizon-theme.css';
import './controls.css';
import './layers.css';
const staticPages=typeof __STATIC_PAGES__!=='undefined'&&__STATIC_PAGES__;
const localEditing=!staticPages&&location.protocol==='http:'&&['localhost','127.0.0.1'].includes(location.hostname);
function App(){
 const [library,setLibrary]=useState(null),[error,setError]=useState('');
 const revision=useRef(0),busy=useRef(false);
 const [moveState,setMoveState]=useState({pending:false});
 useEffect(()=>{
  if(moveState.pending||!moveState.id)return;
  const timer=setTimeout(()=>setMoveState({pending:false}),moveState.error?4500:2400);
  return()=>clearTimeout(timer);
 },[moveState]);
 const [reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
 useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)');const change=()=>setReduced(media.matches);media.addEventListener('change',change);return()=>media.removeEventListener('change',change);},[]);
 useEffect(()=>{let active=true;const load=async()=>{if(busy.current)return;const ticket=revision.current;try{const r=await fetch(staticPages?import.meta.env.BASE_URL+'library.json':'/api/library');if(!r.ok)throw Error('无法读取文档');const next=await r.json();if(active&&ticket===revision.current&&!busy.current)setLibrary(old=>old?.version===next.version?old:next);}catch(e){if(active)setError(e.message);}};load();const timer=staticPages?null:setInterval(()=>{if(!document.hidden)load();},4000);return()=>{active=false;clearInterval(timer);};},[]);
 const move=useCallback(async(doc,collection)=>{
  if(!localEditing||busy.current)return;
  busy.current=true;revision.current++;setMoveState({id:doc.id,pending:true});
  try{
   const response=await fetch('/api/documents/move',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:doc.id,collection,version:library.version})});
   const next=await response.json();
   if(!response.ok)throw Error(next.error||'移动失败');
   setLibrary(next);setMoveState({id:doc.id,pending:false,collection});
  }catch(error){setMoveState({id:doc.id,pending:false,error:error.message});}
  finally{busy.current=false;revision.current++;}
 },[library]);
 const collectionAction=localEditing?{...moveState,move}:null;
 const graph=useMemo(()=>library?buildGraph(library):null,[library]);
 const reading=useReadingHistory(graph);
 const setFocus=useCallback(next=>reading.navigate(next.sel?'#/doc/'+encodeURIComponent(next.sel):next.mod?'#/module/'+next.mod:'#/'),[reading.navigate]);
 const route=parseReadingRoute(reading.location.url), node=graph?.index.get(route.id);
 const focus=node?.module?{mod:moduleOf(graph,node).id,sel:node.id}:{mod:(graph?.modules.some(m=>m.id===route.module)||CONTENT_COLLECTIONS.some(c=>route.module===`collection:${c}`))?route.module:null,sel:null};
 if(!graph)return <div className="neural loading-screen">{error||`正在打开${CONFIG.brand.name}…`}</div>;
 return <div className="neural page-home"><Home collectionAction={collectionAction} graph={graph} focus={focus} setFocus={setFocus} reading={reading} reduced={reduced}/>{moveState.id&&!moveState.pending&&<div key={revision.current} className="collection-move-toast" role="status" aria-live="polite" style={{'--toast-duration':moveState.error?'4500ms':'2400ms'}}>{moveState.error||`已移入 ${collectionLabel(moveState.collection)}`}</div>}</div>;
}
createRoot(document.getElementById('root')).render(<App/>);
