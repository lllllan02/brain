import React from 'react';
import {Icon} from './icons';

export function ReadingQueueButton({queue, node, className}) {
  const added = queue.has(node.id);
  const label = added ? '移出待阅读' : '加入待阅读';
  return <button type="button" className={className} aria-pressed={added}
    aria-label={`${label}：${node.title}`} title={label} onClick={() => queue.toggle(node.id)}>
    <Icon name="save" size={15} fill={added ? 'currentColor' : 'none'}/>
  </button>;
}
