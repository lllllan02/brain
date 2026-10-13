import { stateLabel, type DocumentState } from '../document-state.ts';
import type { ReaderGraph } from '../types/graph.ts';
import type { LibraryActivity } from '../types/library.ts';
import { useEffect, useMemo, useState } from 'react';
import { collectionRegistry, collectionLabel } from '../collections.ts';
import {
  ACTIVITY_KINDS,
  activityDay,
  filterActivity,
  dailyItems,
  dayDetails,
  yearCells,
  shiftDay,
} from './activity-model.ts';
import './activity.css';

export function ActivityTimeline({
  activity,
  graph,
}: {
  activity?: LibraryActivity;
  graph: ReaderGraph;
}) {
  const [collection, setCollection] = useState('all'),
    [kind, setKind] = useState('all');
  const [today, setToday] = useState(() => activityDay(new Date().toISOString())!);
  const [year, setYear] = useState(() => today.slice(0, 4)),
    [selected, setSelected] = useState(today);
  useEffect(() => {
    const timer = setInterval(() => setToday(activityDay(new Date().toISOString())!), 60000);
    return () => clearInterval(timer);
  }, []);
  const events = activity?.events || [];
  const scope = useMemo(() => filterActivity(events, collection), [events, collection]);
  const filtered = useMemo(() => filterActivity(scope, 'all', kind), [scope, kind]);
  const counts = useMemo(() => dailyItems(filtered), [filtered]);
  const cells = yearCells(year),
    peak = Math.max(1, ...cells.map((day) => counts.get(day) || 0));
  const details = dayDetails(filtered, selected);
  const years = [
    ...new Set([
      today.slice(0, 4),
      ...events
        .map((e) => activityDay(e.time)?.slice(0, 4))
        .filter((y) => y && y <= today.slice(0, 4)),
    ]),
  ]
    .sort()
    .reverse();
  const observedStart = activityDay(activity?.startedAt);
  const selectYear = (value: string) => {
    setYear(value);
    setSelected(value === today.slice(0, 4) ? today : `${value}-12-31`);
  };
  return (
    <section className="stats-panel activity-panel" aria-labelledby="activity-title">
      <div className="activity-heading">
        <div>
          <h2 id="activity-title">活动日历</h2>
          <p>按年浏览，选择日期查看具体变化</p>
        </div>
        <label>
          统计目录
          <select value={collection} onChange={(e) => setCollection(e.target.value)}>
            <option value="all">全部</option>
            {collectionRegistry.collections
              .filter((c) => c.enabled)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
          </select>
        </label>
      </div>
      {activity?.error && (
        <p className="activity-warning" role="status">
          {activity.error}
        </p>
      )}
      <p className="activity-caption">
        {observedStart
          ? `变更检测始于 ${observedStart}；此前仅有部分文档日期，图片与迁移历史不完整。`
          : '当前仅有文档日期，尚无完整的图片与迁移历史。'}
      </p>
      <div className="activity-section-title">
        <h3>活动热力图</h3>
        <div className="activity-filters">
          <label>
            活动
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="all">全部活动</option>
              {Object.entries(ACTIVITY_KINDS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            年份
            <select value={year} onChange={(e) => selectYear(e.target.value)}>
              {years.map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="activity-calendar-scroll">
        <div className="activity-calendar" style={{ '--weeks': cells.length / 7 }}>
          <div className="activity-months" aria-hidden="true">
            {cells
              .filter((_, i) => i % 7 === 0)
              .map((day, i) => (
                <span key={day}>
                  {i === 0
                    ? '1月'
                    : cells
                          .slice(i * 7, i * 7 + 7)
                          .some((d) => d.startsWith(year) && d.endsWith('-01'))
                      ? `${Number(
                          cells
                            .slice(i * 7, i * 7 + 7)
                            .find((d) => d.startsWith(year) && d.endsWith('-01'))!
                            .slice(5, 7),
                        )}月`
                      : ''}
                </span>
              ))}
          </div>
          <div className="activity-weekdays" aria-hidden="true">
            <span>一</span>
            <span />
            <span>三</span>
            <span />
            <span>五</span>
            <span />
            <span>日</span>
          </div>
          <div className="activity-grid" aria-label={`${year}年活动日期`}>
            {cells.map((day) => {
              const outside = !day.startsWith(year),
                future = day > today,
                value = counts.get(day) || 0;
              const level = value ? Math.min(4, Math.max(1, Math.ceil((value / peak) * 4))) : 0;
              const unknown = !observedStart || day < observedStart;
              const label = `${day}：${value ? `${value} 项已知活动` : unknown ? '无已知记录' : '未检测到活动'}`;
              return (
                <button
                  type="button"
                  key={day}
                  disabled={outside || future}
                  className={`${outside ? 'outside' : ''} ${unknown && !value ? 'unknown' : ''}`}
                  data-level={level}
                  aria-label={label}
                  aria-pressed={selected === day}
                  title={label}
                  data-day={day}
                  tabIndex={selected === day ? 0 : -1}
                  onClick={() => setSelected(day)}
                  onKeyDown={(event) => {
                    const offset = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7 }[
                      event.key
                    ];
                    if (offset === undefined) return;
                    event.preventDefault();
                    const next = shiftDay(day, offset);
                    if (!next.startsWith(year) || next > today) return;
                    setSelected(next);
                    event.currentTarget
                      .parentElement!.querySelector<HTMLButtonElement>(`[data-day="${next}"]`)
                      ?.focus();
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
      <div className="activity-legend">
        <span>每日去重文档 / 配图数 · 空格详情可悬停查看</span>
        <div>
          <span>少</span>
          {[0, 1, 2, 3, 4].map((n) => (
            <i key={n} data-level={n} />
          ))}
          <span>多</span>
        </div>
      </div>
      <div className="activity-details">
        <div className="activity-section-title">
          <h3>
            {selected} <span>当天明细</span>
          </h3>
          <span>{details.length} 条已知记录</span>
        </div>
        {details.length ? (
          <ul>
            {details.map((e) => (
              <li key={e.id}>
                <span className="activity-kind">{ACTIVITY_KINDS[e.kind] || e.kind}</span>
                <div>
                  {e.docId && graph.index.has(e.docId) ? (
                    <a href={`#/doc/${encodeURIComponent(e.docId)}`}>{e.title}</a>
                  ) : (
                    <strong>{e.title}</strong>
                  )}
                  <p>
                    {e.kind === 'state-changed'
                      ? `${stateLabel(e.from as DocumentState)} → ${stateLabel(e.to as DocumentState)}`
                      : e.kind === 'moved'
                        ? `${collectionLabel(e.from)} → ${collectionLabel(e.to)}`
                        : e.collections.length
                          ? e.collections.map(collectionLabel).join(' / ')
                          : '未关联文档'}
                    {e.files?.length
                      ? ` · ${e.files.map((f: string) => f.split('/').pop()).join('、')}`
                      : ''}
                  </p>
                </div>
                <small>{e.source === 'metadata' ? '文档日期' : '检测记录'}</small>
              </li>
            ))}
          </ul>
        ) : (
          <p className="stats-empty">
            {!observedStart || selected < observedStart
              ? '这一天没有可用历史记录，不代表没有发生变化。'
              : '当前筛选下，这一天未检测到活动。'}
          </p>
        )}
      </div>
      <details className="activity-method">
        <summary>统计口径与记录范围</summary>
        <p>
          按北京时间统计。目录筛选同时作用于热力图和明细；迁移在来源、目标目录都可见，「全部」不重复计算。活动类型只筛选热力图和明细。
        </p>
        <p>
          历史仅使用明确填写的创建时间和最后更新时间，按回填时的目录归类，无法还原全部修改与迁移。
          {observedStart ? `检测记录始于 ${observedStart}。` : '尚未启用本地变更检测。'}
          本地运行时随文档加载比较快照；服务未运行或页面未刷新期间的变化记在下次检测日期，无法还原期间多次往返。静态页面显示构建时已知记录。
        </p>
        <p>
          同路径同名、不同扩展名的图片视为一组配图；新增格式表示检测到了新文件，不推断执行过转换。图片目录归属来自检测时引用它的文档，多目录引用在全部范围内去重；未关联图片仅在全部中显示。首次检测仅建立已有图片基线。已删除或未收录文档不展示历史条目。
        </p>
      </details>
    </section>
  );
}
