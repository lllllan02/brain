import React, {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {useViewState} from './useViewState';
import {validCluster, validPinnedList} from './view-state';
import {collectionLabel} from '../collections.js';
import {moduleOf} from './graph';
import {createSearchIndex, searchDocuments} from './search.js';
import {CONFIG, asset} from '../config';
import {DocumentReader} from './DocumentReader';
import {ListNavigation} from './ListNavigation';
import {ClusterList, clusterDocuments} from './ClusterList';
import {Icon} from './icons';
import {ReadingNavigation, ReadingTrail} from './ReadingHistory';
import {latestDocuments, documentHighlight} from './latest-documents';
import {readingTrail, readingDirection} from './reading-history';
import {usePresence} from '../motion/usePresence';
import {ReaderTransition} from '../motion/ReaderTransition';
import {MOTION, motionVariables} from '../motion/tokens.js';
import '../motion/motion.css';
import '../galaxy/galaxy.css';

export function moduleItems(graph, modId) {
  return graph.nodes.filter(node => node.modules?.includes(modId))
    .sort((a, b) => (a.type === 'overview' ? 0 : 1) - (b.type === 'overview' ? 0 : 1));
}

export function Home({graph, focus, setFocus, reading, reduced, collectionAction}) {
  const host = useRef(null), scene = useRef(null), searchInput = useRef(null);
  const composing = useRef(false);
  const current = useRef({focus, setFocus});
  const [labels, setLabels] = useState([]), [ready, setReady] = useState(false), [error, setError] = useState('');
  const preset = graph.index.get(focus.sel)?.module ? 'nebula' : 'deepfield';
  const [expanded, setExpanded] = useViewState('expanded', false);
  const [grouping, setGrouping] = useViewState('grouping', 'category', value => ['category', 'collection'].includes(value));
  const [readerCluster, setReaderCluster] = useViewState('readerCluster', null, validCluster);
  const [pinnedList, setPinnedList] = useViewState('pinnedList', null, validPinnedList);
  const [clusterVisible, setClusterVisible] = useState(false);
  const [historyOpen, setHistoryOpen] = useViewState('historyOpen', false);
  const historyToggle = useRef(null), latestToggle = useRef(null);
  const [latestOpen, setLatestOpen] = useViewState('latestOpen', false);
  const [relationMode, setRelationMode] = useViewState('relationMode', 'outgoing', value => ['outgoing', 'incoming'].includes(value));
  const timelineOpen = historyOpen || latestOpen;
  const latest = useMemo(() => latestDocuments(graph.nodes.filter(node => node.module)), [graph]);
  const closeLatest = () => {setPinnedList(null);setLatestOpen(false);setReaderCluster({owner: focus.sel, value: null});latestToggle.current?.focus({preventScroll: true});};
  const [trailProjection, setTrailProjection] = useState({nodes: [], edges: []});
  const trail = useMemo(() => pinnedList && (pinnedList.recent || pinnedList.latest) ? documentHighlight(pinnedList.pinnedIds.map(id => ({id}))) : latestOpen ? documentHighlight(latest) : historyOpen ? readingTrail(reading.visits, new Set(graph.nodes.filter(n => n.module).map(n => n.id)), reading.recent) : null, [pinnedList, historyOpen, latestOpen, latest, reading.visits, reading.recent, graph]);
  const closeHistory = () => {setPinnedList(null);setHistoryOpen(false);setReaderCluster({owner: focus.sel, value: null});historyToggle.current?.focus({preventScroll: true});};
  const listAnchor = useCallback(id => scene.current?.nodeAnchor(id), []);
  const previewNode = useCallback(id => scene.current?.previewNode(id), []);
  // Group filters belong to their owner; reference direction follows document navigation.
  const activeCluster = useMemo(() => {
    if (!focus.sel || timelineOpen) return null;
    if (readerCluster?.owner === focus.sel) return readerCluster.value;
    return {document: focus.sel, direction: relationMode};
  }, [focus.sel, readerCluster, timelineOpen, relationMode]);
  const displayedCluster = useMemo(() => pinnedList || (latestOpen ? {latest} : historyOpen ? {recent: reading.recent} : activeCluster), [pinnedList, latestOpen, latest, historyOpen, reading.recent, activeCluster]);
  const groupCluster = activeCluster?.document ? null : activeCluster;
  const [query, setQuery] = useViewState('query', ''), [searchOpen, setSearchOpen] = useViewState('searchOpen', false);
  const [searchSelection, setSearchSelection] = useState(null);
  const [reviewId, setReviewId] = useViewState('reviewId', null, value => value === null || typeof value === 'string');
  current.current = {focus, setFocus, preset, expanded, grouping, groupCluster, reduced, trail, reading};
  const documents = useMemo(() => graph.nodes.filter(node => node.module), [graph]);
  const node = graph.index.get(focus.sel);
  const reviewNode = graph.index.get(reviewId);
  // Keep the panel in place while its contents hand off to the next document.
  const reader = usePresence(node?.module ? {node, location: reading.location} : null, node?.module ? 'reader' : null, reduced, 'translateX(calc(100% + 24px))', MOTION.layout);
  const shownNode = reader.shown?.node;
  const visualNode = node?.module ? shownNode : null;
  const visualFocus = {sel: visualNode?.id || null, mod: visualNode?.module || focus.mod};
  current.current.visualFocus = visualFocus;
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
      }, current.current.reduced, current.current.preset);
      scene.current = instance;
      const cluster = current.current.groupCluster;
      instance.focus(cluster ? null : current.current.visualFocus.sel, cluster ? cluster.category : current.current.visualFocus.mod, cluster?.tag, current.current.visualFocus.sel);
      instance.pause(current.current.reduced);
      instance.expand(current.current.expanded, current.current.grouping);
      instance.readingTrail(current.current.trail);
    }).catch(() => {
      if (active) setError('当前浏览器无法显示三维星云，可通过下方搜索继续阅读。');
    });
    return () => { active = false; instance?.dispose(); scene.current = null; };
  }, [graph]);
  useEffect(() => scene.current?.preset(preset), [preset]);
  useEffect(() => scene.current?.setReducedMotion(reduced), [reduced]);
  useEffect(() => {scene.current?.readingTrail(trail);}, [trail]);
  useEffect(() => { if (!focus.sel) setReaderCluster(null); }, [focus.sel]);
  useEffect(() => {
    scene.current?.focus(groupCluster ? null : visualFocus.sel, groupCluster ? groupCluster.category : visualFocus.mod, groupCluster?.tag, visualFocus.sel);
  }, [visualFocus.sel, visualFocus.mod, groupCluster]);
  const showReaderCluster = cluster => {
    setPinnedList(null);
    setHistoryOpen(false); setLatestOpen(false);
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
        if (searchVisible) {
          event.preventDefault();
          setSearchOpen(false);
          searchInput.current?.blur();
          return;
        }
        if (latestOpen) {closeLatest(); return;}
        if (historyOpen) {closeHistory(); return;}
        if (query) { setQuery(''); return; }
        setSearchOpen(false);
        searchInput.current?.blur();
        setFocus({mod: null, sel: null});
      }
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, [focus, query, searchVisible, setFocus, historyOpen, latestOpen]);
  const reset = () => { setQuery(''); setSearchOpen(false); searchInput.current?.blur(); setFocus({mod: null, sel: null}); scene.current?.reset(); };
  return <section className={`galaxy-page ${node || shownNode ? 'galaxy-reading' : ''} ${displayedCluster || clusterVisible ? 'galaxy-browsing' : ''} ${timelineOpen ? 'galaxy-history-open' : ''}`} aria-label={CONFIG.brand.name} data-reader-open={Boolean(node?.module)} data-view={preset} style={motionVariables}>
    <div className={`galaxy-viewport ${!ready || error ? 'is-loading' : ''}`} ref={host}>
      <div className="galaxy-frame" aria-hidden="true"/>
      {historyOpen && <ReadingTrail projection={trailProjection} route={trail} reduced={reduced} hidden={!ready || Boolean(error)}/>}
      <div className="galaxy-labels">{ready && !error && labels.map(label => label.category ?
        <button key={label.id} className="galaxy-category-label" style={{left: label.x, top: label.y, opacity: label.opacity, '--group-color': label.color, pointerEvents: label.exiting ? 'none' : undefined}} onPointerEnter={() => scene.current?.hoverCategory(label.id)} onPointerLeave={() => scene.current?.hoverCategory(null)} onFocus={() => scene.current?.hoverCategory(label.id)} onBlur={() => scene.current?.hoverCategory(null)} onClick={() => focus.sel ? setReaderCluster({owner: focus.sel, value: {category: label.id}}) : setFocus({mod: label.id, sel: null})} aria-label={`查看${label.title}${label.id.startsWith('collection:') ? '目录' : '分类'}`}><i aria-hidden="true"/>{label.title}<small>{label.count}</small></button> :
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
            <span>{n.title}</span><small>{n.category || '未分类'} · {collectionLabel(n.collection)}</small>
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
      {[['category', '分类', 'grid'], ['collection', '目录', 'folder']].map(([mode, title, icon]) => <button key={mode} className="galaxy-category-toggle" aria-pressed={expanded && grouping === mode} disabled={!ready || Boolean(error)} title={expanded && grouping === mode ? '收回整体星云' : `按${title}展开星云`} onClick={() => {
        const next = !expanded || grouping !== mode;
        setGrouping(mode); setExpanded(next);
        scene.current?.expand(next, mode);
      }}><Icon name={icon} size={15}/><span>{title}</span></button>)}

    </nav>
    <ClusterList navigation={<ListNavigation graph={graph} node={pinnedList?.document ? graph.index.get(pinnedList.document) : node} cluster={displayedCluster} historyRef={historyToggle} latestRef={latestToggle} onChoose={mode => {
      const activeMode = displayedCluster?.latest ? 'latest' : displayedCluster?.recent ? 'recent' : displayedCluster?.document ? displayedCluster.direction || 'outgoing' : null;
      if (mode === activeMode) return;
      setPinnedList(null);
      setHistoryOpen(mode === 'recent'); setLatestOpen(mode === 'latest');
      if (mode === 'outgoing' || mode === 'incoming') {
        setRelationMode(mode);
        showReaderCluster({document: node.id, direction: mode});
      }
    }}/>} graph={graph} cluster={displayedCluster} selected={node?.id} anchorId={pinnedList?.document || shownNode?.id} reduced={reduced} getAnchor={!pinnedList?.document && timelineOpen && !focus.sel ? undefined : listAnchor}
      pinned={Boolean(pinnedList)} onPin={() => {
        if (pinnedList) {
          setPinnedList(null);
          if (pinnedList.document && focus.sel) setReaderCluster({owner: focus.sel, value: {document: focus.sel, direction: relationMode}});
        } else if (displayedCluster) setPinnedList({...displayedCluster, pinnedIds: clusterDocuments(graph, displayedCluster).map(item => item.id)});
      }}
      onPresenceChange={setClusterVisible} onSelect={id => go(id, !timelineOpen)} onClear={() => {setPinnedList(null);reading.clear();}} onClose={() => {setPinnedList(null);latestOpen ? closeLatest() : historyOpen ? closeHistory() : setReaderCluster({owner: focus.sel, value: null});}}/>
    {shownNode && <div ref={reader.ref} inert={reader.closing} className="analysis-wrap reader-shell">
      <ReaderTransition documentId={shownNode.id} reduced={reduced}>
      <DocumentReader collectionAction={collectionAction} navigation={<ReadingNavigation graph={graph} reading={reading} onTravel={reading.travel}/>} onResize={syncReaderLayout} key={shownNode.id} reduced={reduced} onPreview={previewNode} graph={graph} node={shownNode} readingLocation={reader.shown.location} onReadingScroll={reading.saveScroll} module={moduleOf(graph, shownNode)} cluster={activeCluster} onCluster={showReaderCluster} onClose={() => setFocus({mod: null, sel: null})}/>
      </ReaderTransition>
    </div>}
  </section>;
}
