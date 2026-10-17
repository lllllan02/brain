import { useMemo, useState } from 'react';
import type { ReaderDocumentNode, ReaderGraph } from '../types/graph.ts';
import type { ReadingQueue } from '../types/reading.ts';
import type { ReadingController } from '../types/ui.ts';
import { collectionLabel } from '../collections.ts';
import { stateLabel, type DocumentState } from '../document-state.ts';
import { CollectionIcon } from './CollectionIcon.tsx';
import './dashboard-overview.css';
import {
  DASHBOARD_STATES,
  docHref,
  topicGroups,
  recentActivity,
  type DashboardData,
} from './dashboard-data.ts';

export function StateBar({ counts }: { counts: Record<DocumentState, number> }) {
  const label = DASHBOARD_STATES.map((s) => `${stateLabel(s)} ${counts[s]} 篇`).join('，');
  return (
    <span className="db-state-bar" role="img" aria-label={label} title={label}>
      {DASHBOARD_STATES.map((s) => (
        <i key={s} data-state={s} style={{ flex: counts[s] }} />
      ))}
    </span>
  );
}
export function DocRow({ doc, detail }: { doc: ReaderDocumentNode; detail?: string }) {
  return (
    <a className="db-doc-row" href={docHref(doc.id)}>
      <span className="db-doc-icon" aria-hidden="true">
        <CollectionIcon {...doc} />
      </span>
      <span>
        <strong>{doc.title}</strong>
        <small>
          {detail ||
            `${collectionLabel(doc.collection)}${doc.category ? ` · ${doc.category}` : ''}`}
        </small>
      </span>
      <span className="db-arrow" aria-hidden="true">
        ↗
      </span>
    </a>
  );
}
export function DashboardOverview({
  data,
  graph,
  reading,
  queue,
  today,
  openLibrary,
  openActivity,
}: {
  data: DashboardData;
  graph: ReaderGraph;
  reading: ReadingController;
  queue: ReadingQueue;
  today: string;
  openLibrary(): void;
  openActivity(day?: string): void;
}) {
  const [list, setList] = useState('reading');
  const [showAll, setShowAll] = useState(false);
  const recent = reading.recent
    .map((entry) => graph.index.get(entry.id))
    .filter((d): d is ReaderDocumentNode => d?.nodeType === 'document');
  const queued = queue.items
    .map((entry) => graph.index.get(entry.id))
    .filter((d): d is ReaderDocumentNode => d?.nodeType === 'document');
  const feature = recent[0] || queued[0];
  const documents = (list === 'reading' ? queued : recent).filter((d) => d.id !== feature?.id);
  const topics = useMemo(() => topicGroups(data.docs).slice(0, 5), [data]);
  const activity = useMemo(
    () => recentActivity(graph.activity?.events || [], today),
    [graph.activity, today],
  );
  const peak = Math.max(1, ...activity.series.map((d) => d.count));
  const suggestions = (feature?.readingSuggestions || [])
    .map((id) => graph.index.get(id))
    .filter((d): d is ReaderDocumentNode => d?.nodeType === 'document')
    .slice(0, 2);
  return (
    <div className="db-overview">
      <section className="db-reading" aria-labelledby="db-resume-title">
        <div className="db-feature">
          <p className="db-eyebrow" id="db-resume-title">
            {recent.length ? '从上次阅读继续' : '从这里开始阅读'}
          </p>
          {feature ? (
            <>
              <div className="db-feature-meta">
                <span>{collectionLabel(feature.collection)}</span>
                <span>{feature.category || '未分类'}</span>
              </div>
              <h2>
                <a href={docHref(feature.id)}>{feature.title}</a>
              </h2>
              <p className="db-feature-summary">
                {feature.summary || '打开正文，继续探索这篇文档。'}
              </p>
              <a className="db-primary" href={docHref(feature.id)}>
                {recent.length ? '继续阅读' : '打开文档'} <span aria-hidden="true">→</span>
              </a>
              {suggestions.length > 0 && (
                <div className="db-next">
                  <span>文内建议接着读</span>
                  {suggestions.map((d) => (
                    <a key={d.id} href={docHref(d.id)}>
                      {d.title} <span aria-hidden="true">↗</span>
                    </a>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <h2>选一篇，开始今天的阅读</h2>
              <p className="db-feature-summary">
                回到星图查找感兴趣的文档，或将文档标为“阅读中”，下次从这里继续。
              </p>
              <button className="db-primary" onClick={openLibrary}>
                浏览星图 <span aria-hidden="true">→</span>
              </button>
            </>
          )}
        </div>
        <div className="db-reading-list">
          <div className="db-section-head">
            <h2>阅读书架</h2>
          </div>
          <div className="db-switch" aria-label="阅读书架列表">
            {[
              ['reading', '阅读中', queued.length],
              ['recent', '最近打开', recent.length],
            ].map(([id, label, count]) => (
              <button
                key={id}
                aria-pressed={list === id}
                onClick={() => {
                  setList(String(id));
                  setShowAll(false);
                }}
              >
                {label}
                <span>{count}</span>
              </button>
            ))}
          </div>
          <div className="db-books">
            {documents.length ? (
              (showAll ? documents : documents.slice(0, 3)).map((doc) => (
                <DocRow key={doc.id} doc={doc} />
              ))
            ) : (
              <p className="db-empty">
                {list === 'reading'
                  ? '暂无其他阅读中文档。可在正文工具栏中标记阅读状态。'
                  : '暂无其他阅读记录。打开过的文档会保存在当前浏览器。'}
              </p>
            )}
          </div>
          {documents.length > 3 && (
            <button
              className="db-text-button"
              onClick={() => setShowAll(!showAll)}
              aria-expanded={showAll}
            >
              {showAll ? '收起列表' : `查看其余 ${documents.length - 3} 篇`}{' '}
              <span aria-hidden="true">{showAll ? '↑' : '↓'}</span>
            </button>
          )}
          <p className="db-caption">
            {list === 'reading'
              ? '按进入阅读中的时间排列，随文档状态同步。'
              : '按本机最近打开顺序排列，仅保存在当前浏览器。'}
          </p>
          <div className="db-status-summary">
            <div className="db-metrics" aria-label="文档学习状态">
              {DASHBOARD_STATES.map((state) => (
                <div key={state} className="db-metric" data-state={state}>
                  <span>
                    <i />
                    {stateLabel(state)}
                  </span>
                  <strong>
                    {data.counts[state].toLocaleString('zh-CN')}
                    <small>篇</small>
                  </strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <div className="db-overview-bottom">
        <section className="db-overview-section db-topics" aria-labelledby="db-topics-title">
          <div className="db-section-head">
            <div>
              <h2 id="db-topics-title">知识分布</h2>
            </div>
            <button className="db-text-button" onClick={openLibrary}>
              浏览星图 <span aria-hidden="true">↗</span>
            </button>
          </div>
          <div className="db-topic-list">
            {topics.length ? (
              topics.map((topic) => (
                <a key={topic.name} href={`#/module/${topic.docs[0].module}`}>
                  <span>{topic.name}</span>
                  <StateBar counts={topic.counts} />
                  <strong>
                    {topic.docs.length}
                    <small>篇</small>
                  </strong>
                  <span aria-hidden="true">↗</span>
                </a>
              ))
            ) : (
              <p className="db-empty">
                暂无文档。向启用的内容目录添加 Markdown 文件后会在这里显示。
              </p>
            )}
          </div>
          <div className="db-legend">
            {DASHBOARD_STATES.map((s) => (
              <span key={s}>
                <i data-state={s} />
                {stateLabel(s)}
              </span>
            ))}
          </div>
        </section>
        <section className="db-overview-section db-recent" aria-labelledby="db-recent-title">
          <div className="db-section-head">
            <div>
              <h2 id="db-recent-title">
                近期变化<span className="db-period">近 14 天</span>
              </h2>
            </div>
            <button className="db-text-button" onClick={() => openActivity()}>
              查看记录 <span aria-hidden="true">↗</span>
            </button>
          </div>
          <p className="db-activity-intro">
            <strong>{activity.documents}</strong> 篇文档留下了变化记录
          </p>
          <div className="db-bars" aria-label="最近14天的文档与配图变化">
            {activity.series.map((d) => (
              <button
                key={d.day}
                onClick={() => openActivity(d.day)}
                aria-label={`${d.day}，${d.count} 项已知变化，查看明细`}
                title={`${d.day} · ${d.count} 项`}
              >
                <span
                  style={{ height: `${Math.max(3, (d.count / peak) * 100)}%` }}
                  data-empty={!d.count}
                />
              </button>
            ))}
          </div>
          <div className="db-chart-axis">
            <span>{activity.start.slice(5).replace('-', '/')}</span>
            <span>每天去重文档与配图数</span>
            <span>今天</span>
          </div>
          <p className="db-caption">
            {graph.activity?.error
              ? '记录暂不可用，显示可读取的已知历史。'
              : '含文档日期回填；无记录不代表没有变化。'}
            点击柱形查看当天记录。
          </p>
        </section>
      </div>
    </div>
  );
}
