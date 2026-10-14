import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CODE_ASSET_LIMIT } from '../code-assets.ts';
import './code-asset-preview.css';

type Target = { element: HTMLAnchorElement; href: string; name: string; language: string };
export function CodeAssetPreview({
  root,
  html,
}: {
  root: React.RefObject<HTMLElement | null>;
  html: string;
}) {
  const [target, setTarget] = useState<Target | null>(null);
  const [result, setResult] = useState<{ text: string; highlighted: string } | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('复制代码');
  const card = useRef<HTMLElement>(null);
  const pinned = useRef(false);
  const suppressed = useRef<HTMLAnchorElement | null>(null);
  const activeLink = useRef<HTMLAnchorElement | null>(null);
  const [placement, setPlacement] = useState<{
    host: HTMLElement;
    style?: React.CSSProperties;
    inline: boolean;
  } | null>(null);
  useLayoutEffect(() => {
    if (!target) {
      setPlacement(null);
      return;
    }
    let host: HTMLDivElement | null = null;
    const place = () => {
      host?.remove();
      host = null;
      const reader = root.current?.closest('.reader-shell') || root.current!;
      const rect = reader.getBoundingClientRect();
      const left = rect.left - 28;
      const right = window.innerWidth - rect.right - 28;
      if (Math.max(left, right) >= 280) {
        const width = Math.min(680, Math.max(left, right));
        setPlacement({
          host: document.body,
          inline: false,
          style: {
            width,
            left: left >= right ? rect.left - 16 - width : rect.right + 16,
            top: Math.max(12, Math.min(rect.top, window.innerHeight - 200)),
            maxHeight: Math.max(100, Math.min(window.innerHeight - 24, rect.height)),
          },
        });
      } else {
        // Keep the code in normal reading flow when no outside column is available.
        host = document.createElement('div');
        host.className = 'code-asset-preview-host';
        let block: HTMLElement = target.element;
        while (block.parentElement && block.parentElement !== root.current)
          block = block.parentElement;
        block.after(host);
        setPlacement({ host, inline: true });
      }
    };
    place();
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('resize', place);
      host?.remove();
    };
  }, [target, root]);
  const close = () => {
    setTarget(null);
    pinned.current = false;
  };
  useEffect(() => {
    close();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const find = (event: Event) =>
      event.target instanceof Element
        ? event.target.closest<HTMLAnchorElement>('a.code-asset-link')
        : null;
    const open = (link: HTMLAnchorElement) => {
      activeLink.current = link;
      setTarget({
        element: link,
        href: link.getAttribute('href')!,
        name: link.dataset.codeName!,
        language: link.dataset.codeLanguage!,
      });
    };
    const enter = (event: Event) => {
      if (card.current?.contains(event.target as Node)) {
        clearTimeout(timer);
        return;
      }
      if (pinned.current) return;
      if (event.type === 'pointerover' && (event as PointerEvent).pointerType !== 'mouse') return;
      const link = find(event);
      if (!link || !root.current?.contains(link) || suppressed.current === link) return;
      clearTimeout(timer);
      timer = setTimeout(() => open(link), 220);
    };
    const leave = (event: Event) => {
      if (find(event) === suppressed.current) suppressed.current = null;
      if (pinned.current) return;
      if (!find(event) && !card.current?.contains(event.target as Node)) return;
      const next = (event as FocusEvent).relatedTarget;
      if (next instanceof Node && (card.current?.contains(next) || find(event)?.contains(next)))
        return;
      clearTimeout(timer);
      timer = setTimeout(close, 600);
    };
    const click = (event: MouseEvent) => {
      const link = find(event);
      if (link && root.current?.contains(link)) {
        event.preventDefault();
        clearTimeout(timer);
        pinned.current = true;
        open(link);
      } else if (!card.current?.contains(event.target as Node)) close();
    };
    const key = (event: KeyboardEvent) => {
      if (
        event.key === 'Tab' &&
        !event.shiftKey &&
        document.activeElement === activeLink.current &&
        card.current
      ) {
        event.preventDefault();
        pinned.current = true;
        card.current.querySelector('button')?.focus();
      }
      if (event.key === 'Escape' && card.current) {
        event.preventDefault();
        event.stopImmediatePropagation();
        suppressed.current = activeLink.current;
        activeLink.current?.focus({ preventScroll: true });
        close();
      }
    };
    const events: [string, EventListener][] = [
      ['pointerover', enter],
      ['focusin', enter],
      ['pointerout', leave],
      ['focusout', leave],
    ];
    events.forEach(([name, fn]) => document.addEventListener(name, fn));
    document.addEventListener('click', click);
    window.addEventListener('keydown', key, true);
    window.addEventListener('hashchange', close);
    return () => {
      clearTimeout(timer);
      events.forEach(([name, fn]) => document.removeEventListener(name, fn));
      document.removeEventListener('click', click);
      window.removeEventListener('keydown', key, true);
      window.removeEventListener('hashchange', close);
    };
  }, [root, html]);
  useEffect(() => {
    setResult(null);
    setError('');
    setCopied('复制代码');
    if (!target) return;
    const controller = new AbortController();
    const load = async () => {
      try {
        if (target.href === '#') throw new Error('附件不存在、超出大小限制或不允许访问');
        const response = await fetch(target.href, { signal: controller.signal, cache: 'no-store' });
        if (!response.ok)
          throw new Error(response.status === 413 ? '代码附件超过 256 KiB' : '无法读取代码附件');
        const data = await response.arrayBuffer();
        if (data.byteLength > CODE_ASSET_LIMIT) throw new Error('代码附件超过 256 KiB');
        const text = new TextDecoder('utf-8', { fatal: true }).decode(data);
        if (text.includes('\0')) throw new Error('附件不是 UTF-8 文本');
        const hljs = (await import('highlight.js/lib/common')).default;
        const highlighted = hljs.highlight(text, { language: target.language }).value;
        if (!controller.signal.aborted) setResult({ text, highlighted });
      } catch (reason) {
        if (!controller.signal.aborted)
          setError(reason instanceof Error ? reason.message : '无法读取代码附件');
      }
    };
    void load();
    return () => controller.abort();
  }, [target]);
  if (!target || !placement) return null;
  const dismiss = () => {
    suppressed.current = target.element;
    target.element.focus({ preventScroll: true });
    close();
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result!.text);
      setCopied('已复制');
    } catch {
      setCopied('复制失败，请选择代码复制');
    }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([result!.text], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = target.name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return createPortal(
    <aside
      ref={card}
      className={`neural link-preview code-asset-preview${placement.inline ? ' is-inline' : ''}`}
      style={placement.style}
      role="dialog"
      aria-label={`代码预览：${target.name}`}
    >
      <header className="link-preview-header">
        <div>
          <span className="link-preview-label">代码附件 · {target.language}</span>
          <strong>{target.name}</strong>
        </div>
        <button type="button" onClick={dismiss} aria-label="关闭代码预览">
          ×
        </button>
      </header>
      <div className="link-preview-scroll markdown" tabIndex={0} aria-label="代码内容">
        {error ? (
          <p role="alert">{error}</p>
        ) : result ? (
          <pre>
            <code dangerouslySetInnerHTML={{ __html: result.highlighted }} />
          </pre>
        ) : (
          <p role="status">正在读取代码…</p>
        )}
      </div>
      <footer className="link-preview-footer">
        <button type="button" disabled={!result} onClick={copy}>
          {copied}
        </button>
        <button type="button" disabled={!result} onClick={download}>
          下载源文件
        </button>
      </footer>
    </aside>,
    placement.host,
  );
}
