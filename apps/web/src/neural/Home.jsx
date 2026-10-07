import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {moduleOf} from './graph';
import {CONFIG, asset} from '../config';
import {DocumentReader} from './DocumentReader';
import {ClusterList} from './ClusterList';
import {Icon} from './icons';
import '../galaxy/galaxy.css';

export function moduleItems(graph, modId) {
  return graph.nodes.filter(node => node.modules?.includes(modId))
    .sort((a, b) => (a.type === 'overview' ? 0 : 1) - (b.type === 'overview' ? 0 : 1));
}

export function Home({graph, focus, setFocus, reduced}) {
  const host = useRef(null), scene = useRef(null), searchInput = useRef(null);
  const current = useRef({focus, setFocus});
  const [labels, setLabels] = useState([]), [ready, setReady] = useState(false), [error, setError] = useState('');
  const [preset, setPreset] = useState('nebula');
  const [expanded, setExpanded] = useState(false);
  const [readerCluster, setReaderCluster] = useState(null);
  const [clusterVisible, setClusterVisible] = useState(false);
  const listAnchor = useCallback(() => scene.current?.nodeAnchor(current.current.focus.sel), []);
  const previewNode = useCallback(id => scene.current?.previewNode(id), []);
  const activeCluster = focus.sel ? readerCluster : null;
  const views = [['galaxy', '银河'], ['nebula', '星云'], ['deepfield', '深空']];
  const viewIndex = views.findIndex(([id]) => id === preset);
  const nextView = views[(viewIndex + 1) % views.length];
  const [query, setQuery] = useState(''), [searchOpen, setSearchOpen] = useState(false);
  const [reviewId, setReviewId] = useState(null);
  current.current = {focus, setFocus, preset, expanded, activeCluster};
  const documents = useMemo(() => graph.nodes.filter(node => node.module), [graph]);
  const node = graph.index.get(focus.sel);
  const reviewNode = graph.index.get(reviewId);
  const go = (id, keepCluster = false) => {
    const target = graph.index.get(id); if (!target?.module) return;
    if (!keepCluster) setReaderCluster(null);
    setQuery(''); setSearchOpen(false); searchInput.current?.blur();
    setFocus({mod: moduleOf(graph, target).id, sel: id});
  };
  const reviewRandom = () => {
    const candidates = documents.length > 1 ? documents.filter(n => n.id !== (reviewId || focus.sel)) : documents;
    const target = candidates[Math.floor(Math.random() * candidates.length)];
    if (target) {
      setQuery(''); setSearchOpen(false); searchInput.current?.blur();
      setReviewId(target.id);
    }
  };
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) return documents.filter(n => [n.title, n.category, ...n.aliases, ...n.tags, n.body].join(' ').toLowerCase().includes(q));
    return [];
  }, [query, documents]);
  useEffect(() => {
    let active = true, instance;
    setError(''); setReady(false); setLabels([]);
    import('../galaxy/scene').then(({createGalaxy}) => {
      if (!active) return;
      instance = createGalaxy(host.current, graph, {
        onLabels: next => { if (active) setLabels(next); },
        onReady: value => { if (active) setReady(value); },
        onError: message => { if (active) setError(message); },
        onReset: () => {setReaderCluster(null);current.current.setFocus({mod: null, sel: null});},
        onSelect: id => {
          setReaderCluster(null);
          const target = graph.index.get(id);
          if (target?.module) current.current.setFocus({mod: target.module, sel: id});
        },
      }, reduced);
      scene.current = instance;
      const cluster = current.current.activeCluster;
      instance.focus(cluster ? null : current.current.focus.sel, cluster ? cluster.category : current.current.focus.mod, cluster?.tag, current.current.focus.sel);
      instance.pause(reduced);
      if (current.current.preset !== 'nebula') instance.preset(current.current.preset);
      instance.expand(current.current.expanded);
    }).catch(() => {
      if (active) setError('当前浏览器无法显示三维星云，可通过下方搜索继续阅读。');
    });
    return () => { active = false; instance?.dispose(); scene.current = null; };
  }, [graph, reduced]);
  useEffect(() => { if (!focus.sel) setReaderCluster(null); }, [focus.sel]);
  useEffect(() => {
    scene.current?.focus(activeCluster ? null : focus.sel, activeCluster ? activeCluster.category : focus.mod, activeCluster?.tag, focus.sel);
  }, [focus.sel, focus.mod, activeCluster]);
  const showReaderCluster = cluster => {
    setReaderCluster(cluster);
    if (expanded) {setExpanded(false);scene.current?.expand(false);}
  };
  useEffect(() => {
    const key = event => {
      if (document.querySelector('[role="dialog"]')) return;
      const typing = event.target.closest('input,textarea,[contenteditable="true"]');
      if ((event.key === '/' && !typing) || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k')) {
        event.preventDefault(); searchInput.current?.focus();
      }
      if (event.key === 'Escape') {
        if (query) { setQuery(''); return; }
        setSearchOpen(false);
        searchInput.current?.blur();
        setFocus({mod: null, sel: null});
      }
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, [focus, query, setFocus]);
  const reset = () => { setQuery(''); setSearchOpen(false); searchInput.current?.blur(); setFocus({mod: null, sel: null}); scene.current?.reset(); };
  return <section className={`galaxy-page ${node ? 'galaxy-reading' : ''} ${activeCluster || clusterVisible ? 'galaxy-browsing' : ''}`} aria-label="知识星云">
    <div className={`galaxy-viewport ${!ready || error ? 'is-loading' : ''}`} ref={host}>
      <div className="galaxy-frame" aria-hidden="true"/>
      <div className="galaxy-labels">{ready && !error && labels.map(label => label.category ?
        <button key={label.id} className="galaxy-category-label" style={{left: label.x, top: label.y}} onPointerEnter={() => scene.current?.hoverCategory(label.id)} onPointerLeave={() => scene.current?.hoverCategory(null)} onFocus={() => scene.current?.hoverCategory(label.id)} onBlur={() => scene.current?.hoverCategory(null)} onClick={() => setFocus({mod: label.id, sel: null})} aria-label={`查看${label.title}分类`}>{label.title}</button> :
        <React.Fragment key={label.id}>
          {label.current && <svg className="galaxy-current-marker" aria-hidden="true" viewBox="-20 -20 40 40" style={{left: label.x, top: label.y}}>
            <path d="M -8 -17 H -17 V -8 M 8 -17 H 17 V -8 M -8 17 H -17 V 8 M 8 17 H 17 V 8"/>
          </svg>}
          <span className={`galaxy-label${label.current ? ' is-current' : ''}${label.preview ? ' is-preview' : ''}`} aria-hidden="true" style={{left: label.x, top: label.y}}>{label.title}</span>
        </React.Fragment>
      )}</div>
    </div>
    <header className="galaxy-header">
      <a className="galaxy-brand" href="#/" aria-label={`${CONFIG.brand.name}，回到全景`} onClick={event => {event.preventDefault();reset();}}>
        <img src={asset('nebula-logo.svg')} width="34" height="34" alt=""/><span>{CONFIG.brand.name}</span>
      </a>
    </header>
    <div className={`galaxy-search-dock${reviewNode?.module ? ' has-review' : ''}`} onBlur={event => {if (!event.currentTarget.contains(event.relatedTarget)) setSearchOpen(false);}}>
      {searchOpen && query.trim() && <div className="galaxy-results" id="galaxy-search-results" role="region" aria-label="搜索结果">
        <p role="status">{results.length ? `${results.length} 篇文档` : '没有找到相关内容'}</p>
        {results.map(n => <button key={n.id} onClick={() => go(n.id)}><span>{n.title}</span><small>{n.category || '未分类'}</small></button>)}
      </div>}
      <form className="galaxy-search" role="search" onSubmit={event => {event.preventDefault();if(results.length)go(results[0].id);}}>
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>
        <input ref={searchInput} value={query} onFocus={() => setSearchOpen(true)} onChange={event => {setQuery(event.target.value);setSearchOpen(true);}} placeholder="搜索星空中的知识" aria-label="搜索标题、别名、标签或正文" aria-controls="galaxy-search-results" autoComplete="off" onKeyDown={event => {
          if(event.key === 'ArrowDown') {event.preventDefault();event.currentTarget.closest('.galaxy-search-dock').querySelector('.galaxy-results button')?.focus();}
        }}/>
        {query && <button type="button" className="galaxy-search-clear" aria-label="清空搜索" onClick={() => {setQuery('');searchInput.current?.focus();}}>×</button>}
      </form>
      <div className="galaxy-review">
        {reviewNode?.module && <button type="button" className="galaxy-random galaxy-review-title" onClick={() => go(reviewNode.id)}
          title={reviewNode.title} aria-label={`打开正文：${reviewNode.title}`}>
          <span aria-live="polite" aria-atomic="true">{reviewNode.title}</span>
        </button>}
        <button key="random" type="button" className={`galaxy-random${reviewNode?.module ? ' galaxy-review-next' : ''}`} onClick={reviewRandom}
          disabled={!documents.length || (Boolean(reviewNode?.module) && documents.length < 2)}
          aria-label={reviewNode?.module ? '随机换一篇' : '随机复习一篇笔记'}
          title={!documents.length ? '暂无可复习的笔记' : reviewNode?.module ? documents.length < 2 ? '只有一篇笔记' : '随机换一篇' : '随机抽取标题，先回忆再打开正文'}>
          <Icon name="shuffle" size={18}/>{!reviewNode?.module && <span>随机复习</span>}
        </button>
      </div>
    </div>
    {!ready && !error && documents.length > 0 && <div className="galaxy-status" role="status">正在展开星系…</div>}
    {(error || !documents.length) && <div className="galaxy-status" role="status">{error || '还没有文档。保存笔记后，这里会亮起第一颗星。'}</div>}
    <nav className="galaxy-views" aria-label="星空视图">
      <button className="galaxy-category-toggle" aria-pressed={expanded} disabled={!ready || Boolean(error)} title={expanded ? '收回整体星云' : '按分类展开星云'} onClick={() => {
        const next = !expanded; setExpanded(next); setFocus({mod: null, sel: null});
        scene.current?.focus(null, null); scene.current?.expand(next);
      }}>分类</button>
      <button className="galaxy-view-cycle" disabled={!ready || Boolean(error)}
        style={{'--view-index': viewIndex}} aria-label={`当前${views[viewIndex][1]}视图，切换到${nextView[1]}`} title={`切换到${nextView[1]}`}
        onClick={() => {setPreset(nextView[0]);scene.current?.preset(nextView[0]);}}>
        <span className="galaxy-view-highlight" aria-hidden="true"/>
        {views.map(([id, title]) => <span key={id} className={preset === id ? 'is-current' : ''} aria-hidden="true">{title}</span>)}
      </button>
    </nav>
    <ClusterList graph={graph} cluster={activeCluster} selected={node?.id} reduced={reduced} getAnchor={listAnchor}
      onPresenceChange={setClusterVisible} onSelect={id => go(id, true)} onClose={() => setReaderCluster(null)}/>
    {node?.module && <div className="analysis-wrap" key={node.id}>
      <DocumentReader onPreview={previewNode} graph={graph} node={node} module={moduleOf(graph, node)} cluster={activeCluster} onCluster={showReaderCluster} onGo={go} onClose={() => setFocus({mod: null, sel: null})}/>
    </div>}
  </section>;
}
