import React, {useEffect, useMemo, useRef, useState} from 'react';
import {moduleOf} from './graph';
import {CONFIG, asset} from '../config';
import {DocumentReader} from './DocumentReader';
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
  const [query, setQuery] = useState(''), [searchOpen, setSearchOpen] = useState(false);
  current.current = {focus, setFocus, preset};
  const documents = useMemo(() => graph.nodes.filter(node => node.module), [graph]);
  const node = graph.index.get(focus.sel);
  const go = id => {
    const target = graph.index.get(id); if (!target?.module) return;
    setQuery(''); setSearchOpen(false); searchInput.current?.blur();
    setFocus({mod: moduleOf(graph, target).id, sel: id});
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
        onReset: () => current.current.setFocus({mod: null, sel: null}),
        onSelect: id => {
          const target = graph.index.get(id);
          if (target?.module) current.current.setFocus({mod: target.module, sel: id});
        },
      }, reduced);
      scene.current = instance;
      instance.focus(current.current.focus.sel, current.current.focus.mod);
      instance.pause(reduced);
      if (current.current.preset !== 'nebula') instance.preset(current.current.preset);
    }).catch(() => {
      if (active) setError('当前浏览器无法显示三维星云，可通过下方搜索继续阅读。');
    });
    return () => { active = false; instance?.dispose(); scene.current = null; };
  }, [graph, reduced]);
  useEffect(() => { scene.current?.focus(focus.sel, focus.mod); }, [focus.sel, focus.mod]);
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
  return <section className={`galaxy-page ${node ? 'galaxy-reading' : ''}`} aria-label="知识星云">
    <div className={`galaxy-viewport ${!ready || error ? 'is-loading' : ''}`} ref={host}>
      <div className="galaxy-labels" aria-hidden="true">{ready && !error && labels.map(label =>
        <span key={label.id} className="galaxy-label" style={{left: label.x, top: label.y}}>{label.title}</span>
      )}</div>
    </div>
    <header className="galaxy-header">
      <a className="galaxy-brand" href="#/" aria-label={`${CONFIG.brand.name}，回到全景`} onClick={event => {event.preventDefault();reset();}}>
        <img src={asset('nebula-logo.svg')} width="34" height="34" alt=""/><span>{CONFIG.brand.name}</span>
      </a>
    </header>
    <div className="galaxy-search-dock" onBlur={event => {if (!event.currentTarget.contains(event.relatedTarget)) setSearchOpen(false);}}>
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
    </div>
    {!ready && !error && documents.length > 0 && <div className="galaxy-status" role="status">正在展开星系…</div>}
    {(error || !documents.length) && <div className="galaxy-status" role="status">{error || '还没有文档。保存笔记后，这里会亮起第一颗星。'}</div>}
    <nav className="galaxy-views" aria-label="星空视图">
      {[['galaxy','银河'],['nebula','星云'],['deepfield','深空']].map(([id, title]) =>
        <button key={id} aria-pressed={preset === id} disabled={Boolean(error)} onClick={() => {setPreset(id);scene.current?.preset(id);}}>{title}</button>
      )}
    </nav>
    {node?.module && <div className="analysis-wrap" key={node.id}>
      <DocumentReader graph={graph} node={node} module={moduleOf(graph, node)} onGo={go} onClose={() => setFocus({mod: null, sel: null})}/>
    </div>}
  </section>;
}
