import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Icon} from './icons';
import {LinkPreview} from './LinkPreview';
import {ReaderRelations} from './ReaderRelations';
export function DocumentReader({graph,node,module,cluster,onCluster,onClose,onPreview}){
 const ref=useRef(null);const [full,setFull]=useState(false);const [copy,setCopy]=useState('');
 useEffect(()=>{const scroll=()=>{const part=location.hash.split('/')[3];if(!part)return;requestAnimationFrame(()=>{const id=decodeURIComponent(part);const target=[...ref.current.querySelectorAll('[id]')].find(el=>el.id===id);target?.scrollIntoView({block:'start'});});};scroll();window.addEventListener('hashchange',scroll);return()=>window.removeEventListener('hashchange',scroll);},[node.id,node.html]);
 useEffect(()=>{const wrap=ref.current.closest('.analysis-wrap');wrap.classList.toggle('full-reader',full);return()=>wrap.classList.remove('full-reader');},[full]);
 const article=useMemo(()=><article className="markdown" dangerouslySetInnerHTML={{__html:node.html}}/>,[node.html]);
 const externalLinks=useMemo(()=>{
  // Read rendered anchors, so code samples, internal references and attachments
  // cannot accidentally become external links. Template content stays inert.
  const template=document.createElement('template');template.innerHTML=node.html;
  const links=new Map();
  for(const anchor of template.content.querySelectorAll('a[href]')){
   try{
    const url=new URL(anchor.getAttribute('href'));
    if(!['http:','https:','mailto:'].includes(url.protocol)||links.has(url.href))continue;
    const title=anchor.textContent.replace(/\s*↗\s*$/,'').trim()||url.href;
    links.set(url.href,{href:url.href,title});
   }catch{/* Relative document links and local attachments stay in the article. */}
  }
  return [...links.values()];
 },[node.html]);
 const handleClick=async e=>{const button=e.target.closest('.copy-code');if(!button)return;try{await navigator.clipboard.writeText(button.closest('.code-block').querySelector('code').textContent);button.textContent='已复制';setTimeout(()=>button.textContent='复制',1800);}catch{setCopy('请手动选择代码进行复制。');}};
 return <section className="analysis glass document-reader" ref={ref}>
  <div className="an-float">文档阅读 <em>Read document</em></div>
  <div className="an-scroll" onClick={handleClick}>
   <div className="an-title-row">
    <h2>{node.title}</h2>
    <div className="read-actions">
     <button className="icon-btn" aria-label="切换专注阅读" title="专注阅读" onClick={()=>setFull(v=>!v)}><Icon name="expand" size={14}/></button>
     <button className="icon-btn" aria-label="关闭文档" onClick={onClose}><Icon name="close" size={14}/></button>
    </div>
   </div>
   <ReaderRelations graph={graph} node={node} module={module} cluster={cluster} onChoose={next=>{setFull(false);onCluster(next);}}/>
   <p className="read-meta">{node.updated?'更新于 '+node.updated+' · ':''}知识笔记 · {Math.max(1,Math.ceil(node.body.length/500))} 分钟阅读</p>
   {node.toc.length>0&&<details className="read-toc"><summary>本页目录 <em>Contents</em></summary>{node.toc.map(h=><a key={h.id} href={`#/doc/${encodeURIComponent(node.id)}/${encodeURIComponent(h.id)}`}>{h.title}</a>)}</details>}{article}{copy&&<p role="status">{copy}</p>}
   {externalLinks.length>0&&<section className="read-connections" aria-label="外部链接">
    <h3>外部链接 <em>External links</em></h3>
    {externalLinks.map(link=><a key={link.href} className="read-relation read-external-link" href={link.href} target="_blank" rel="noopener noreferrer" title={link.href}>
     <span><strong>{link.title}</strong><small>{link.href}</small></span><Icon name="outlink" size={13}/>
    </a>)}
   </section>}
   {node.issues.length>0&&<p className="quiet read-link-issues">未解析引用：{node.issues.map(i=>i.target+'（'+i.reason+'）').join('、')}</p>}
   <p className="read-path">{node.path}</p></div><LinkPreview readerRef={ref} graph={graph} onPreview={onPreview}/></section>;
}
