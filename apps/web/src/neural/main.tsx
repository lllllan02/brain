import { stateLabel } from '../document-state.ts';
import { useLibrary } from './useLibrary.ts';
import type { Focus } from '../types/graph.ts';
import { CONTENT_COLLECTIONS } from '../collections.ts';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { buildGraph, moduleOf } from './graph.ts';
import { Home } from './Home.tsx';
import { CONFIG } from '../config.ts';
import { useReadingHistory } from './useReadingHistory.ts';
import { parseReadingRoute } from './reading-history.ts';
import './neural.css';
import './documents.css';
import './horizon-theme.css';
import './controls.css';
import './layers.css';
import './mobile-reader.css';
document.title = CONFIG.brand.name;
function App() {
  const { library, error, updateState, stateAction, revision } = useLibrary();
  const [reduced, setReduced] = useState(
    () => matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  const graph = useMemo(() => (library ? buildGraph(library) : null), [library]);
  const reading = useReadingHistory(graph);
  const setFocus = useCallback(
    (next: Focus) =>
      reading.navigate(
        next.sel
          ? '#/doc/' + encodeURIComponent(next.sel)
          : next.mod
            ? '#/module/' + next.mod
            : '#/',
      ),
    [reading.navigate],
  );
  const route = parseReadingRoute(reading.location.url),
    node = graph?.index.get(route.id!);
  const focus = node?.module
    ? { mod: moduleOf(graph!, node)!.id, sel: node.id }
    : {
        mod:
          graph?.modules.some((m) => m.id === route.module) ||
          CONTENT_COLLECTIONS.some((c) => route.module === `collection:${c}`)
            ? route.module
            : null,
        sel: null,
      };
  if (!graph)
    return <div className="neural loading-screen">{error || `正在打开${CONFIG.brand.name}…`}</div>;
  return (
    <div className="neural page-home">
      <Home
        stateAction={stateAction}
        graph={graph}
        focus={focus}
        setFocus={setFocus}
        reading={reading}
        reduced={reduced}
      />
      {(error || (route.id && !node)) && (
        <div className="library-update-notice" role="status">
          {error ? '暂时无法同步，仍显示已加载内容' : '当前文档已移除或重命名'}
        </div>
      )}
      {updateState.id && !updateState.pending && (
        <div
          key={revision.current}
          className="document-state-toast"
          role="status"
          aria-live="polite"
          style={{ '--toast-duration': updateState.error ? '4500ms' : '2400ms' }}
        >
          {updateState.error || `已标记为${stateLabel(updateState.state)}`}
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById('root')!).render(<App />);
