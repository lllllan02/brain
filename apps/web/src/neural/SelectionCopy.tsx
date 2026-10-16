import React, { useEffect, useRef, useState } from 'react';
import type { LibraryDocument } from '../types/library.ts';
import './selection-copy.css';

type Excerpt = { text: string; reference: string };

function sectionAt(article: Element, container: Node, offset: number) {
  const point = document.createRange();
  point.setStart(container, offset);
  point.collapse(true);
  const stack: { level: number; title: string; id: string }[] = [];
  for (const heading of article.querySelectorAll('h1, h2, h3, h4, h5, h6')) {
    const start = document.createRange();
    start.selectNodeContents(heading);
    start.collapse(true);
    if (point.compareBoundaryPoints(Range.START_TO_START, start) < 0) break;
    const level = Number(heading.tagName.slice(1));
    while (stack.length && stack[stack.length - 1].level >= level) stack.pop();
    stack.push({ level, title: heading.textContent || '', id: heading.id });
  }
  return {
    title: stack.map((item) => item.title).join(' → ') || '正文开头（无章节标题）',
    anchor: stack.at(-1)?.id || '',
  };
}

function selectedExcerpt(root: HTMLElement, node: LibraryDocument): Excerpt | null {
  const selection = window.getSelection();
  const article = root.querySelector('article.markdown');
  if (!article || !selection || selection.isCollapsed || selection.rangeCount !== 1) return null;
  const range = selection.getRangeAt(0);
  if (!article.contains(range.startContainer) || !article.contains(range.endContainer)) return null;
  const text = selection.toString();
  if (!text.trim()) return null;
  let start = sectionAt(article, range.startContainer, range.startOffset);
  let foundStart = false;
  // Use the last selected text character, so an end boundary at the next heading
  // does not incorrectly label that unselected heading as part of the excerpt.
  let endContainer = range.endContainer;
  let endOffset = range.endOffset;
  const endPoint = range.cloneRange();
  endPoint.collapse(false);
  const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const candidate = walker.currentNode;
    if (!range.intersectsNode(candidate) || !candidate.textContent?.trim()) continue;
    const from = candidate === range.startContainer ? range.startOffset : 0;
    const to = candidate === range.endContainer ? range.endOffset : candidate.textContent.length;
    if (from >= to) continue;
    const point = document.createRange();
    point.setStart(candidate, 0);
    point.collapse(true);
    if (point.compareBoundaryPoints(Range.START_TO_START, endPoint) >= 0) continue;
    if (!foundStart) {
      start = sectionAt(article, candidate, from);
      foundStart = true;
    }
    endContainer = candidate;
    endOffset =
      candidate === range.endContainer
        ? Math.max(0, range.endOffset - 1)
        : candidate.textContent.length - 1;
  }
  const end = sectionAt(article, endContainer, endOffset);
  return {
    text,
    reference: [
      '以下是 Horizon 项目中的文档引用：',
      '',
      `文件：content/${node.path}`,
      `文档：${node.title}`,
      `章节：${start.title}${start.anchor === end.anchor && start.title === end.title ? '' : ` 至 ${end.title}`}`,
      '',
      '网页选中文本：',
      ...text.split('\n').map((line) => `> ${line}`),
    ].join('\n'),
  };
}

export function SelectionCopy({
  readerRef,
  node,
}: {
  readerRef: React.RefObject<HTMLElement | null>;
  node: LibraryDocument;
}) {
  const [excerpt, setExcerpt] = useState<Excerpt | null>(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const toolbar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setExcerpt(null);
    setStatus('');
    let previousReference = '';
    const update = () => {
      if (toolbar.current?.contains(document.activeElement)) return;
      const next = readerRef.current ? selectedExcerpt(readerRef.current, node) : null;
      setExcerpt(next);
      if ((next?.reference || '') !== previousReference) setStatus('');
      previousReference = next?.reference || '';
    };
    const dismiss = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !toolbar.current) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      window.getSelection()?.removeAllRanges();
      setExcerpt(null);
    };
    const outside = (event: PointerEvent) => {
      if (toolbar.current?.contains(event.target as Node)) return;
      setExcerpt(null);
    };
    document.addEventListener('selectionchange', update);
    document.addEventListener('pointerdown', outside);
    window.addEventListener('keydown', dismiss, true);
    return () => {
      document.removeEventListener('selectionchange', update);
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('keydown', dismiss, true);
    };
  }, [readerRef, node.id, node.html, node.title, node.path]);
  const copy = async (reference: boolean) => {
    if (!excerpt) return;
    setBusy(true);
    try {
      const text = reference ? excerpt.reference : excerpt.text;
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // LAN HTTP readers may not have the secure-context Clipboard API.
        const input = document.createElement('textarea');
        input.value = text;
        input.style.cssText = 'position:fixed;left:-9999px;top:0';
        document.body.append(input);
        const selection = window.getSelection();
        const saved = selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
        const focused = document.activeElement as HTMLElement | null;
        try {
          input.select();
          if (!document.execCommand('copy')) throw new Error('Copy failed');
        } finally {
          input.remove();
          if (saved) {
            selection?.removeAllRanges();
            selection?.addRange(saved);
          }
          focused?.focus({ preventScroll: true });
        }
      }
      setStatus(reference ? '引用已复制' : '纯文本已复制');
    } catch {
      setStatus('复制失败，请重试或使用系统复制。');
    } finally {
      setBusy(false);
    }
  };
  if (!excerpt) return null;
  return (
    <div
      className="selection-copy"
      ref={toolbar}
      role="group"
      aria-label="复制选中文字"
      onPointerDown={(event) => event.preventDefault()}
    >
      <button type="button" disabled={busy} onClick={() => copy(false)}>
        复制纯文本
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => copy(true)}
        title="复制文档、路径、章节和选中原文"
      >
        复制引用
      </button>
      <span role="status" aria-atomic="true">
        {status}
      </span>
    </div>
  );
}
