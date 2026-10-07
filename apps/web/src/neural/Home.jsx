import React, {useEffect, useMemo, useRef, useState} from 'react';
import {moduleOf} from './graph';
import {DocumentReader} from './DocumentReader';
import '../galaxy/galaxy.css';

export function moduleItems(graph, modId) {
  return graph.nodes.filter(node => node.modules?.includes(modId))
    .sort((a, b) => (a.type === 'overview' ? 0 : 1) - (b.type === 'overview' ? 0 : 1));
}

export function Home({graph, focus, setFocus, reduced, onAbout}) {
  const host = useRef(null), scene = useRef(null), searchInput = useRef(null);
  const current = useRef({focus, setFocus});
  const [labels, setLabels] = useState([]), [ready, setReady] = useState(false), [error, setError] = useState('');
  const [paused, setPaused] = useState(reduced), [preset, setPreset] = useState('nebula');
  const [query, setQuery] = useState('');
  current.current = {focus, setFocus, paused, preset};
  const documents = useMemo(() => graph.nodes.filter(node => node.module), [graph]);
  const node = graph.index.get(focus.sel), module = graph.modules.find(m => m.id === focus.mod);
  const go = id => {
    const target = graph.index.get(id); if (!target?.module) return;
    setQuery(''); setFocus({mod: moduleOf(graph, target).id, sel: id});
  };
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) return documents.filter(n => [n.title, n.category, ...n.aliases, ...n.tags, n.body].join(' ').toLowerCase().includes(q));
    return module ? moduleItems(graph, module.id) : [];
  }, [query, documents, graph, module]);
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
      instance.pause(current.current.paused);
      if (current.current.preset !== 'nebula') instance.preset(current.current.preset);
    }).catch(() => {
      if (active) setError('当前浏览器无法显示三维星云，可继续使用搜索、分类和文档列表阅读。');
    });
    return () => { active = false; instance?.dispose(); scene.current = null; };
  }, [graph, reduced]);
  useEffect(() => { scene.current?.focus(focus.sel, focus.mod); }, [focus.sel, focus.mod]);
  useEffect(() => { scene.current?.pause(paused); }, [paused]);
  useEffect(() => {
    const key = event => {
      if (document.querySelector('[role="dialog"]')) return;
      const typing = event.target.closest('input,textarea,[contenteditable="true"]');
      if ((event.key === '/' && !typing) || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k')) {
        event.preventDefault(); searchInput.current?.focus();
      }
      if (event.key === 'Escape') {
        if (query) { setQuery(''); return; }
        searchInput.current?.blur();
        setFocus(focus.sel ? {mod: focus.mod, sel: null} : {mod: null, sel: null});
      }
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, [focus, query, setFocus]);
  const reset = () => { setQuery(''); setFocus({mod: null, sel: null}); scene.current?.reset(); };
  return <section className={`galaxy-page ${node ? 'galaxy-reading' : ''}`} aria-label="知识星云">
    <div className={`galaxy-viewport ${!ready || error ? 'is-loading' : ''}`} ref={host}>
      <div className="galaxy-labels">{ready && !error && labels.map(label =>
        <button key={label.id} className={`galaxy-label ${label.active ? 'is-active' : ''}`} style={{left: label.x, top: label.y}} onClick={() => go(label.id)}>{label.title}</button>
      )}</div>
    </div>
    <aside className="galaxy-explorer" aria-label="探索文档">
      <div className="galaxy-heading"><h1>知识星云</h1><p>{documents.length} 篇文档，{graph.links.filter(l => l.kind === 'wiki').length} 条连接</p></div>
      <label className="galaxy-search"><span aria-hidden="true">⌕</span><input ref={searchInput} value={query} onChange={e => setQuery(e.target.value)} placeholder="寻找一个想法" aria-label="搜索标题、别名、标签或正文"/><kbd>/</kbd></label>
      <nav className="galaxy-categories" aria-label="文档分类">
        <button className={!module ? 'is-active' : ''} onClick={reset} aria-pressed={!module}><i className="all-stars"/>全部星辰<span>{documents.length}</span></button>
        {graph.modules.map(m => <button key={m.id} className={focus.mod === m.id ? 'is-active' : ''} aria-pressed={focus.mod === m.id} onClick={() => {setQuery('');setFocus({mod: m.id, sel: null});}}><i style={{background: m.color}}/>{m.title}<span>{moduleItems(graph, m.id).length}</span></button>)}
      </nav>
      {(query.trim() || module) && <div className="galaxy-results" aria-label={query.trim() ? '搜索结果' : '分类文档'}>
        <p>{query.trim() ? `找到 ${results.length} 篇文档` : module.title}</p>
        {results.map(n => <button key={n.id} className={n.id === focus.sel ? 'is-active' : ''} onClick={() => go(n.id)}>{n.title}<small>{n.summary}</small></button>)}
        {!results.length && <p>没有找到文档，试试其他关键词。</p>}
      </div>}
      <button className="galaxy-about" onClick={onAbout}>关于这片星空</button>
    </aside>
    {!node && <div className="galaxy-caption" aria-hidden="true"><span>让每一个想法，在星云中相遇。</span><small>拖动旋转 · 滚轮缩放 · 点击星辰阅读</small></div>}
    {!ready && !error && documents.length > 0 && <div className="galaxy-status" role="status">正在展开星系…</div>}
    {(error || !documents.length) && <div className="galaxy-status" role="status">{error || '还没有文档。保存笔记后，这里会亮起第一颗星。'}</div>}
    <div className="galaxy-controls" role="toolbar" aria-label="星云视图控制">
      <label>视图<select value={preset} disabled={Boolean(error)} onChange={e => {setPreset(e.target.value);scene.current?.preset(e.target.value);}}><option value="galaxy">银河</option><option value="nebula">星云</option><option value="deepfield">深空</option></select></label>
      <button onClick={() => setPaused(value => !value)} aria-pressed={paused} disabled={Boolean(error) || reduced}>{reduced ? '静态浏览' : paused ? '继续环绕' : '暂停环绕'}</button>
      <button onClick={reset}>回到全景</button>
      <button disabled={!ready || Boolean(error) || reduced} onClick={() => {reset();scene.current?.replay();}}>重播</button>
    </div>
    {node?.module && <div className="analysis-wrap" key={node.id}>
      <DocumentReader graph={graph} node={node} module={moduleOf(graph, node)} onGo={go} onClose={() => setFocus({mod: focus.mod, sel: null})}/>
    </div>}
  </section>;
}
