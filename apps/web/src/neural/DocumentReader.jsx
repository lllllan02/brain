import {CONTENT_COLLECTIONS,collectionLabel} from '../collections.js';
import {useViewState} from './useViewState';
import {CollectionIcon} from './CollectionIcon';
import React,{useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {Icon} from './icons';
import {LinkPreview} from './LinkPreview';
import {ReaderRelations} from './ReaderRelations';
import {MarkdownArticle} from './MarkdownArticle';
import {ExternalLinkPreview} from './ExternalLinkPreview';
import {collectExternalLinks} from './external-links';
import {ReaderSources} from './ReaderSources';
import {copyDocumentMarkdown} from './document-sources.js';
import {useToolbarTitle} from './useToolbarTitle';
import {useReaderResize} from './useReaderResize';
export function DocumentReader({graph,node,module,cluster,onCluster,onClose,onPreview,onResize,reduced,readingLocation,onReadingScroll,navigation,collectionAction}){
 const ref=useRef(null);const [full,setFull]=useViewState('readerFull',false);const [copy,setCopy]=useState('');const [tocOpen,setTocOpen]=useViewState(`toc:${node.id}`,false);
 const [detailsOpen,setDetailsOpen]=useViewState(`details:${node.id}`,false);
 const [copying,setCopying]=useState(false);
 const titleRef=useRef(null);
 useLayoutEffect(()=>{const wrap=ref.current.closest('.analysis-wrap');wrap.classList.toggle('full-reader',full);return()=>wrap.classList.remove('full-reader');},[full]);
 const resizeHandlers=useReaderResize(ref,full,onResize);
 useEffect(()=>{if(!copy)return;const timer=setTimeout(()=>setCopy(''),4000);return()=>clearTimeout(timer);},[copy]);
 useLayoutEffect(()=>{
  const scroller=ref.current.querySelector('.an-scroll');
  const target=readingLocation?.anchor?[...scroller.querySelectorAll('[id]')].find(el=>el.id===readingLocation.anchor):null;
  const top=readingLocation?.scroll??(target?target.getBoundingClientRect().top-scroller.getBoundingClientRect().top+scroller.scrollTop:0);
  scroller.scrollTo({top,behavior:'instant'});
 },[node.id,readingLocation?.key]);

 const toolbarTitle=useToolbarTitle(ref,titleRef,node.id,readingLocation?.key);
 const canMove=collectionAction&&['inbox','notes'].every(id=>CONTENT_COLLECTIONS.includes(id))&&['inbox','notes'].includes(node.collection);
 const moveLabel=node.collection==='inbox'?`已理解，移入 ${collectionLabel('notes')}`:`重新学习，移回 ${collectionLabel('inbox')}`;
 const titleIcon=canMove?<button type="button" className="collection-toggle" title={moveLabel} aria-label={moveLabel} disabled={collectionAction.pending} aria-busy={collectionAction.pending} onClick={()=>collectionAction.move(node,node.collection==='inbox'?'notes':'inbox')}><CollectionIcon collection={node.collection}/></button>:<CollectionIcon collection={node.collection}/>;
 const relations={graph,node,module,cluster,onChoose:next=>{setFull(false);onCluster(next);}};
 const article=<MarkdownArticle html={node.html}/>;
 const externalLinks=useMemo(()=>{
  // Read rendered anchors, so code samples, internal references and attachments
  // cannot accidentally become external links. Template content stays inert.
  const template=document.createElement('template');template.innerHTML=node.html;
  return collectExternalLinks(template.content.querySelectorAll('a[href]'));
 },[node.html]);
 const copyDocument=async titleOnly=>{
  setCopy('');setCopying(true);
  try{
   await navigator.clipboard.writeText(titleOnly?node.title:copyDocumentMarkdown(node));
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
  <div className="reader-toolbar">
   <div className={`reader-toolbar-heading${toolbarTitle?' shows-title':''}${reduced?' reduced-motion':''}`}>
    <div className="reader-toolbar-context" inert={toolbarTitle} aria-hidden={toolbarTitle}><ReaderRelations {...relations} section="context"/></div>
    <div className="reader-toolbar-title" aria-hidden={!toolbarTitle} inert={!toolbarTitle} title={node.title}>{titleIcon}{node.title}</div>
   </div>
   <div className="read-actions">
    <button className="icon-btn" aria-label="切换专注阅读" aria-pressed={full} title={full?'退出专注阅读':'专注阅读'} onClick={()=>setFull(v=>!v)}><Icon name={full?"collapse":"expand"} size={16}/></button>
    <button className="icon-btn" aria-label="关闭文档" title="关闭文档（Esc）" onClick={onClose}><Icon name="close" size={16}/></button>
   </div>
  </div>
  <button type="button" className="reader-resize-handle" aria-label="调整阅读卡片大小" title="拖动调整大小，也可聚焦后使用方向键" {...resizeHandlers}><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 4v4a5 5 0 0 0 5 5h4M7 4v3a2 2 0 0 0 2 2h3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
  <div className="an-scroll" onClick={handleClick} onScroll={event=>onReadingScroll?.(readingLocation?.key,event.currentTarget.scrollTop)}>
   <header className="reader-heading">
   <div className="an-title-row">
    <h2 ref={titleRef}>{titleIcon}{node.title}</h2>
    {navigation}
   </div>
   <ReaderSources documentId={node.id} key={node.id} sources={node.sources}/>
   </header>
   <div className="reader-navigation-row">
    <ReaderRelations {...relations} section="tags"/>
    <div className="reader-disclosures">
     {node.toc.length>0&&<button type="button" aria-expanded={tocOpen} aria-controls="reader-toc" onClick={()=>{setTocOpen(v=>!v);setDetailsOpen(false);}}><Icon name="list" size={14}/>目录<Icon name="chevron" size={11}/></button>}
     <button type="button" aria-expanded={detailsOpen} aria-controls="reader-details" onClick={()=>{setDetailsOpen(v=>!v);setTocOpen(false);}}>详情<Icon name="chevron" size={11}/></button>
    </div>
   </div>
   <div id="reader-details" className="reader-details" hidden={!detailsOpen}>
   <div className="read-meta-row">
    <p className="read-meta">{node.updated&&<span title={`更新于 ${node.updated}`}><Icon name="calendar" size={13}/><span className="sr-only">更新于 </span>{node.updated}</span>}<span title="预计阅读时间"><Icon name="clock" size={13}/>{Math.max(1,Math.ceil(node.body.length/500))} 分钟</span></p>
    <div className="read-copy-actions" role="group" aria-label="复制文档">
     <button type="button" disabled={copying} aria-label="复制标题" title="复制标题" onClick={()=>copyDocument(true)}><Icon name="copy" size={14}/>标题</button>
     <button type="button" disabled={copying} aria-label="复制全文" title="复制标题、来源和 Markdown 正文" onClick={()=>copyDocument(false)}><Icon name="copy" size={14}/>全文</button>
    </div>
   </div>
   </div>
   <span className="read-copy-status" role="status" aria-atomic="true">{copy}</span>
   <div id="reader-toc" className="reader-toc-panel" hidden={!tocOpen || !node.toc.length}>{node.toc.map(h=><a key={h.id} href={`#/doc/${encodeURIComponent(node.id)}/${encodeURIComponent(h.id)}`}>{h.title}</a>)}</div>
   {article}
   {externalLinks.length>0&&<section className="read-connections" aria-label="外部链接">
    <h3>外部链接</h3>
    {externalLinks.map(link=><a key={link.href} className="read-relation read-external-link" href={link.href} target="_blank" rel="noopener noreferrer">
     <span><strong>{link.title}</strong><small>{link.href}</small></span><Icon name="outlink" size={13}/>
    </a>)}
   </section>}
   {node.issues.length>0&&<p className="quiet read-link-issues">未解析引用：{node.issues.map(i=>i.target+'（'+i.reason+'）').join('、')}</p>}
   <p className="read-path">{node.path}</p></div><ExternalLinkPreview readerRef={ref} html={node.html}/><LinkPreview reduced={reduced} readerRef={ref} graph={graph} onPreview={onPreview}/></section>;
}
