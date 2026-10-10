import React,{useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {Icon} from './icons';
import {LinkPreview} from './LinkPreview';
import {ReaderRelations} from './ReaderRelations';
import {MarkdownArticle} from './MarkdownArticle';
import {ExternalLinkPreview} from './ExternalLinkPreview';
import {useReaderResize} from './useReaderResize';
export function DocumentReader({graph,node,module,cluster,onCluster,onClose,onPreview,onResize,reduced,readingLocation,onReadingScroll,navigation,historyControl}){
 const ref=useRef(null);const [full,setFull]=useState(false);const [copy,setCopy]=useState('');const [tocOpen,setTocOpen]=useState(false);
 const [copying,setCopying]=useState(false);
 const resizeHandlers=useReaderResize(ref,full,onResize);
 useEffect(()=>{if(!copy)return;const timer=setTimeout(()=>setCopy(''),4000);return()=>clearTimeout(timer);},[copy]);
 useLayoutEffect(()=>{
  const scroller=ref.current.querySelector('.an-scroll');
  const target=readingLocation?.anchor?[...scroller.querySelectorAll('[id]')].find(el=>el.id===readingLocation.anchor):null;
  const top=readingLocation?.scroll??(target?target.getBoundingClientRect().top-scroller.getBoundingClientRect().top+scroller.scrollTop:0);
  scroller.scrollTo({top,behavior:'instant'});
 },[node.id,readingLocation?.key]);
 useEffect(()=>{const wrap=ref.current.closest('.analysis-wrap');wrap.classList.toggle('full-reader',full);return()=>wrap.classList.remove('full-reader');},[full]);
 const article=<MarkdownArticle html={node.html}/>;
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
 const handleClick=async e=>{
  const button=e.target.closest('.copy-code');if(!button||button.disabled)return;
  const label=button.closest('.diagram-block')?'复制源码':'复制代码';button.disabled=true;
  try{
   await navigator.clipboard.writeText(button.closest('.code-block').querySelector(button.closest('.diagram-block')?'.diagram-source code':'pre code').textContent);
   button.dataset.copied='true';button.title='已复制';button.setAttribute('aria-label','已复制');setCopy('代码已复制');
   setTimeout(()=>{delete button.dataset.copied;button.title=label;button.setAttribute('aria-label',label);button.disabled=false;},1800);
  }catch{button.disabled=false;setCopy('复制失败，请手动选择代码进行复制。');}
 };
 return <section className="analysis glass document-reader" data-document-id={node.id} ref={ref}>
  <div className="reader-toolbar"><div className="an-float">文档阅读</div>
   <div className="read-actions">
    <button className="icon-btn" aria-label="切换专注阅读" aria-pressed={full} title={full?'退出专注阅读':'专注阅读'} onClick={()=>setFull(v=>!v)}><Icon name={full?"collapse":"expand"} size={16}/></button>
    <button className="icon-btn" aria-label="关闭文档" title="关闭文档（Esc）" onClick={onClose}><Icon name="close" size={16}/></button>
   </div>
  </div>
  <button type="button" className="reader-resize-handle" aria-label="调整阅读卡片大小" title="拖动调整大小，也可聚焦后使用方向键" {...resizeHandlers}><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 4v4a5 5 0 0 0 5 5h4M7 4v3a2 2 0 0 0 2 2h3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
  <div className="an-scroll" onClick={handleClick} onScroll={event=>onReadingScroll?.(readingLocation?.key,event.currentTarget.scrollTop)}>
   <div className="an-title-row">
    <h2>{node.title}</h2>
    {navigation}
   </div>
   <ReaderRelations graph={graph} node={node} module={module} cluster={cluster} historyControl={{...historyControl,onToggle:()=>{setFull(false);historyControl.onToggle();}}} onChoose={next=>{setFull(false);onCluster(next);}}/>
   <div className="read-meta-row">
    <p className="read-meta">{node.updated&&<span title={`更新于 ${node.updated}`}><Icon name="calendar" size={13}/><span className="sr-only">更新于 </span>{node.updated}</span>}<span title="预计阅读时间"><Icon name="clock" size={13}/>{Math.max(1,Math.ceil(node.body.length/500))} 分钟</span></p>
    <div className="read-copy-actions" role="group" aria-label="复制文档">
     <button type="button" disabled={copying} aria-label="复制标题" title="复制标题" onClick={()=>copyDocument(true)}><Icon name="copy" size={14}/>标题</button>
     <button type="button" disabled={copying} aria-label="复制全文" title="复制标题和 Markdown 正文" onClick={()=>copyDocument(false)}><Icon name="copy" size={14}/>全文</button>
    </div>
    <span className="read-copy-status" role="status" aria-atomic="true">{copy}</span>
   </div>
   {node.toc.length>0&&<div className={`read-toc${tocOpen?' is-open':''}`}><button type="button" className="read-toc-toggle" aria-expanded={tocOpen} onClick={()=>setTocOpen(v=>!v)}><Icon name="list" size={15}/>目录<Icon name="chevron" size={13} className="toc-chevron"/></button><div className="read-toc-content" inert={!tocOpen}><div>{node.toc.map(h=><a key={h.id} href={`#/doc/${encodeURIComponent(node.id)}/${encodeURIComponent(h.id)}`}>{h.title}</a>)}</div></div></div>}{article}
   {externalLinks.length>0&&<section className="read-connections" aria-label="外部链接">
    <h3>外部链接</h3>
    {externalLinks.map(link=><a key={link.href} className="read-relation read-external-link" href={link.href} target="_blank" rel="noopener noreferrer">
     <span><strong>{link.title}</strong><small>{link.href}</small></span><Icon name="outlink" size={13}/>
    </a>)}
   </section>}
   {node.issues.length>0&&<p className="quiet read-link-issues">未解析引用：{node.issues.map(i=>i.target+'（'+i.reason+'）').join('、')}</p>}
   <p className="read-path">{node.path}</p></div><ExternalLinkPreview readerRef={ref} html={node.html}/><LinkPreview reduced={reduced} readerRef={ref} graph={graph} onPreview={onPreview}/></section>;
}
