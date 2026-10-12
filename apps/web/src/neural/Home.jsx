import React, {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {useReadingQueue} from './useReadingQueue';
import {Workbench} from './Workbench';
import {useViewState} from './useViewState';
import {validCluster, validPinnedList} from './view-state';
import {collectionLabel, CONTENT_COLLECTIONS} from '../collections.js';
import {moduleOf} from './graph';
import {createSearchIndex, searchDocuments} from './search.js';
import {CONFIG, asset} from '../config';
import {DocumentReader} from './DocumentReader';
import {ListNavigation} from './ListNavigation';
import {ClusterList, clusterDocuments} from './ClusterList';
import {Icon} from './icons';
import {ReadingNavigation, ReadingTrail} from './ReadingHistory';
import {latestDocuments, documentHighlight} from './latest-documents';
import {activeReadingTrail, readingTrail, readingDirection} from './reading-history';
import {usePresence} from '../motion/usePresence';
import {ReaderTransition} from '../motion/ReaderTransition';
import {CardToStar} from '../motion/CardToStar';
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
  const readerTimeline = useRef({progress: 0, animation: null});
  const [branchesReady, setBranchesReady] = useState(false);
  const [labels, setLabels] = useState([]), [ready, setReady] = useState(false), [error, setError] = useState('');
  const preset = graph.index.get(focus.sel)?.module ? 'nebula' : 'deepfield';
  const [expanded, setExpanded] = useViewState('expanded', false);
  const [grouping, setGrouping] = useViewState('grouping', 'category', value => ['category', 'collection'].includes(value));
  const [readerCluster, setReaderCluster] = useViewState('readerCluster', null, validCluster);
  const [pinnedList, setPinnedList] = useViewState('pinnedList', null, validPinnedList);
  const [collectionFilter, setCollectionFilter] = useViewState('listCollectionFilter', 'all', value => value === 'all' || CONTENT_COLLECTIONS.includes(value));
  const [clusterVisible, setClusterVisible] = useState(false);
  const [historyOpen, setHistoryOpen] = useViewState('historyOpen', false);
  const historyToggle = useRef(null), latestToggle = useRef(null);
  const [latestOpen, setLatestOpen] = useViewState('latestOpen', false);
  const [relationMode, setRelationMode] = useViewState('relationMode', 'outgoing', value => ['outgoing', 'incoming'].includes(value));
  const queue = useReadingQueue();
  // Always enter through the galaxy; a previous dashboard visit is not a landing preference.
  const [homeMode, setHomeMode] = useState('galaxy');
  const workbenchVisible = homeMode === 'workbench' && !focus.sel && !focus.mod;
  const [galaxyReturnFocus, setGalaxyReturnFocus] = useViewState('galaxyReturnFocus', null, value => value === null || (typeof value === 'object' && ['sel', 'mod'].every(key => value[key] === null || typeof value[key] === 'string')));
  const [queueOpen, setQueueOpen] = useViewState('queueOpen', false);
  const queueToggle = useRef(null);
  const closeQueue = () => {setQueueOpen(false);setReaderCluster({owner: focus.sel, value: null});queueToggle.current?.focus({preventScroll: true});};
  const timelineOpen = historyOpen || latestOpen || queueOpen;
  const latest = useMemo(() => latestDocuments(graph.nodes.filter(node => node.module)), [graph]);
  const closeLatest = () => {setPinnedList(null);setLatestOpen(false);setReaderCluster({owner: focus.sel, value: null});latestToggle.current?.focus({preventScroll: true});};
  const [flight, setFlight] = useState(null);
  const pendingFlight = useRef(null);
  const [revealedFlight, setRevealedFlight] = useState(null);
  const revealFlight = useCallback(key => {
    const pending = pendingFlight.current;
    if (!pending || pending.key !== key || pending.revealed) return;
    pending.revealed = true;
    setRevealedFlight(key);
    pending.navigate();
  }, []);
  const finishFlight = useCallback(key => {
    const pending = pendingFlight.current;
    if (!pending || pending.key !== key) return;
    pendingFlight.current = null;
    setFlight(null);
    if (!pending.revealed) pending.navigate();
  }, []);
  const [trailProjection, setTrailProjection] = useState({nodes: [], edges: []});
  const liveTrail = useMemo(() => focus.sel ? activeReadingTrail(reading.path, reading.hop) : null, [focus.sel, reading.path, reading.hop]);
  const trail = useMemo(() => pinnedList && (pinnedList.recent || pinnedList.latest) ? documentHighlight(pinnedList.pinnedIds.map(id => ({id}))) : latestOpen ? documentHighlight(latest) : historyOpen ? readingTrail(reading.visits, new Set(graph.nodes.filter(n => n.module).map(n => n.id)), reading.recent) : liveTrail, [liveTrail, pinnedList, historyOpen, latestOpen, latest, reading.visits, reading.recent, graph]);
  const closeHistory = () => {setPinnedList(null);setHistoryOpen(false);setReaderCluster({owner: focus.sel, value: null});historyToggle.current?.focus({preventScroll: true});};
  const listAnchor = useCallback(id => scene.current?.nodeAnchor(id), []);
  const previewNode = useCallback(id => scene.current?.previewNode(id), []);
  // Group filters belong to their owner; reference direction follows document navigation.
  const activeCluster = useMemo(() => {
    if (!focus.sel || timelineOpen) return null;
    if (readerCluster?.owner === focus.sel) return readerCluster.value;
    return {document: focus.sel, direction: relationMode};
  }, [focus.sel, readerCluster, timelineOpen, relationMode]);
  const displayedCluster = useMemo(() => pinnedList || (queueOpen ? {queue: queue.items} : latestOpen ? {latest} : historyOpen ? {recent: reading.recent} : activeCluster), [pinnedList, queueOpen, queue.items, latestOpen, latest, historyOpen, reading.recent, activeCluster]);
  const groupCluster = activeCluster?.document ? null : activeCluster;
  const [query, setQuery] = useViewState('query', ''), [searchOpen, setSearchOpen] = useViewState('searchOpen', false);
  const [searchSelection, setSearchSelection] = useState(null);
  const [reviewId, setReviewId] = useViewState('reviewId', null, value => value === null || typeof value === 'string');
  current.current = {focus, setFocus, preset, expanded, grouping, groupCluster, reduced, trail, reading};
  const documents = useMemo(() => graph.nodes.filter(node => node.module), [graph]);
  const node = graph.index.get(focus.sel);
  const reviewNode = graph.index.get(reviewId);
  // Keep the panel in place while its contents hand off to the next document.
  const reader = usePresence(node?.module ? {node, location: reading.location} : null, node?.module ? 'reader' : null, reduced, 'translateX(24px)', MOTION.morph, readerTimeline);
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
  const statusText = error || (!documents.length ? '还没有文档。保存笔记后，这里会亮起第一颗星。' : !ready && !node?.module ? '正在展开星系…' : null);
  const status = usePresence(statusText, statusText, reduced, 'none');
  useLayoutEffect(() => {
    // The dashboard needs no WebGL scene. Dispose it on entry and create it
    // only for the galaxy/reader; pause() stops motion, not rendering.
    setReady(false); setBranchesReady(false); setLabels([]);
    readerTimeline.current.progress = 0;
    if (readerTimeline.current.animation) readerTimeline.current.animation.currentTime = 0;
    if (workbenchVisible) return;
    let active = true, instance;
    setError('');
    import('../galaxy/scene').then(({createGalaxy}) => {
      if (!active) return;
      instance = createGalaxy(host.current, graph, {
        onLabels: next => { if (active) setLabels(next); },
        onTrail: next => { if (active) setTrailProjection(next); },
        onReady: value => { if (active) setReady(value); },
        onBranchesReady: value => {
          if (!active) return;
          if (!value) {
            readerTimeline.current.progress = 0;
            if (readerTimeline.current.animation) readerTimeline.current.animation.currentTime = 0;
          }
          setBranchesReady(value);
        },
        onEntryProgress: progress => {
          if (!active) return;
          readerTimeline.current.progress = progress;
          if (readerTimeline.current.animation) readerTimeline.current.animation.currentTime = progress * MOTION.morph;
        },
        onError: message => { if (active) { setError(message); readerTimeline.current.progress = 1; if (readerTimeline.current.animation) readerTimeline.current.animation.currentTime = MOTION.morph; } },
        onReset: () => {setReaderCluster(null);current.current.setFocus({mod: null, sel: null});},
        onSelect: id => {
          setReaderCluster(null);
          const navigation = current.current.reading;
          const ancestor = navigation.path.slice(-3, -1).findLast(entry => entry.id === id);
          if (ancestor && id !== current.current.focus.sel && current.current.trail?.live) {navigation.returnTo(ancestor.key); return;}
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
      if (active) {
        setError('当前浏览器无法显示三维星云，可通过下方搜索继续阅读。');
        readerTimeline.current.progress = 1;
        if (readerTimeline.current.animation) readerTimeline.current.animation.currentTime = MOTION.morph;
      }
    });
    return () => { active = false; instance?.dispose(); scene.current = null; };
  }, [graph, workbenchVisible]);
  useLayoutEffect(() => scene.current?.preset(preset), [preset]);
  useEffect(() => {scene.current?.pause(reduced);}, [reduced, ready]);
  useEffect(() => scene.current?.setReducedMotion(reduced), [reduced]);
  useLayoutEffect(() => {scene.current?.readingTrail(trail);}, [trail]);
  useEffect(() => {
    if (!focus.sel) setReaderCluster(null);
    const pending = pendingFlight.current;
    if (pending && (pending.revealed ? pending.target : pending.source) !== focus.sel) {
      pendingFlight.current = null;
      setFlight(null);
      scene.current?.cancelReadingTravel();
    }
  }, [focus.sel]);
  useLayoutEffect(() => {
    scene.current?.focus(groupCluster ? null : visualFocus.sel, groupCluster ? groupCluster.category : visualFocus.mod, groupCluster?.tag, visualFocus.sel);
  }, [visualFocus.sel, visualFocus.mod, groupCluster]);
  const showReaderCluster = cluster => {
    setPinnedList(null);
    setHistoryOpen(false); setLatestOpen(false); setQueueOpen(false);
    setReaderCluster({owner: focus.sel, value: cluster});
    if (expanded) {setExpanded(false);scene.current?.expand(false);}
  };
  useEffect(() => {
    const key = event => {
      if (workbenchVisible) return;
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
        if (queueOpen) {closeQueue(); return;}
        if (latestOpen) {closeLatest(); return;}
        if (historyOpen) {closeHistory(); return;}
        if (query) { setQuery(''); return; }
        setSearchOpen(false);
        searchInput.current?.blur();
        setFocus({mod: null, sel: null});
      }
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, [focus, query, searchVisible, setFocus, historyOpen, latestOpen, queueOpen, workbenchVisible]);
  const reset = () => { setQuery(''); setSearchOpen(false); searchInput.current?.blur(); setFocus({mod: null, sel: null}); if (preset === 'deepfield') scene.current?.reset(); };
  const switchHomeMode = mode => {
    if (mode === 'workbench') {
      if (workbenchVisible) return;
      setGalaxyReturnFocus(focus);
      setHomeMode(mode);
      // navigate() captures the reader scroll before leaving the document.
      reset();
    } else {
      setHomeMode(mode);
      if (!workbenchVisible) return;
      const saved = galaxyReturnFocus;
      const sel = graph.index.get(saved?.sel)?.module ? saved.sel : null;
      const mod = graph.modules.some(module => module.id === saved?.mod) || CONTENT_COLLECTIONS.some(collection => saved?.mod === `collection:${collection}`) ? saved.mod : null;
      setFocus({sel, mod});
    }
  };
  return <section className={`galaxy-page ${workbenchVisible ? 'workbench-visible' : ''} ${node || shownNode ? 'galaxy-reading' : ''} ${displayedCluster || clusterVisible ? 'galaxy-browsing' : ''} ${timelineOpen ? 'galaxy-history-open' : ''} ${flight ? revealedFlight === flight.key ? 'galaxy-handoff-revealing' : 'galaxy-handoff' : ''}`} aria-label={CONFIG.brand.name} data-home-return={!node?.module && !displayedCluster} data-reader-open={Boolean(node?.module)} data-view={preset} style={motionVariables}>
    <nav className="workbench-mode" aria-label="页面导航">
      <button type="button" onClick={() => switchHomeMode(workbenchVisible ? 'galaxy' : 'workbench')}>
        <Icon name={workbenchVisible ? 'back' : 'chart'} size={16}/>
        <span>{workbenchVisible ? graph.index.get(galaxyReturnFocus?.sel)?.module ? '返回阅读' : '返回星图' : '统计看板'}</span>
      </button>
    </nav>
    <CardToStar flight={flight} getAnchor={listAnchor} onReveal={revealFlight} onFinish={finishFlight} reduced={reduced}/>
    <Workbench graph={graph} hidden={!workbenchVisible} reading={reading} queue={queue}/>
    <div className={`galaxy-viewport ${!ready || error ? 'is-loading' : ''}`} ref={host}>
      <div className="galaxy-frame" aria-hidden="true"/>
      {(historyOpen || trail?.live) && <ReadingTrail projection={trailProjection} route={flight && trail?.live ? {...trail, segments:[]} : trail} reduced={reduced} hidden={workbenchVisible || !ready || Boolean(error)}/>}
      <div className="galaxy-labels">{ready && !error && labels.map(label => label.category ?
        <button key={label.id} className="galaxy-category-label" style={{left: label.x, top: label.y, opacity: label.opacity, '--group-color': label.color, pointerEvents: label.exiting ? 'none' : undefined}} onPointerEnter={() => scene.current?.hoverCategory(label.id)} onPointerLeave={() => scene.current?.hoverCategory(null)} onFocus={() => scene.current?.hoverCategory(label.id)} onBlur={() => scene.current?.hoverCategory(null)} onClick={() => focus.sel ? setReaderCluster({owner: focus.sel, value: {category: label.id}}) : setFocus({mod: label.id, sel: null})} aria-label={`查看${label.title}${label.id.startsWith('collection:') ? '目录' : '分类'}`}><i aria-hidden="true"/>{label.title}<small>{label.count}</small></button> :
        <React.Fragment key={label.id}>
          {label.current && <svg className="galaxy-current-marker" aria-hidden="true" viewBox="-20 -20 40 40" style={{left: label.x, top: label.y, opacity: label.opacity, pointerEvents: label.exiting ? 'none' : undefined}}>
            <path d="M -8 -17 H -17 V -8 M 8 -17 H 17 V -8 M -8 17 H -17 V 8 M 8 17 H 17 V 8"/>
          </svg>}
          {label.path ? <button type="button" className="galaxy-label is-path" title={`返回：${label.title}`} tabIndex={label.exiting ? -1 : 0}
            onClick={() => {const entry = reading.path.slice(-3, -1).findLast(item => item.id === label.id); if (entry) reading.returnTo(entry.key);}}
            style={{left: label.x, top: label.y, opacity: label.opacity, pointerEvents: label.exiting ? 'none' : undefined}}>{label.title}</button> :
            <span className={`galaxy-label${label.current ? ' is-current' : ''}${label.preview ? ' is-preview' : ''}`} aria-hidden="true" style={{left: label.x, top: label.y, opacity: label.opacity}}>{label.title}</span>}
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
    <ClusterList active={!workbenchVisible && (Boolean(error) || ready && branchesReady)} collectionFilter={collectionFilter} queue={queue} navigation={<ListNavigation collectionFilter={collectionFilter} onFilter={setCollectionFilter} graph={graph} node={pinnedList?.document ? graph.index.get(pinnedList.document) : node} cluster={displayedCluster} queueRef={queueToggle} historyRef={historyToggle} latestRef={latestToggle} onChoose={mode => {
      const activeMode = displayedCluster?.queue ? 'queue' : displayedCluster?.latest ? 'latest' : displayedCluster?.recent ? 'recent' : displayedCluster?.document ? displayedCluster.direction || 'outgoing' : null;
      if (mode === activeMode) return;
      setPinnedList(null);
      setHistoryOpen(mode === 'recent'); setLatestOpen(mode === 'latest'); setQueueOpen(mode === 'queue');
      if (mode === 'outgoing' || mode === 'incoming') {
        setRelationMode(mode);
        showReaderCluster({document: node.id, direction: mode});
      }
    }}/>} graph={graph} cluster={workbenchVisible ? null : displayedCluster} selected={node?.id} anchorId={pinnedList?.document || shownNode?.id} reduced={reduced} getAnchor={!pinnedList?.document && timelineOpen && !focus.sel ? undefined : listAnchor}
      pinned={Boolean(pinnedList)} onPin={() => {
        if (pinnedList) {
          setPinnedList(null);
          if (pinnedList.document && focus.sel) setReaderCluster({owner: focus.sel, value: {document: focus.sel, direction: relationMode}});
        } else if (displayedCluster) setPinnedList({...displayedCluster, pinnedIds: clusterDocuments(graph, displayedCluster).map(item => item.id)});
      }}
      onPresenceChange={setClusterVisible} onSelect={(id, card) => {
        if (!reduced && focus.sel && id !== focus.sel && card && scene.current?.prepareReadingTravel(id)) {
          const title = card.querySelector('strong') || card;
          const box = title.getBoundingClientRect(), style = getComputedStyle(title);
          const key = crypto.randomUUID();
          pendingFlight.current = {key, source:focus.sel, target:id, navigate:() => go(id, !timelineOpen)};
          setFlight({key,id,title:title.textContent,x:box.x + box.width / 2,y:box.y + box.height / 2,
            width:box.width,fontSize:style.fontSize,fontFamily:style.fontFamily,color:style.color});
          return;
        }
        pendingFlight.current = null;
        setFlight(null);
        go(id, !timelineOpen);
      }} onClear={() => {setPinnedList(null);reading.clear();}} onClose={() => {setPinnedList(null);queueOpen ? closeQueue() : latestOpen ? closeLatest() : historyOpen ? closeHistory() : setReaderCluster({owner: focus.sel, value: null});}}/>
    {shownNode && <div ref={reader.ref} inert={reader.closing || !branchesReady && !error} className="analysis-wrap reader-shell">
      <ReaderTransition documentId={shownNode.id} reduced={reduced}>
      <DocumentReader queue={queue} collectionAction={collectionAction} navigation={<ReadingNavigation graph={graph} reading={reading} onTravel={reading.travel}/>} onResize={syncReaderLayout} key={shownNode.id} reduced={reduced} onPreview={previewNode} graph={graph} node={shownNode} readingLocation={reader.shown.location} onReadingScroll={reading.saveScroll} module={moduleOf(graph, shownNode)} cluster={activeCluster} onCluster={showReaderCluster} onClose={() => setFocus({mod: null, sel: null})}/>
      </ReaderTransition>
    </div>}
  </section>;
}
