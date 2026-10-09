let enginePromise;
let nextId = 0;

function loadEngine() {
  if (!enginePromise) {
    enginePromise = import('mermaid').then(({default: mermaid}) => {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        suppressErrorRendering: true,
        theme: 'dark',
        fontFamily: 'Arial, "PingFang SC", "Microsoft YaHei", sans-serif',
      });
      return mermaid;
    }).catch(error => {
      enginePromise = undefined;
      throw error;
    });
  }
  return enginePromise;
}

// Each article owns its rendering lifetime. A late render must never update a
// replacement article or reuse an SVG ID from the reader / another preview.
export function renderDiagrams(article) {
  let cancelled = false;
  const blocks = [...article.querySelectorAll('.diagram-block')];
  const ready = (async () => {
    if (!blocks.length) return;
    let mermaid;
    try { mermaid = await loadEngine(); }
    catch {
      if (!cancelled) blocks.forEach(block => {
        block.querySelector('.diagram-status').textContent = '图表组件加载失败，可查看或复制源码。';
      });
      return;
    }
    await document.fonts.ready;
    for (const block of blocks) {
      if (cancelled) return;
      const status = block.querySelector('.diagram-status');
      const canvas = block.querySelector('.diagram-canvas');
      const source = block.querySelector('.diagram-source');
      // Mermaid needs a connected, measurable container. Keep temporary SVGs
      // outside the article so cleanup is safe even when React unmounts it.
      const host = document.createElement('div');
      host.className = 'diagram-render-host';
      host.setAttribute('aria-hidden', 'true');
      document.body.append(host);
      try {
        const {svg} = await mermaid.render(`brain-diagram-${++nextId}`, source.querySelector('code').textContent, host);
        if (cancelled) return;
        canvas.innerHTML = svg;
        const drawing = canvas.querySelector('svg');
        const width = drawing?.viewBox.baseVal.width;
        // Preserve readable text in wide diagrams; the viewport scrolls locally.
        if (width > 0) {
          drawing.style.width = `${width}px`;
          drawing.style.maxWidth = 'none';
        }
        canvas.hidden = false;
        source.open = false;
        status.hidden = true;
      } catch {
        if (!cancelled) {
          status.hidden = false;
          status.textContent = '图表未能渲染，请检查 Mermaid 语法；源码已保留。';
          source.open = true;
        }
      } finally {
        host.remove();
      }
    }
  })();
  return {ready, cancel() { cancelled = true; }};
}
