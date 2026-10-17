import { readingDocuments } from '../reading-order.ts';
import { stateLabel } from '../document-state.ts';
import { useReadingFlight } from './useReadingFlight.ts';
import { useReaderLayout } from './useReaderLayout.ts';
import { GalaxyOverlay } from './GalaxyOverlay.tsx';
import type { HomeProps } from '../types/ui.ts';
import type { ReaderCluster } from '../types/reading.ts';
import type { createGalaxy } from '../galaxy/scene.ts';
import { useGalaxyScene, type GalaxyBindings } from './useGalaxyScene.ts';
import type { Focus, ReaderNode } from '../types/graph.ts';
import type { Cluster } from '../types/reading.ts';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Workbench } from './Workbench.tsx';
import { useViewState } from './useViewState.ts';
import { validCluster, validPinnedList, validFocus } from './view-state.ts';
import { collectionLabel, CONTENT_COLLECTIONS } from '../collections.ts';
import { moduleOf, isDocumentNode } from './graph.ts';
import { createSearchIndex, searchDocuments } from './search.ts';
import { CONFIG, asset } from '../config.ts';
import { DocumentReader } from './DocumentReader.tsx';
import { ListNavigation } from './ListNavigation.tsx';
import { ClusterList, clusterDocuments } from './ClusterList.tsx';
import { Icon } from './icons.tsx';
import { ReadingNavigation } from './ReadingHistory.tsx';
import { latestDocuments, documentHighlight } from './latest-documents.ts';
import { activeReadingTrail, readingTrail, readingDirection } from './reading-history.ts';
import { usePresence } from '../motion/usePresence.ts';
import { ReaderTransition } from '../motion/ReaderTransition.tsx';
import { CardToStar } from '../motion/CardToStar.tsx';
import { MOTION, motionVariables } from '../motion/tokens.ts';
import '../motion/motion.css';
import '../galaxy/galaxy.css';

export function Home({ graph, focus, setFocus, reading, reduced, stateAction }: HomeProps) {
  const host = useRef<HTMLDivElement>(null),
    scene = useRef<ReturnType<typeof createGalaxy>>(null),
    searchInput = useRef<HTMLInputElement>(null);
  const composing = useRef(false);
  const current = useRef<GalaxyBindings>({ focus, setFocus });
  const readerTimeline = useRef<{ progress: number; animation: Animation | null }>({
    progress: 0,
    animation: null,
  });
  const preset = graph.index.get(focus.sel!)?.module ? 'nebula' : 'deepfield';
  const [expanded, setExpanded] = useViewState('expanded', false);
  const [grouping, setGrouping] = useViewState(
    'grouping',
    'category',
    (value): value is string =>
      typeof value === 'string' && ['category', 'collection'].includes(value),
  );
  const [readerCluster, setReaderCluster] = useViewState<ReaderCluster | null>(
    'readerCluster',
    null,
    validCluster,
  );
  const [pinnedList, setPinnedList] = useViewState<Cluster | null>(
    'pinnedList',
    null,
    validPinnedList,
  );
  const collectionFilter = 'all';
  const [clusterVisible, setClusterVisible] = useState(false);
  const [mobileListOpen, setMobileListOpen] = useState(false);
  useEffect(() => {
    setMobileListOpen(false);
  }, [focus.sel]);
  const [historyOpen, setHistoryOpen] = useViewState('historyOpen', false);
  const historyToggle = useRef<HTMLButtonElement>(null),
    latestToggle = useRef<HTMLButtonElement>(null);
  const [latestOpen, setLatestOpen] = useViewState('latestOpen', false);
  const [relationMode, setRelationMode] = useViewState<'incoming' | 'outgoing' | 'suggested'>(
    'relationMode',
    'suggested',
    (value): value is 'incoming' | 'outgoing' | 'suggested' => value === 'suggested',
  );
  const queue = useMemo(
    () => ({
      items: readingDocuments(graph.nodes, graph.activity).map(({ id }) => ({ id })),
    }),
    [graph],
  );
  // Always enter through the galaxy; a previous dashboard visit is not a landing preference.
  const [homeMode, setHomeMode] = useState('galaxy');
  const workbenchVisible = homeMode === 'workbench' && !focus.sel && !focus.mod;
  const { ready, branchesReady, overlay, error } = useGalaxyScene({
    graph,
    workbenchVisible,
    host,
    scene,
    current,
    readerTimeline,
    onClearCluster: () => setReaderCluster(null),
  });
  const [galaxyReturnFocus, setGalaxyReturnFocus] = useViewState<Focus | null>(
    'galaxyReturnFocus',
    null,
    validFocus,
  );
  const [queueOpen, setQueueOpen] = useViewState('queueOpen', false);
  const queueToggle = useRef<HTMLButtonElement>(null);
  const closeQueue = () => {
    setQueueOpen(false);
    setReaderCluster({ owner: focus.sel, value: null });
    queueToggle.current?.focus({ preventScroll: true });
  };
  const timelineOpen = historyOpen || latestOpen || queueOpen;
  const latest = useMemo(() => latestDocuments(graph.nodes.filter((node) => node.module)), [graph]);
  const closeLatest = () => {
    setPinnedList(null);
    setLatestOpen(false);
    setReaderCluster({ owner: focus.sel, value: null });
    latestToggle.current?.focus({ preventScroll: true });
  };
  const { flight, revealedFlight, revealFlight, finishFlight, selectWithFlight } = useReadingFlight(
    scene,
    focus.sel,
    reduced,
  );
  const liveTrail = useMemo(
    () => (focus.sel ? activeReadingTrail(reading.path, reading.hop) : null),
    [focus.sel, reading.path, reading.hop],
  );
  const trail = useMemo(
    () =>
      pinnedList && (pinnedList.recent || pinnedList.latest)
        ? documentHighlight(pinnedList.pinnedIds!.map((id) => ({ id })))
        : latestOpen
          ? documentHighlight(latest)
          : historyOpen
            ? readingTrail(
                reading.visits,
                new Set(graph.nodes.filter((n) => n.module).map((n) => n.id)),
                reading.recent,
              )
            : liveTrail,
    [liveTrail, pinnedList, historyOpen, latestOpen, latest, reading.visits, reading.recent, graph],
  );
  const closeHistory = () => {
    setPinnedList(null);
    setHistoryOpen(false);
    setReaderCluster({ owner: focus.sel, value: null });
    historyToggle.current?.focus({ preventScroll: true });
  };
  const listAnchor = useCallback((id: string) => scene.current?.nodeAnchor(id), []);
  const previewNode = useCallback((id: string | null) => scene.current?.previewNode(id), []);
  // Group filters belong to their owner; reference direction follows document navigation.
  const activeCluster = useMemo<Cluster | null>(() => {
    if (!focus.sel || timelineOpen) return null;
    if (readerCluster?.owner === focus.sel) {
      const value = readerCluster.value;
      return value?.document ? { ...value, direction: 'suggested' } : value;
    }
    return { document: focus.sel, direction: relationMode };
  }, [focus.sel, readerCluster, timelineOpen, relationMode]);
  const displayedCluster = useMemo(
    () =>
      pinnedList ||
      (queueOpen
        ? { queue: queue.items }
        : latestOpen
          ? { latest }
          : historyOpen
            ? { recent: reading.recent }
            : activeCluster),
    [
      pinnedList,
      queueOpen,
      queue.items,
      latestOpen,
      latest,
      historyOpen,
      reading.recent,
      activeCluster,
    ],
  );
  const groupCluster = activeCluster?.document ? null : activeCluster;
  const [query, setQuery] = useViewState('query', ''),
    [searchOpen, setSearchOpen] = useViewState('searchOpen', false);
  const [searchSelection, setSearchSelection] = useState<{
    results: ReaderNode[];
    index: number;
  } | null>(null);
  const [reviewId, setReviewId] = useViewState<string | null>(
    'reviewId',
    null,
    (value) => value === null || typeof value === 'string',
  );
  current.current = {
    focus,
    setFocus,
    preset,
    expanded,
    grouping,
    groupCluster,
    reduced,
    trail,
    reading,
  };
  const documents = useMemo(() => graph.nodes.filter((node) => node.module), [graph]);
  const node = graph.index.get(focus.sel!);
  const reviewNode = graph.index.get(reviewId!);
  // Keep the panel in place while its contents hand off to the next document.
  const reader = usePresence(
    isDocumentNode(node) ? { node, location: reading.location } : null,
    node?.module ? 'reader' : null,
    reduced,
    'translateX(24px)',
    MOTION.morph,
    readerTimeline,
  );
  const shownNode = reader.shown?.node;
  const visualNode = node?.module ? shownNode : null;
  const visualFocus = { sel: visualNode?.id || null, mod: visualNode?.module || focus.mod };
  current.current.visualFocus = visualFocus;
  useLayoutEffect(() => scene.current?.preset(preset), [preset]);
  useEffect(() => {
    scene.current?.pause(reduced);
  }, [reduced, ready]);
  useEffect(() => scene.current?.setReducedMotion(reduced), [reduced]);
  useLayoutEffect(() => {
    scene.current?.readingTrail(trail);
  }, [trail]);
  useLayoutEffect(() => {
    scene.current?.focus(
      groupCluster ? null : visualFocus.sel,
      groupCluster ? (groupCluster.category ?? null) : visualFocus.mod,
      groupCluster?.tag,
      visualFocus.sel,
    );
  }, [visualFocus.sel, visualFocus.mod, groupCluster]);
  const syncReaderLayout = useReaderLayout(reader.ref, scene, shownNode?.id);
  const review = usePresence<ReaderNode | null, HTMLButtonElement>(
    reviewNode?.module ? reviewNode : null,
    reviewNode?.module ? reviewNode.id : null,
    reduced,
  );
  const go = (id: string, keepCluster = false) => {
    const target = graph.index.get(id);
    if (!target?.module) return;
    setReaderCluster(keepCluster && groupCluster ? { owner: id, value: groupCluster } : null);
    setQuery('');
    setSearchOpen(false);
    searchInput.current?.blur();
    setFocus({ mod: moduleOf(graph, target)!.id, sel: id });
  };
  const reviewRandom = () => {
    const candidates =
      documents.length > 1 ? documents.filter((n) => n.id !== (reviewId || focus.sel)) : documents;
    const target = candidates[Math.floor(Math.random() * candidates.length)];
    if (target) {
      setQuery('');
      setSearchOpen(false);
      searchInput.current?.blur();
      setReviewId(target.id);
    }
  };
  const searchIndex = useMemo(() => createSearchIndex(documents), [documents]);
  const results = useMemo(() => searchDocuments(searchIndex, query), [query, searchIndex]);
  // A new query or refreshed index always starts at the first result.
  const activeResultIndex = searchSelection?.results === results ? searchSelection.index : 0;
  const searchVisible = Boolean(searchOpen && query.trim());
  // Animate opening/closing only; changing the query must update rows immediately.
  const search = usePresence(
    searchVisible ? { results, activeResultIndex } : null,
    searchVisible ? 'search' : null,
    reduced,
  );
  useEffect(() => {
    if (searchVisible && !search.closing) {
      search.ref.current
        ?.querySelector('[aria-selected="true"]')
        ?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }
  }, [search.shown?.results, activeResultIndex, searchVisible, search.closing]);
  const statusText =
    error ||
    (!documents.length
      ? '还没有文档。保存笔记后，这里会亮起第一颗星。'
      : !ready && !node?.module
        ? '正在展开星系…'
        : null);
  const status = usePresence(statusText, statusText, reduced, 'none');
  useEffect(() => {
    if (!focus.sel) setReaderCluster(null);
  }, [focus.sel]);
  const showReaderCluster = (cluster: Cluster | null) => {
    setMobileListOpen(Boolean(cluster));
    setPinnedList(null);
    setHistoryOpen(false);
    setLatestOpen(false);
    setQueueOpen(false);
    setReaderCluster({ owner: focus.sel, value: cluster });
    if (expanded) {
      setExpanded(false);
      scene.current?.expand(false);
    }
  };
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (workbenchVisible) return;
      if (document.querySelector('[role="dialog"]')) return;
      const typing = (event.target as Element | null)?.closest(
        'input,textarea,[contenteditable="true"]',
      );
      const direction = readingDirection(event);
      if (direction && (focus.sel || historyOpen) && window.getSelection()?.isCollapsed !== false) {
        const navigation = current.current.reading!;
        if (direction < 0 ? navigation.back : navigation.forward) {
          event.preventDefault();
          navigation.travel(direction);
        }
        return;
      }
      if (
        (event.key === '/' && !typing) ||
        ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k')
      ) {
        event.preventDefault();
        searchInput.current?.focus();
      }
      if (event.key === 'Escape') {
        if (mobileListOpen && window.matchMedia('(max-width: 900px)').matches) {
          event.preventDefault();
          setMobileListOpen(false);
          return;
        }
        if (searchVisible) {
          event.preventDefault();
          setSearchOpen(false);
          searchInput.current?.blur();
          return;
        }
        if (queueOpen) {
          closeQueue();
          return;
        }
        if (latestOpen) {
          closeLatest();
          return;
        }
        if (historyOpen) {
          closeHistory();
          return;
        }
        if (query) {
          setQuery('');
          return;
        }
        setSearchOpen(false);
        searchInput.current?.blur();
        setFocus({ mod: null, sel: null });
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [
    focus,
    query,
    searchVisible,
    setFocus,
    historyOpen,
    latestOpen,
    queueOpen,
    workbenchVisible,
    mobileListOpen,
  ]);
  const reset = () => {
    setQuery('');
    setSearchOpen(false);
    searchInput.current?.blur();
    setFocus({ mod: null, sel: null });
    if (preset === 'deepfield') scene.current?.reset();
  };
  const switchHomeMode = (mode: string) => {
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
      const sel = graph.index.get(saved?.sel!)?.module ? saved!.sel : null;
      const mod =
        graph.modules.some((module) => module.id === saved?.mod) ||
        CONTENT_COLLECTIONS.some((collection) => saved?.mod === `collection:${collection}`)
          ? saved!.mod
          : null;
      setFocus({ sel, mod });
    }
  };
  return (
    <section
      className={`galaxy-page ${mobileListOpen ? 'mobile-list-open' : ''} ${workbenchVisible ? 'workbench-visible' : ''} ${node || shownNode ? 'galaxy-reading' : ''} ${displayedCluster || clusterVisible ? 'galaxy-browsing' : ''} ${timelineOpen ? 'galaxy-history-open' : ''} ${flight ? (revealedFlight === flight.key ? 'galaxy-handoff-revealing' : 'galaxy-handoff') : ''}`}
      aria-label={CONFIG.brand.name}
      data-home-return={!node?.module && !displayedCluster}
      data-reader-open={Boolean(node?.module)}
      data-view={preset}
      style={motionVariables}
    >
      <nav className="workbench-mode" aria-label="页面导航">
        <button
          type="button"
          onClick={() => switchHomeMode(workbenchVisible ? 'galaxy' : 'workbench')}
        >
          <Icon name={workbenchVisible ? 'back' : 'chart'} size={16} />
          <span>
            {workbenchVisible
              ? graph.index.get(galaxyReturnFocus?.sel!)?.module
                ? '返回阅读'
                : '返回星图'
              : '统计看板'}
          </span>
        </button>
      </nav>
      <CardToStar
        flight={flight}
        getAnchor={listAnchor}
        onReveal={revealFlight}
        onFinish={finishFlight}
        reduced={reduced}
      />
      <Workbench graph={graph} hidden={!workbenchVisible} reading={reading} queue={queue} />
      <div className={`galaxy-viewport ${!ready || error ? 'is-loading' : ''}`} ref={host}>
        <div className="galaxy-frame" aria-hidden="true" />
        <GalaxyOverlay
          store={overlay}
          trailProps={
            historyOpen || trail?.live
              ? {
                  route: flight && trail?.live ? { ...trail, segments: [] } : trail,
                  reduced,
                  hidden: workbenchVisible || !ready || Boolean(error),
                }
              : null
          }
          labelProps={{ ready: ready && !error, scene, focus, reading, setFocus, setReaderCluster }}
        />
      </div>
      <header className="galaxy-header">
        <a
          className="galaxy-brand"
          href="#/"
          aria-label={`${CONFIG.brand.name}，回到全景`}
          onClick={(event) => {
            event.preventDefault();
            reset();
          }}
        >
          <img src={asset('black-hole-logo.png')} width="44" height="44" alt="" />
          <span>{CONFIG.brand.name}</span>
        </a>
      </header>
      <div
        className={`galaxy-search-dock${reviewNode?.module ? ' has-review' : ''}`}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setSearchOpen(false);
        }}
      >
        {search.shown && (
          <div
            ref={search.ref}
            inert={search.closing}
            className="galaxy-results"
            role="region"
            aria-label="搜索结果"
          >
            <p role="status">
              {search.shown.results.length
                ? `${search.shown.results.length} 篇文档`
                : '没有找到相关内容'}
            </p>
            <div id="galaxy-search-results" role="listbox" aria-label="搜索笔记结果">
              {search.shown.results.map((n, index) => (
                <button
                  key={n.id}
                  id={`galaxy-search-result-${index}`}
                  type="button"
                  role="option"
                  tabIndex={-1}
                  aria-selected={index === search.shown!.activeResultIndex}
                  onPointerMove={() => setSearchSelection({ results, index })}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => go(n.id)}
                >
                  <span>{n.title}</span>
                  <small>
                    {n.category || '未分类'} · {collectionLabel(n.collection)}
                    {n.state && ` · ${stateLabel(n.state)}`}
                  </small>
                </button>
              ))}
            </div>
          </div>
        )}
        <form
          className="galaxy-search"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            if (!composing.current && searchVisible && results[activeResultIndex])
              go(results[activeResultIndex].id);
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width="17"
            height="17"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="m16 16 4.5 4.5" />
          </svg>
          <input
            ref={searchInput}
            value={query}
            onFocus={() => setSearchOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value);
              setSearchOpen(true);
            }}
            placeholder="搜索笔记"
            aria-label="搜索标题、别名、标签或正文"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={searchVisible}
            aria-controls={searchVisible ? 'galaxy-search-results' : undefined}
            aria-activedescendant={
              searchVisible && results.length
                ? `galaxy-search-result-${activeResultIndex}`
                : undefined
            }
            autoComplete="off"
            onCompositionStart={() => {
              composing.current = true;
            }}
            onCompositionEnd={() => {
              composing.current = false;
            }}
            onKeyDown={(event) => {
              if (
                composing.current ||
                event.nativeEvent.isComposing ||
                event.nativeEvent.keyCode === 229
              ) {
                if (event.key === 'Enter') event.preventDefault();
                return;
              }
              if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                setSearchOpen(true);
                if (results.length)
                  setSearchSelection({
                    results,
                    index: Math.max(
                      0,
                      Math.min(
                        results.length - 1,
                        activeResultIndex + (event.key === 'ArrowDown' ? 1 : -1),
                      ),
                    ),
                  });
              }
            }}
          />
          {query && (
            <button
              type="button"
              className="galaxy-search-clear"
              aria-label="清空搜索"
              onClick={() => {
                setQuery('');
                searchInput.current?.focus();
              }}
            >
              <Icon name="close" size={16} />
            </button>
          )}
        </form>
        <div className="galaxy-review">
          {review.shown && (
            <button
              ref={review.ref}
              inert={review.closing}
              type="button"
              className="galaxy-random galaxy-review-title"
              onClick={() => go(review.shown!.id)}
              title={review.shown.title}
              aria-label={`打开正文：${review.shown.title}`}
            >
              <span aria-live="polite" aria-atomic="true">
                {review.shown.title}
              </span>
            </button>
          )}
          <button
            key="random"
            type="button"
            className={`galaxy-random${reviewNode?.module ? ' galaxy-review-next' : ''}`}
            onClick={reviewRandom}
            disabled={!documents.length || (Boolean(reviewNode?.module) && documents.length < 2)}
            aria-label={reviewNode?.module ? '随机换一篇' : '随机复习一篇笔记'}
            title={
              !documents.length
                ? '暂无可复习的笔记'
                : reviewNode?.module
                  ? documents.length < 2
                    ? '只有一篇笔记'
                    : '随机换一篇'
                  : '随机抽取标题，先回忆再打开正文'
            }
          >
            <Icon name="shuffle" size={18} />
            {!reviewNode?.module && <span>随机复习</span>}
          </button>
        </div>
      </div>
      {status.shown && (
        <div className="galaxy-status" role="status">
          <span ref={status.ref}>{status.shown}</span>
        </div>
      )}
      <nav className="galaxy-views" aria-label="星空视图">
        {[
          ['category', '分类', 'grid'],
          ['collection', '目录', 'folder'],
        ].map(([mode, title, icon]) => (
          <button
            key={mode}
            className="galaxy-category-toggle"
            aria-pressed={expanded && grouping === mode}
            disabled={!ready || Boolean(error)}
            title={expanded && grouping === mode ? '收回整体星云' : `按${title}展开星云`}
            onClick={() => {
              const next = !expanded || grouping !== mode;
              setGrouping(mode);
              setExpanded(next);
              scene.current?.expand(next, mode);
            }}
          >
            <Icon name={icon} size={15} />
            <span>{title}</span>
          </button>
        ))}
      </nav>
      <ClusterList
        active={!workbenchVisible && (Boolean(error) || (ready && branchesReady))}
        collectionFilter={collectionFilter}
        navigation={
          <ListNavigation
            queue={queue}
            graph={graph}
            queueRef={queueToggle}
            node={pinnedList?.document ? graph.index.get(pinnedList.document) : node}
            cluster={displayedCluster}
            onChoose={(mode) => {
              const activeMode = displayedCluster?.queue
                ? 'queue'
                : displayedCluster?.latest
                  ? 'latest'
                  : displayedCluster?.recent
                    ? 'recent'
                    : displayedCluster?.document
                      ? displayedCluster.direction || 'outgoing'
                      : null;
              if (mode === activeMode) return;
              setPinnedList(null);
              setHistoryOpen(mode === 'recent');
              setLatestOpen(mode === 'latest');
              setQueueOpen(mode === 'queue');
              if (mode === 'outgoing' || mode === 'incoming' || mode === 'suggested') {
                setRelationMode(mode);
                showReaderCluster({ document: node!.id, direction: mode });
              }
            }}
          />
        }
        graph={graph}
        cluster={workbenchVisible ? null : displayedCluster}
        selected={node?.id}
        anchorId={pinnedList?.document || shownNode?.id}
        reduced={reduced}
        getAnchor={!pinnedList?.document && timelineOpen && !focus.sel ? undefined : listAnchor}
        pinned={Boolean(pinnedList)}
        onPin={() => {
          if (pinnedList) {
            setPinnedList(null);
            if (pinnedList.document && focus.sel)
              setReaderCluster({
                owner: focus.sel,
                value: { document: focus.sel, direction: relationMode },
              });
          } else if (displayedCluster)
            setPinnedList({
              ...displayedCluster,
              pinnedIds: clusterDocuments(graph, displayedCluster).map((item) => item.id),
            });
        }}
        onPresenceChange={setClusterVisible}
        onSelect={(id, card) => {
          setMobileListOpen(false);
          selectWithFlight(id, card, () => go(id, !timelineOpen));
        }}
        onClear={() => {
          setPinnedList(null);
          reading.clear();
        }}
        onClose={() => {
          setMobileListOpen(false);
          setPinnedList(null);
          queueOpen
            ? closeQueue()
            : latestOpen
              ? closeLatest()
              : historyOpen
                ? closeHistory()
                : setReaderCluster({ owner: focus.sel, value: null });
        }}
      />
      {shownNode && (
        <div
          ref={reader.ref}
          inert={reader.closing || (!branchesReady && !error)}
          className="analysis-wrap reader-shell"
        >
          <ReaderTransition documentId={shownNode.id} reduced={reduced}>
            <DocumentReader
              mobileListOpen={mobileListOpen}
              onToggleMobileList={() => {
                if (!mobileListOpen && !displayedCluster)
                  setReaderCluster({
                    owner: focus.sel,
                    value: { document: focus.sel!, direction: relationMode },
                  });
                setMobileListOpen((open) => !open);
              }}
              stateAction={stateAction}
              navigation={
                <ReadingNavigation graph={graph} reading={reading} onTravel={reading.travel} />
              }
              onResize={syncReaderLayout}
              key={shownNode.id}
              reduced={reduced}
              onPreview={previewNode}
              graph={graph}
              node={shownNode}
              readingLocation={reader.shown!.location}
              onReadingScroll={reading.saveScroll}
              module={moduleOf(graph, shownNode)}
              cluster={activeCluster}
              onCluster={showReaderCluster}
              onClose={() => setFocus({ mod: null, sel: null })}
            />
          </ReaderTransition>
        </div>
      )}
    </section>
  );
}
