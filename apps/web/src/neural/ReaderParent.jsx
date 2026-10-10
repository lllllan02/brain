import React from 'react';
import {Icon} from './icons';

export function ReaderParent({parent}) {
  if (!parent) return null;
  return <nav className="reader-parent" aria-label="上级文档">
    <span title="上级文档"><Icon name="parent" size={14}/><span className="sr-only">上级</span></span>
    <span className="reader-parent-target"><a className="wiki-link" id={parent.referenceId} href={parent.href} title={`上级文档：${parent.title}`}>{parent.title}</a></span>
  </nav>;
}
