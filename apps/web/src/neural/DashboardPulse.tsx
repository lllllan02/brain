import type { ReaderGraph } from '../types/graph.ts';
import type { ReadingQueue } from '../types/reading.ts';
import type { ReadingController } from '../types/ui.ts';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { activityDay } from './activity-model.ts';
import { dashboardPulse, dashboardComparison } from './dashboard-model.ts';
import { CollectionIcon } from './CollectionIcon.tsx';
import { collectionLabel } from '../collections.ts';
import './dashboard-pulse.css';

function Trend({
  series,
  selected,
  onSelect,
}: {
  series: { day: string; created: number; updated: number }[];
  selected: number;
  onSelect(index: number): void;
}) {
  const gradient = useId();
  const host = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(648);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) setWidth(Math.max(260, entry.contentRect.width));
    });
    observer.observe(host.current!);
    return () => observer.disconnect();
  }, []);
  const plotWidth = width - 60;
  const max = Math.max(1, ...series.flatMap((d) => [d.created, d.updated]));
  const ceiling = Math.ceil(max / 4) * 4;
  const x = (i: number) => 36 + (i / Math.max(1, series.length - 1)) * plotWidth;
  const y = (value: number) => 174 - (value / ceiling) * 144;
  const path = (key: 'created' | 'updated') =>
    series.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d[key])}`).join(' ');
  const day = series[selected];
  return (
    <div className="pulse-chart" ref={host}>
      <div className="pulse-readout" aria-live="polite">
        <time>{day.day}</time>
        <span>
          <i />
          新增 <b>{day.created}</b>
        </span>
        <span>
          <i className="updated" />
          更新 <b>{day.updated}</b>
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} 210`}
        role="img"
        aria-label={`每日新增与更新趋势，最高刻度 ${ceiling} 篇。通过下方日期控件查看每日数值。`}
      >
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--wb-accent)" stopOpacity=".22" />
            <stop offset="100%" stopColor="var(--wb-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <line
              x1="36"
              x2={width - 24}
              y1={y((ceiling * i) / 4)}
              y2={y((ceiling * i) / 4)}
              className="pulse-grid"
            />
            <text x="25" y={y((ceiling * i) / 4) + 4} textAnchor="end">
              {(ceiling * i) / 4}
            </text>
          </g>
        ))}
        <path d={`${path('created')} L${width - 24},174 L36,174 Z`} fill={`url(#${gradient})`} />
        <path
          key={series.length}
          pathLength="1"
          className="pulse-line pulse-line-primary"
          d={path('created')}
          fill="none"
          stroke="var(--wb-accent)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path
          className="pulse-line pulse-line-secondary"
          d={path('updated')}
          fill="none"
          stroke="var(--wb-secondary)"
          strokeWidth="2"
          strokeDasharray="5 5"
        />
        <line
          x1={x(selected)}
          x2={x(selected)}
          y1="20"
          y2="174"
          stroke="var(--wb-soft)"
          strokeDasharray="3 4"
        />
        {(['created', 'updated'] as const).map((key) => (
          <circle
            key={key}
            cx={x(selected)}
            cy={y(day[key])}
            r="4"
            fill={key === 'created' ? 'var(--wb-accent)' : 'var(--wb-secondary)'}
            stroke="var(--wb-surface)"
            strokeWidth="2"
          />
        ))}
        {[0, Math.floor((series.length - 1) / 2), series.length - 1].map((i) => (
          <text
            key={i}
            x={x(i)}
            y="202"
            textAnchor={i === 0 ? 'start' : i === series.length - 1 ? 'end' : 'middle'}
          >
            {series[i].day.slice(5).replace('-', '/')}
          </text>
        ))}
        {series.map((d, i) => (
          <rect
            key={d.day}
            x={x(i) - plotWidth / Math.max(1, series.length - 1) / 2}
            y="16"
            width={plotWidth / Math.max(1, series.length - 1)}
            height="162"
            fill="transparent"
            onPointerEnter={() => onSelect(i)}
            onClick={() => onSelect(i)}
          />
        ))}
      </svg>
      <label className="pulse-date-slider">
        逐日查看
        <input
          aria-label="趋势日期"
          aria-valuetext={`${day.day}，新增 ${day.created} 篇，更新 ${day.updated} 篇`}
          type="range"
          min="0"
          max={series.length - 1}
          value={selected}
          onChange={(e) => onSelect(Number(e.target.value))}
        />
        <span>{day.day.slice(5).replace('-', '/')}</span>
      </label>
    </div>
  );
}

export function DashboardPulse({
  graph,
  reading,
  queue,
  hidden,
}: {
  graph: ReaderGraph;
  reading: ReadingController;
  queue: ReadingQueue;
  hidden: boolean;
}) {
  const [days, setDays] = useState(7),
    [selected, setSelected] = useState(6),
    [tab, setTab] = useState('recent');
  const [today, setToday] = useState(() => activityDay(new Date().toISOString())!);
  useEffect(() => {
    if (hidden) return;
    setToday(activityDay(new Date().toISOString())!);
    const timer = setInterval(() => setToday(activityDay(new Date().toISOString())!), 60000);
    return () => clearInterval(timer);
  }, [hidden]);
  const docs = useMemo(() => graph.nodes.filter((n) => n.module), [graph]);
  const pulse = useMemo(
    () => dashboardPulse(graph.activity, docs, today, days),
    [graph.activity, docs, today, days],
  );
  const comparison = useMemo(
    () => dashboardComparison(graph.activity, docs, today, days),
    [graph.activity, docs, today, days],
  );
  const delta = (key: keyof ReturnType<typeof dashboardPulse>['counts']) => {
    const value = comparison.current.counts[key] - comparison.previous.counts[key];
    return `${value > 0 ? '+' : ''}${value}`;
  };
  const recent = (reading?.recent || []).filter((item) => graph.index.get(item.id)?.module);
  const queued = (queue?.items || []).filter((item) => graph.index.get(item.id)?.module);
  const list = tab === 'recent' ? recent : queued;
  return (
    <>
      <div className="pulse-layout">
        <section className="stats-panel pulse-hero" aria-labelledby="pulse-title">
          <div className="stats-title">
            <h2 id="pulse-title">积累趋势</h2>
            <div className="pulse-segment" aria-label="趋势时间范围">
              {[7, 30].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={days === n}
                  onClick={() => {
                    setDays(n);
                    setSelected(n - 1);
                  }}
                >
                  {n} 天
                </button>
              ))}
            </div>
          </div>
          <div className="pulse-hero-body">
            <div className="pulse-figure">
              <span>新增文档</span>
              <p key={`${days}-${pulse.counts.created}`} className="pulse-number">
                <strong>{pulse.counts.created}</strong>
                <small>篇</small>
              </p>
              <span className="pulse-badge">近 {days} 天已知记录</span>
              <dl>
                <div>
                  <dt>更新文档</dt>
                  <dd>
                    {pulse.counts.updated}
                    <small> 篇</small>
                  </dd>
                </div>
                <div>
                  <dt>有记录的日期</dt>
                  <dd>
                    {pulse.activeDays}
                    <small> 天</small>
                  </dd>
                </div>
              </dl>
            </div>
            <Trend series={pulse.series} selected={selected} onSelect={setSelected} />
          </div>
          <details className="pulse-breakdown">
            <summary>查看近 {days} 天的活跃主题与配图变化</summary>
            <div className="pulse-breakdown-body">
              {pulse.topics.length ? (
                <ol className="pulse-topics">
                  {pulse.topics.map((topic) => (
                    <li key={topic.name}>
                      <span>{topic.name}</span>
                      <div>
                        <i style={{ width: `${(topic.count / pulse.topics[0].count) * 100}%` }} />
                      </div>
                      <strong>{topic.count}</strong>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="stats-empty">暂无已知的文档变化。</p>
              )}
              <p className="pulse-caption">
                配图：新增 {pulse.counts.images} 张，更新 {pulse.counts.imageUpdates} 张，新增格式{' '}
                {pulse.counts.formats} 组。主题按新增、更新或迁移的不同文档计数。
              </p>
            </div>
          </details>
          <p className="pulse-comparison">
            {comparison.comparable ? (
              <>
                截至昨日的 {days} 个完整日（{comparison.current.start} — {comparison.end}
                ），对比此前 {days} 天：新增 <strong>{delta('created')} 篇</strong>，更新{' '}
                <strong>{delta('updated')} 篇</strong>。
              </>
            ) : (
              <>周期对比需覆盖截至昨日的两个完整 {days} 天区间；检测记录尚不完整，暂不计算增减。</>
            )}
          </p>
          <p className="pulse-caption">
            {pulse.start} — {today} · 数字按区间去重，曲线按天去重。
            {pulse.complete
              ? '当前区间已启用变更检测。'
              : '部分日期仅有文档日期回填；无记录不代表没有变化。'}
          </p>
        </section>
        <section className="stats-panel pulse-reading" aria-labelledby="pulse-reading-title">
          <div className="stats-title">
            <h2 id="pulse-reading-title">接着读</h2>
            <span>{tab === 'recent' ? '当前浏览器' : '文档状态'}</span>
          </div>
          <div className="pulse-reading-tabs" aria-label="阅读列表">
            {(
              [
                ['recent', '最近阅读', recent.length],
                ['queue', '阅读中', queued.length],
              ] as [string, string, number][]
            ).map(([id, label, count]) => (
              <button key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>
                {label}
                <span>{count}</span>
              </button>
            ))}
          </div>
          {list.length ? (
            <ul className="pulse-docs">
              {list.slice(0, 4).map((item) => {
                const doc = graph.index.get(item.id)!;
                return (
                  <li key={item.id}>
                    <a href={`#/doc/${encodeURIComponent(doc.id)}`}>
                      <span className="pulse-doc-icon" aria-hidden="true">
                        <CollectionIcon {...doc} />
                      </span>
                      <span>
                        <strong>{doc.title}</strong>
                        <small>
                          {collectionLabel(doc.collection)}
                          {doc.category ? ` / ${doc.category}` : ''}
                        </small>
                      </span>
                      <span className="pulse-doc-arrow" aria-hidden="true">
                        →
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="pulse-empty">
              <span aria-hidden="true">{tab === 'recent' ? '↗' : '▤'}</span>
              <p>{tab === 'recent' ? '还没有阅读记录' : '阅读中列表是空的'}</p>
              <small>
                {tab === 'recent'
                  ? '打开一篇文档后，可在这里继续阅读。'
                  : '将文档状态设为“阅读中”，即可在这里继续阅读。'}
              </small>
            </div>
          )}
          <p className="pulse-caption">
            {list.length > 4 ? `显示${tab === 'recent' ? '最近阅读的' : '阅读中的'} 4 篇。` : ''}
            {tab === 'recent' ? '阅读记录保存在本机，不代表已掌握。' : '列表随文档状态同步。'}
          </p>
        </section>
      </div>
    </>
  );
}
