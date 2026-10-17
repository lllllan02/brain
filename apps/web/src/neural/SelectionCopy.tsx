import React, { useEffect, useRef, useState } from 'react';
import type { LibraryDocument } from '../types/library.ts';
import { Icon } from './icons.tsx';
import { Toast } from './Toast.tsx';
import './selection-copy.css';
import { selectionMarkdown } from './selection-markdown.ts';

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
      '选中内容（Markdown）：',
      ...selectionMarkdown(article, range)
        .split('\n')
        .map((line) => `> ${line}`),
    ].join('\n'),
  };
}

function CopyActions({
  readerRef,
  node,
  scope,
}: {
  readerRef?: React.RefObject<HTMLElement | null>;
  node: LibraryDocument;
  scope: 'selection' | 'document';
}) {
  const [excerpt, setExcerpt] = useState<Excerpt | null>(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [copyAttempt, setCopyAttempt] = useState(0);
  const toolbar = useRef<HTMLDivElement>(null);
  const statusDuration = status.startsWith('复制失败') ? 4500 : 2400;
  useEffect(() => {
    if (scope !== 'document' || !status) return;
    const timer = setTimeout(() => setStatus(''), statusDuration);
    return () => clearTimeout(timer);
  }, [scope, status, statusDuration, copyAttempt]);
  useEffect(() => {
    setExcerpt(null);
    setStatus('');
    if (scope === 'document') return;
    let previousReference = '';
    const update = () => {
      if (toolbar.current?.contains(document.activeElement)) return;
      const next = readerRef?.current ? selectedExcerpt(readerRef.current, node) : null;
      setExcerpt(next);
      if ((next?.reference || '') !== previousReference) setStatus('');
      previousReference = next?.reference || '';
    };
    const dismiss = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || toolbar.current?.dataset.mode !== 'selection') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      window.getSelection()?.removeAllRanges();
      setExcerpt(null);
      setStatus('');
    };
    const outside = (event: PointerEvent) => {
      if (toolbar.current?.contains(event.target as Node)) return;
      setExcerpt(null);
      setStatus('');
    };
    document.addEventListener('selectionchange', update);
    document.addEventListener('pointerdown', outside);
    window.addEventListener('keydown', dismiss, true);
    return () => {
      document.removeEventListener('selectionchange', update);
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('keydown', dismiss, true);
    };
  }, [readerRef, node.id, node.html, node.title, node.path, scope]);
  const copy = async (reference: boolean) => {
    setCopyAttempt((previous) => previous + 1);
    setStatus('');
    setBusy(true);
    try {
      const text = excerpt
        ? reference
          ? excerpt.reference
          : excerpt.text
        : [
            '以下是 Horizon 项目中的文档引用：',
            '',
            `文件：content/${node.path}`,
            `文档：${node.title}`,
            '范围：整篇文档',
          ].join('\n');
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
  if (scope === 'selection' && !excerpt) return null;
  return (
    <div
      className={scope === 'selection' ? 'selection-copy' : 'document-reference-copy'}
      data-mode={scope}
      ref={toolbar}
      role="group"
      aria-label={excerpt ? '复制选中文字' : '复制文档引用'}
      onPointerDown={(event) => {
        if (excerpt) event.preventDefault();
      }}
    >
      {excerpt && (
        <button type="button" disabled={busy} onClick={() => copy(false)}>
          复制纯文本
        </button>
      )}
      <button
        type="button"
        disabled={busy}
        aria-label="复制引用"
        onClick={() => copy(true)}
        title={
          excerpt
            ? '复制文档、路径、章节和选中内容的 Markdown'
            : '复制文档标题、文件路径和整篇文档范围'
        }
      >
        {scope === 'document' ? (
          <Icon name={status === '引用已复制' ? 'check' : 'copy'} size={14} />
        ) : (
          '复制引用'
        )}
      </button>
      {scope === 'document' ? (
        status && <Toast key={copyAttempt} message={status} duration={statusDuration} />
      ) : (
        <span role="status" aria-atomic="true">
          {status}
        </span>
      )}
    </div>
  );
}

export function SelectionCopy(props: {
  readerRef: React.RefObject<HTMLElement | null>;
  node: LibraryDocument;
}) {
  return <CopyActions {...props} scope="selection" />;
}

export function DocumentReferenceCopy({ node }: { node: LibraryDocument }) {
  return <CopyActions node={node} scope="document" />;
}
