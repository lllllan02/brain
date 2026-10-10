import React,{useCallback,useEffect,useMemo,useState} from 'react';
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
const staticPages=typeof __STATIC_PAGES__!=='undefined'&&__STATIC_PAGES__;
function App(){
 const [library,setLibrary]=useState(null),[error,setError]=useState('');
 const [reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
 useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)');const change=()=>setReduced(media.matches);media.addEventListener('change',change);return()=>media.removeEventListener('change',change);},[]);
 useEffect(()=>{let active=true;const load=async()=>{try{const r=await fetch(staticPages?import.meta.env.BASE_URL+'library.json':'/api/library');if(!r.ok)throw Error('无法读取文档');const next=await r.json();if(active)setLibrary(old=>old?.version===next.version?old:next);}catch(e){if(active)setError(e.message);}};load();const timer=staticPages?null:setInterval(()=>{if(!document.hidden)load();},4000);return()=>{active=false;clearInterval(timer);};},[]);
 const graph=useMemo(()=>library?buildGraph(library):null,[library]);
 const reading=useReadingHistory(graph);
 const setFocus=useCallback(next=>reading.navigate(next.sel?'#/doc/'+encodeURIComponent(next.sel):next.mod?'#/module/'+next.mod:'#/'),[reading.navigate]);
 const route=parseReadingRoute(reading.location.url), node=graph?.index.get(route.id);
 const focus=node?.module?{mod:moduleOf(graph,node).id,sel:node.id}:{mod:graph?.modules.some(m=>m.id===route.module)?route.module:null,sel:null};
 if(!graph)return <div className="neural loading-screen">{error||`正在打开${CONFIG.brand.name}…`}</div>;
 return <div className="neural page-home"><Home graph={graph} focus={focus} setFocus={setFocus} reading={reading} reduced={reduced}/></div>;
}
createRoot(document.getElementById('root')).render(<App/>);
