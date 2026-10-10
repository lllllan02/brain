import React, {useState} from 'react';
import {Icon} from './icons';
import {documentSources} from './document-sources.js';

export function ReaderSources({sources}) {
  const [expanded, setExpanded] = useState(false);
  const items = documentSources(sources);
  if (!items.length) return null;
  return <div className={`reader-sources${expanded ? ' is-expanded' : ''}`} aria-label="文档来源">
    <span className="reader-sources-label"><Icon name="outlink" size={13}/>来源</span>
    <ul>{(expanded ? items : items.slice(0, 1)).map(({title, href}) => <li key={href || title}>{href
      ? <a href={href} target="_blank" rel="noopener noreferrer" title={`${title}\n${href}`}>{title}</a>
      : <span>{title}</span>}</li>)}</ul>
    {items.length > 1 && <button type="button" className="reader-sources-more" aria-expanded={expanded} aria-label={expanded ? '收起来源' : `查看全部 ${items.length} 个来源`} onClick={() => setExpanded(value => !value)}>{expanded ? '收起' : `+${items.length - 1}`}</button>}
  </div>;
}
