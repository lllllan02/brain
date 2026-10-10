import React, {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {moduleOf} from './graph';
import {createSearchIndex, searchDocuments} from './search.js';
import {CONFIG, asset} from '../config';
import {DocumentReader} from './DocumentReader';
import {ClusterList, clusterDocuments} from './ClusterList';
import {Icon} from './icons';
import {ReadingNavigation, ReadingHistoryToggle, ReadingTrail} from './ReadingHistory';
import {readingTrail, readingDirection} from './reading-history';
import {usePresence} from '../motion/usePresence';
import {motionVariables} from '../motion/tokens.js';
import '../motion/motion.css';
import '../galaxy/galaxy.css';

export function moduleItems(graph, modId) {
  return graph.nodes.filter(node => node.modules?.includes(modId))
    .sort((a, b) => (a.type === 'overview' ? 0 : 1) - (b.type === 'overview' ? 0 : 1));
}

export function Home({graph, focus, setFocus, reading, reduced}) {
  const host = useRef(null), scene = useRef(null), searchInput = useRef(null);
  const composing = useRef(false);
  const current = useRef({focus, setFocus});
  const [labels, setLabels] = useState([]), [ready, setReady] = useState(false), [error, setError] = useState('');
  const [preset, setPreset] = useState('nebula');
  const [expanded, setExpanded] = useState(false);
  const [readerCluster, setReaderCluster] = useState(null);
  const [clusterVisible, setClusterVisible] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const historyToggle = useRef(null);
  const [trailProjection, setTrailProjection] = useState({nodes: [], edges: []});
  const trail = useMemo(() => historyOpen ? readingTrail(reading.visits, new Set(graph.nodes.filter(n => n.module).map(n => n.id)), reading.recent) : null, [historyOpen, reading.visits, reading.recent, graph]);
  const closeHistory = () => {setHistoryOpen(false);historyToggle.current?.focus({preventScroll: true});};
  const listAnchor = useCallback(id => scene.current?.nodeAnchor(id), []);
  const previewNode = useCallback(id => scene.current?.previewNode(id), []);
  // An explicit list (or dismissal) belongs to the document where it was chosen.
  // All other document navigation starts with that document's outgoing links.
  const activeCluster = useMemo(() => {
    if (!focus.sel || historyOpen) return null;
    if (readerCluster?.owner === focus.sel) return readerCluster.value;
    const references = {document: focus.sel};
    return clusterDocuments(graph, references).length ? references : null;
  }, [graph, focus.sel, readerCluster, historyOpen]);
  const displayedCluster = useMemo(() => historyOpen ? {recent: reading.recent} : activeCluster, [historyOpen, reading.recent, activeCluster]);
  const groupCluster = activeCluster?.document ? null : activeCluster;
  const views = [['galaxy', '银河'], ['nebula', '星云'], ['deepfield', '深空']];
  const viewIndex = views.findIndex(([id]) => id === preset);
  const nextView = views[(viewIndex + 1) % views.length];
  const [query, setQuery] = useState(''), [searchOpen, setSearchOpen] = useState(false);
  const [searchSelection, setSearchSelection] = useState(null);
  const [reviewId, setReviewId] = useState(null);
  current.current = {focus, setFocus, preset, expanded, groupCluster, reduced, trail, reading};
  const documents = useMemo(() => graph.nodes.filter(node => node.module), [graph]);
  const node = graph.index.get(focus.sel);
  const reviewNode = graph.index.get(reviewId);
  const reader = usePresence(node?.module ? {node, location: reading.location} : null, node?.module ? node.id : null, reduced, 'translateX(16px)');
  const shownNode = reader.shown?.node;
  const syncReaderLayout = useCallback(() => {
    const panel = reader.ref.current;
    if (!panel) return;
    const page = panel.closest('.galaxy-page');
    page.style.setProperty('--reader-left', `${panel.offsetLeft}px`);
    page.style.setProperty('--reader-top', `${panel.offsetTop}px`);
    page.style.setProperty('--reader-height', `${panel.offsetHeight}px`);
    // A pointer-driven layout already supplies each intermediate size. Publish
    // the list position and camera projection together, without another tween.
    if (panel.matches('.reader-resized, .reader-resizing')) scene.current?.resizeReader();
  }, [reader.ref]);
  useLayoutEffect(() => {
    const panel = reader.ref.current;
    if (!panel) return;
    const page = panel.closest('.galaxy-page');
    syncReaderLayout();
    const observer = new ResizeObserver(syncReaderLayout);
    observer.observe(panel);
    window.addEventListener('resize', syncReaderLayout);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', syncReaderLayout);
      ['--reader-left', '--reader-top', '--reader-height'].forEach(name => page.style.removeProperty(name));
    };
  }, [shownNode?.id, syncReaderLayout]);
  const review = usePresence(reviewNode?.module ? reviewNode : null, reviewNode?.module ? reviewNode.id : null, reduced);
  const go = (id, keepCluster = false) => {
    const target = graph.index.get(id); if (!target?.module) return;
    setReaderCluster(keepCluster && groupCluster ? {owner: id, value: groupCluster} : null);
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
  const searchIndex = useMemo(() => createSearchIndex(documents), [documents]);
  const results = useMemo(() => searchDocuments(searchIndex, query), [query, searchIndex]);
  // A new query or refreshed index always starts at the first result.
  const activeResultIndex = searchSelection?.results === results ? searchSelection.index : 0;
  const searchVisible = Boolean(searchOpen && query.trim());
  // Animate opening/closing only; changing the query must update rows immediately.
  const search = usePresence(searchVisible ? {results, activeResultIndex} : null, searchVisible ? 'search' : null, reduced);
  useEffect(() => {
    if (searchVisible && !search.closing) {
      search.ref.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({block: 'nearest', behavior: 'instant'});
    }
  }, [search.shown?.results, activeResultIndex, searchVisible, search.closing]);
  const statusText = error || (!documents.length ? '还没有文档。保存笔记后，这里会亮起第一颗星。' : !ready ? '正在展开星系…' : null);
  const status = usePresence(statusText, statusText, reduced, 'none');
  useEffect(() => {
    let active = true, instance;
    setError(''); setReady(false); setLabels([]);
    import('../galaxy/scene').then(({createGalaxy}) => {
      if (!active) return;
      instance = createGalaxy(host.current, graph, {
        onLabels: next => { if (active) setLabels(next); },
        onTrail: next => { if (active) setTrailProjection(next); },
        onReady: value => { if (active) setReady(value); },
        onError: message => { if (active) setError(message); },
        onReset: () => {setReaderCluster(null);current.current.setFocus({mod: null, sel: null});},
        onSelect: id => {
          setReaderCluster(null);
          const target = graph.index.get(id);
          if (target?.module) current.current.setFocus({mod: target.module, sel: id});
        },
      }, current.current.reduced);
      scene.current = instance;
      const cluster = current.current.groupCluster;
      instance.focus(cluster ? null : current.current.focus.sel, cluster ? cluster.category : current.current.focus.mod, cluster?.tag, current.current.focus.sel);
      instance.pause(current.current.reduced);
      if (current.current.preset !== 'nebula') instance.preset(current.current.preset);
      instance.expand(current.current.expanded);
      instance.readingTrail(current.current.trail);
    }).catch(() => {
      if (active) setError('当前浏览器无法显示三维星云，可通过下方搜索继续阅读。');
    });
    return () => { active = false; instance?.dispose(); scene.current = null; };
  }, [graph]);
  useEffect(() => scene.current?.setReducedMotion(reduced), [reduced]);
  useEffect(() => {scene.current?.readingTrail(trail);}, [trail]);
  useEffect(() => { if (!focus.sel) setReaderCluster(null); }, [focus.sel]);
  useEffect(() => {
    scene.current?.focus(groupCluster ? null : focus.sel, groupCluster ? groupCluster.category : focus.mod, groupCluster?.tag, focus.sel);
  }, [focus.sel, focus.mod, groupCluster]);
  const showReaderCluster = cluster => {
    setHistoryOpen(false);
    setReaderCluster({owner: focus.sel, value: cluster});
    if (expanded) {setExpanded(false);scene.current?.expand(false);}
  };
  useEffect(() => {
    const key = event => {
      if (document.querySelector('[role="dialog"]')) return;
      const typing = event.target.closest('input,textarea,[contenteditable="true"]');
      const direction = readingDirection(event);
      if (direction && (focus.sel || historyOpen) && window.getSelection()?.isCollapsed !== false) {
        const navigation = current.current.reading;
        if (direction < 0 ? navigation.back : navigation.forward) {
          event.preventDefault(); navigation.travel(direction);
        }
        return;
      }
      if ((event.key === '/' && !typing) || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k')) {
        event.preventDefault(); searchInput.current?.focus();
      }
      if (event.key === 'Escape') {
        if (historyOpen) {closeHistory(); return;}
        if (query) { setQuery(''); return; }
        setSearchOpen(false);
        searchInput.current?.blur();
        setFocus({mod: null, sel: null});
      }
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, [focus, query, setFocus, historyOpen]);
  const reset = () => { setQuery(''); setSearchOpen(false); searchInput.current?.blur(); setFocus({mod: null, sel: null}); scene.current?.reset(); };
  return <section className={`galaxy-page ${node || shownNode ? 'galaxy-reading' : ''} ${displayedCluster || clusterVisible ? 'galaxy-browsing' : ''} ${historyOpen ? 'galaxy-history-open' : ''}`} aria-label={CONFIG.brand.name} style={motionVariables}>
    <div className={`galaxy-viewport ${!ready || error ? 'is-loading' : ''}`} ref={host}>
      <div className="galaxy-frame" aria-hidden="true"/>
      {historyOpen && <ReadingTrail projection={trailProjection} route={trail} reduced={reduced} hidden={!ready || Boolean(error)}/>}
      <div className="galaxy-labels">{ready && !error && labels.map(label => label.category ?
        <button key={label.id} className="galaxy-category-label" style={{left: label.x, top: label.y, opacity: label.opacity, pointerEvents: label.exiting ? 'none' : undefined}} onPointerEnter={() => scene.current?.hoverCategory(label.id)} onPointerLeave={() => scene.current?.hoverCategory(null)} onFocus={() => scene.current?.hoverCategory(label.id)} onBlur={() => scene.current?.hoverCategory(null)} onClick={() => setFocus({mod: label.id, sel: null})} aria-label={`查看${label.title}分类`}>{label.title}</button> :
        <React.Fragment key={label.id}>
          {label.current && <svg className="galaxy-current-marker" aria-hidden="true" viewBox="-20 -20 40 40" style={{left: label.x, top: label.y, opacity: label.opacity, pointerEvents: label.exiting ? 'none' : undefined}}>
            <path d="M -8 -17 H -17 V -8 M 8 -17 H 17 V -8 M -8 17 H -17 V 8 M 8 17 H 17 V 8"/>
          </svg>}
          <span className={`galaxy-label${label.current ? ' is-current' : ''}${label.preview ? ' is-preview' : ''}`} aria-hidden="true" style={{left: label.x, top: label.y, opacity: label.opacity, pointerEvents: label.exiting ? 'none' : undefined}}>{label.title}</span>
        </React.Fragment>
      )}</div>
    </div>
    <header className="galaxy-header">
      <a className="galaxy-brand" href="#/" aria-label={`${CONFIG.brand.name}，回到全景`} onClick={event => {event.preventDefault();reset();}}>
        <img src={asset('black-hole-logo.png')} width="44" height="44" alt=""/><span>{CONFIG.brand.name}</span>
      </a>
    </header>
    <div className={`galaxy-search-dock${reviewNode?.module ? ' has-review' : ''}`} onBlur={event => {if (!event.currentTarget.contains(event.relatedTarget)) setSearchOpen(false);}}>
      {search.shown && <div ref={search.ref} inert={search.closing} className="galaxy-results" role="region" aria-label="搜索结果">
        <p role="status">{search.shown.results.length ? `${search.shown.results.length} 篇文档` : '没有找到相关内容'}</p>
        <div id="galaxy-search-results" role="listbox" aria-label="搜索笔记结果">
          {search.shown.results.map((n, index) => <button key={n.id} id={`galaxy-search-result-${index}`} type="button" role="option" tabIndex={-1}
            aria-selected={index === search.shown.activeResultIndex}
            onPointerMove={() => setSearchSelection({results, index})}
            onMouseDown={event => event.preventDefault()} onClick={() => go(n.id)}>
            <span>{n.title}</span><small>{n.category || '未分类'} · {n.collection === 'inbox' ? 'Inbox' : 'Notes'}</small>
          </button>)}
        </div>
      </div>}
      <form className="galaxy-search" role="search" onSubmit={event => {event.preventDefault();if(!composing.current && searchVisible && results[activeResultIndex])go(results[activeResultIndex].id);}}>
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>
        <input ref={searchInput} value={query} onFocus={() => setSearchOpen(true)} onChange={event => {setQuery(event.target.value);setSearchOpen(true);}} placeholder="搜索笔记" aria-label="搜索标题、别名、标签或正文"
          role="combobox" aria-autocomplete="list" aria-expanded={searchVisible} aria-controls={searchVisible ? 'galaxy-search-results' : undefined}
          aria-activedescendant={searchVisible && results.length ? `galaxy-search-result-${activeResultIndex}` : undefined} autoComplete="off"
          onCompositionStart={() => {composing.current = true;}} onCompositionEnd={() => {composing.current = false;}} onKeyDown={event => {
          if(composing.current || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) {
            if(event.key === 'Enter') event.preventDefault();
            return;
          }
          if(event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setSearchOpen(true);
            if(results.length) setSearchSelection({results, index: Math.max(0, Math.min(results.length - 1, activeResultIndex + (event.key === 'ArrowDown' ? 1 : -1)))});
          }
        }}/>
        {!shownNode && <ReadingHistoryToggle open={historyOpen} toggleRef={historyToggle} onToggle={() => setHistoryOpen(value => !value)}/>}
        {query && <button type="button" className="galaxy-search-clear" aria-label="清空搜索" onClick={() => {setQuery('');searchInput.current?.focus();}}><Icon name="close" size={16}/></button>}
      </form>
      <div className="galaxy-review">
        {review.shown && <button ref={review.ref} inert={review.closing} type="button" className="galaxy-random galaxy-review-title" onClick={() => go(review.shown.id)}
          title={review.shown.title} aria-label={`打开正文：${review.shown.title}`}>
          <span aria-live="polite" aria-atomic="true">{review.shown.title}</span>
        </button>}
        <button key="random" type="button" className={`galaxy-random${reviewNode?.module ? ' galaxy-review-next' : ''}`} onClick={reviewRandom}
          disabled={!documents.length || (Boolean(reviewNode?.module) && documents.length < 2)}
          aria-label={reviewNode?.module ? '随机换一篇' : '随机复习一篇笔记'}
          title={!documents.length ? '暂无可复习的笔记' : reviewNode?.module ? documents.length < 2 ? '只有一篇笔记' : '随机换一篇' : '随机抽取标题，先回忆再打开正文'}>
          <Icon name="shuffle" size={18}/>{!reviewNode?.module && <span>随机复习</span>}
        </button>
      </div>
    </div>
    {status.shown && <div className="galaxy-status" role="status"><span ref={status.ref}>{status.shown}</span></div>}
    <nav className="galaxy-views" aria-label="星空视图">
      <button className="galaxy-category-toggle" aria-pressed={expanded} disabled={!ready || Boolean(error)} title={expanded ? '收回整体星云' : '按分类展开星云'} onClick={() => {
        const next = !expanded; setExpanded(next); setFocus({mod: null, sel: null});
        scene.current?.focus(null, null); scene.current?.expand(next);
      }}><Icon name="grid" size={15}/><span>分类</span></button>
      <button className="galaxy-view-cycle" disabled={!ready || Boolean(error)}
        style={{'--view-index': viewIndex}} aria-label={`当前${views[viewIndex][1]}视图，切换到${nextView[1]}`} title={`切换到${nextView[1]}`}
        onClick={() => {setPreset(nextView[0]);scene.current?.preset(nextView[0]);}}>
        <span className="galaxy-view-highlight" aria-hidden="true"/>
        {views.map(([id, title]) => <span key={id} className={preset === id ? 'is-current' : ''} aria-hidden="true">{title}</span>)}
      </button>
    </nav>
    <ClusterList graph={graph} cluster={displayedCluster} selected={node?.id} reduced={reduced} getAnchor={historyOpen && !focus.sel ? undefined : listAnchor}
      onPresenceChange={setClusterVisible} onSelect={id => go(id, !historyOpen)} onClear={reading.clear} onClose={() => historyOpen ? closeHistory() : setReaderCluster({owner: focus.sel, value: null})}/>
    {shownNode && <div ref={reader.ref} inert={reader.closing} className="analysis-wrap">
      <DocumentReader navigation={<ReadingNavigation graph={graph} reading={reading} onTravel={reading.travel}/>} historyControl={{open:historyOpen,toggleRef:historyToggle,onToggle:()=>setHistoryOpen(value=>!value)}} onResize={syncReaderLayout} key={shownNode.id} reduced={reduced} onPreview={previewNode} graph={graph} node={shownNode} readingLocation={reader.shown.location} onReadingScroll={reading.saveScroll} module={moduleOf(graph, shownNode)} cluster={activeCluster} onCluster={showReaderCluster} onClose={() => setFocus({mod: null, sel: null})}/>
    </div>}
  </section>;
}
