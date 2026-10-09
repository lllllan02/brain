import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Icon} from './icons';
import {LinkPreview} from './LinkPreview';
import {ReaderRelations} from './ReaderRelations';
export function DocumentReader({graph,node,module,cluster,onCluster,onClose,onPreview,reduced}){
 const ref=useRef(null);const [full,setFull]=useState(false);const [copy,setCopy]=useState('');const [tocOpen,setTocOpen]=useState(false);
 const [copying,setCopying]=useState(false);
 useEffect(()=>{if(!copy)return;const timer=setTimeout(()=>setCopy(''),4000);return()=>clearTimeout(timer);},[copy]);
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
 const copyDocument=async titleOnly=>{
  setCopy('');setCopying(true);
  try{
   await navigator.clipboard.writeText(titleOnly?node.title:`# ${node.title}\n\n${node.body}`);
   setCopy(titleOnly?'标题已复制':'全文已复制');
  }catch{setCopy('复制失败，请手动选择内容复制。');}
  finally{setCopying(false);}
 };
 const handleClick=async e=>{const button=e.target.closest('.copy-code');if(!button)return;try{await navigator.clipboard.writeText(button.closest('.code-block').querySelector('code').textContent);button.textContent='已复制';setTimeout(()=>button.textContent='复制',1800);}catch{setCopy('请手动选择代码进行复制。');}};
 return <section className="analysis glass document-reader" ref={ref}>
  <div className="an-float">文档阅读</div>
  <div className="an-scroll" onClick={handleClick}>
   <div className="an-title-row">
    <h2>{node.title}</h2>
    <div className="read-actions">
     <button className="icon-btn" aria-label="切换专注阅读" aria-pressed={full} title={full?'退出专注阅读':'专注阅读'} onClick={()=>setFull(v=>!v)}><Icon name="expand" size={14}/></button>
     <button className="icon-btn" aria-label="关闭文档" onClick={onClose}><Icon name="close" size={14}/></button>
    </div>
   </div>
   <ReaderRelations graph={graph} node={node} module={module} cluster={cluster} onChoose={next=>{setFull(false);onCluster(next);}}/>
   <div className="read-meta-row">
    <p className="read-meta">{node.updated?'更新于 '+node.updated+' · ':''}{Math.max(1,Math.ceil(node.body.length/500))} 分钟阅读</p>
    <div className="read-copy-actions" role="group" aria-label="复制文档">
     <button type="button" disabled={copying} onClick={()=>copyDocument(true)}>复制标题</button>
     <button type="button" disabled={copying} title="复制标题和 Markdown 正文" onClick={()=>copyDocument(false)}>复制全文</button>
    </div>
    <span className="read-copy-status" role="status" aria-atomic="true">{copy}</span>
   </div>
   {node.toc.length>0&&<div className={`read-toc${tocOpen?' is-open':''}`}><button type="button" className="read-toc-toggle" aria-expanded={tocOpen} onClick={()=>setTocOpen(v=>!v)}>本页目录</button><div className="read-toc-content" inert={!tocOpen}><div>{node.toc.map(h=><a key={h.id} href={`#/doc/${encodeURIComponent(node.id)}/${encodeURIComponent(h.id)}`}>{h.title}</a>)}</div></div></div>}{article}
   {externalLinks.length>0&&<section className="read-connections" aria-label="外部链接">
    <h3>外部链接</h3>
    {externalLinks.map(link=><a key={link.href} className="read-relation read-external-link" href={link.href} target="_blank" rel="noopener noreferrer" title={link.href}>
     <span><strong>{link.title}</strong><small>{link.href}</small></span><Icon name="outlink" size={13}/>
    </a>)}
   </section>}
   {node.issues.length>0&&<p className="quiet read-link-issues">未解析引用：{node.issues.map(i=>i.target+'（'+i.reason+'）').join('、')}</p>}
   <p className="read-path">{node.path}</p></div><LinkPreview reduced={reduced} readerRef={ref} graph={graph} onPreview={onPreview}/></section>;
}
