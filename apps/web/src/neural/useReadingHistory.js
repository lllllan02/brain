import {useCallback, useEffect, useRef, useState} from 'react';
import {adjacentDocument, parseReadingRoute, readVisits, recordVisit, recentDocuments, rememberDocument} from './reading-history.js';

const storageKey = `brain:reading:v1:${location.pathname}`;
const uid = () => crypto.randomUUID();
const read = (storage, key) => {try {return window[storage].getItem(key);} catch {return null;}};
const write = (storage, key, value) => {try {window[storage].setItem(key, JSON.stringify(value));} catch {/* Reading still works when storage is unavailable. */}};

function initialHistory() {
  try {
    const saved = JSON.parse(read('sessionStorage', storageKey));
    const key = history.state?.brainReading;
    const cursor = saved?.entries?.findIndex(entry => entry.key === key && entry.url === location.hash);
    if (cursor >= 0 && saved.entries.every(e => typeof e.key === 'string' && typeof e.url === 'string'
      && (e.id === null || typeof e.id === 'string') && (e.scroll === null || Number.isFinite(e.scroll)))) {
      return {...saved, cursor};
    }
  } catch { /* Start a new navigation session after malformed or obsolete storage. */ }
  const route = parseReadingRoute(location.hash);
  const entry = {key: uid(), url: location.hash, id: route.id, scroll: null};
  history.replaceState({...history.state, brainReading: entry.key}, '', location.href);
  return {entries: [entry], cursor: 0};
}

export function useReadingHistory(graph) {
  const model = useRef(null);
  if (!model.current) model.current = initialHistory();
  const [locationState, setLocationState] = useState(() => model.current.entries[model.current.cursor]);
  const [visits, setVisits] = useState(() => readVisits(read('localStorage', storageKey)));
  const [recent, setRecent] = useState(() => recentDocuments(readVisits(read('localStorage', `${storageKey}:recent`) ?? JSON.stringify(visits))));
  const lastRead = useRef(null), restored = useRef(false), saveTimer = useRef(null);
  const persist = useCallback(() => write('sessionStorage', storageKey, model.current), []);
  const captureScroll = useCallback(() => {
    const entry = model.current.entries[model.current.cursor];
    const reader = document.querySelector('.document-reader');
    if (reader?.dataset.documentId === entry.id) entry.scroll = reader.querySelector('.an-scroll').scrollTop;
    persist();
  }, [persist]);
  const publish = useCallback(() => {
    const entry = model.current.entries[model.current.cursor];
    setLocationState({...entry});
    persist();
  }, [persist]);
  const navigate = useCallback(url => {
    const m = model.current, current = m.entries[m.cursor];
    if (url === current.url) return;
    captureScroll();
    const {id} = parseReadingRoute(url);
    const previous = [...m.entries].reverse().find(e => e.id === id && e.scroll !== null);
    const entry = {key: uid(), url, id, scroll: parseReadingRoute(url).anchor ? null : previous?.scroll ?? null};
    m.entries = [...m.entries.slice(0, m.cursor + 1), entry];
    m.cursor = m.entries.length - 1;
    history.pushState({brainReading: entry.key}, '', url);
    publish();
  }, [captureScroll, publish]);
  useEffect(() => {
    const route = () => {
      const m = model.current;
      const index = m.entries.findIndex(e => e.key === history.state?.brainReading && e.url === location.hash);
      if (index === m.cursor) return;
      captureScroll();
      if (index >= 0) m.cursor = index;
      else {
        const entry = {key: uid(), url: location.hash, id: parseReadingRoute(location.hash).id, scroll: null};
        m.entries = [...m.entries.slice(0, m.cursor + 1), entry]; m.cursor = m.entries.length - 1;
        history.replaceState({...history.state, brainReading: entry.key}, '', location.href);
      }
      publish();
    };
    const click = event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target.closest('a[href]');
      if (!anchor || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self')) return;
      const href = anchor.getAttribute('href');
      if (!href?.startsWith('#/doc/')) return;
      event.preventDefault(); navigate(href);
    };
    window.addEventListener('popstate', route);
    window.addEventListener('hashchange', route);
    document.addEventListener('click', click);
    window.addEventListener('pagehide', captureScroll);
    return () => {
      window.removeEventListener('popstate', route); window.removeEventListener('hashchange', route);
      document.removeEventListener('click', click); window.removeEventListener('pagehide', captureScroll);
      clearTimeout(saveTimer.current); persist();
    };
  }, [captureScroll, navigate, persist, publish]);
  useEffect(() => {
    if (!graph) return;
    const id = graph.index.get(locationState.id)?.module ? locationState.id : null;
    if (!restored.current) {
      restored.current = true;
      // Refreshing the same tab restores its last read without fabricating another step.
      if (read('sessionStorage', `${storageKey}:last`) === JSON.stringify(locationState.key)) {lastRead.current = id; return;}
    }
    const from = lastRead.current;
    lastRead.current = id;
    write('sessionStorage', `${storageKey}:last`, locationState.key);
    if (!id || id === from) return;
    const visit = {key: uid(), id, from, time: Date.now()};
    setVisits(old => recordVisit(old, visit));
    setRecent(old => rememberDocument(old, visit));
  }, [graph, locationState.key, locationState.id]);
  useEffect(() => write('localStorage', storageKey, visits), [visits]);
  useEffect(() => write('localStorage', `${storageKey}:recent`, recent), [recent]);
  const saveScroll = useCallback((key, top) => {
    const entry = model.current.entries.find(e => e.key === key);
    if (!entry) return;
    entry.scroll = Math.max(0, top);
    clearTimeout(saveTimer.current); saveTimer.current = setTimeout(persist, 150);
  }, [persist]);
  const available = new Set(graph?.nodes.filter(n => n.module).map(n => n.id));
  const m = model.current;
  const back = adjacentDocument(m.entries, m.cursor, -1, available);
  const forward = adjacentDocument(m.entries, m.cursor, 1, available);
  const travel = direction => {
    const target = adjacentDocument(m.entries, m.cursor, direction, available);
    if (target < 0) return;
    captureScroll(); history.go(target - m.cursor);
  };
  return {location: {...locationState, anchor: parseReadingRoute(locationState.url).anchor}, visits, recent,
    navigate, saveScroll, back: back >= 0 ? m.entries[back].id : null,
    forward: forward >= 0 ? m.entries[forward].id : null, travel,
    clear() {setVisits([]); setRecent([]); lastRead.current = null;}};
}
