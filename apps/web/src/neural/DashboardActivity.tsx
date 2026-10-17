import { useMemo, useState } from 'react';
import type { ReaderGraph } from '../types/graph.ts';
import { collectionRegistry, collectionLabel } from '../collections.ts';
import { stateLabel, type DocumentState } from '../document-state.ts';
import {
  ACTIVITY_KINDS,
  activityDay,
  dailyItems,
  dayDetails,
  filterActivity,
  shiftDay,
} from './activity-model.ts';
import { docHref, monthCells, shiftMonth } from './dashboard-data.ts';

export function DashboardActivity({
  graph,
  today,
  selected,
  setSelected,
}: {
  graph: ReaderGraph;
  today: string;
  selected: string;
  setSelected(day: string): void;
}) {
  const [collection, setCollection] = useState('all');
  const [kind, setKind] = useState('all');
  const [limit, setLimit] = useState(20);
  const month = selected.slice(0, 7);
  const cells = monthCells(month);
  const events = useMemo(
    () => filterActivity(graph.activity?.events || [], collection, kind),
    [graph.activity, collection, kind],
  );
  const counts = useMemo(() => dailyItems(events), [events]);
  const details = dayDetails(events, selected);
  const peak = Math.max(1, ...cells.map((d) => counts.get(d) || 0));
  const observed = activityDay(graph.activity?.startedAt);
  const chooseDay = (day: string) => {
    setSelected(day);
    setLimit(20);
  };
  const changeMonth = (offset: number) => {
    const next = shiftMonth(month, offset);
    chooseDay(next === today.slice(0, 7) ? today : `${next}-01`);
  };
  return (
    <div className="db-activity-view">
      <div className="db-activity-toolbar">
        <div>
          <label>
            目录
            <select
              value={collection}
              onChange={(e) => {
                setCollection(e.target.value);
                setLimit(20);
              }}
            >
              <option value="all">全部目录</option>
              {collectionRegistry.collections
                .filter((c) => c.enabled)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.description}
                  </option>
                ))}
            </select>
          </label>
          <label>
            活动
            <select
              value={kind}
              onChange={(e) => {
                setKind(e.target.value);
                setLimit(20);
              }}
            >
              <option value="all">全部活动</option>
              {Object.entries(ACTIVITY_KINDS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      {graph.activity?.error && (
        <p className="db-warning" role="status">
          {graph.activity.error} 先显示可读取的历史，请稍后重试。
        </p>
      )}
      <div className="db-calendar-layout">
        <section className="db-panel db-calendar-panel" aria-label="变更月历">
          <div className="db-calendar-nav">
            <button aria-label="上个月" onClick={() => changeMonth(-1)}>
              ←
            </button>
            <h2>
              {new Intl.DateTimeFormat('zh-CN', {
                year: 'numeric',
                month: 'long',
                timeZone: 'Asia/Shanghai',
              }).format(new Date(`${month}-01T00:00:00+08:00`))}
            </h2>
            <button
              aria-label="下个月"
              disabled={month >= today.slice(0, 7)}
              onClick={() => changeMonth(1)}
            >
              →
            </button>
          </div>
          <div className="db-calendar-weekdays" aria-hidden="true">
            {'一二三四五六日'.split('').map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="db-calendar-days" aria-label={`${month}的变更日期`}>
            {cells.map((day) => {
              const outside = !day.startsWith(month),
                future = day > today,
                value = counts.get(day) || 0;
              const unknown = !observed || day < observed;
              return (
                <button
                  key={day}
                  data-day={day}
                  data-level={value ? Math.max(1, Math.ceil((value / peak) * 4)) : 0}
                  data-today={day === today}
                  disabled={outside || future}
                  aria-label={`${day}，${value ? `${value} 项已知变化` : unknown ? '无已知记录' : '未检测到变化'}`}
                  aria-pressed={selected === day}
                  tabIndex={selected === day ? 0 : -1}
                  onClick={() => chooseDay(day)}
                  onKeyDown={(event) => {
                    const offset = { ArrowUp: -7, ArrowDown: 7, ArrowLeft: -1, ArrowRight: 1 }[
                      event.key
                    ];
                    if (offset === undefined) return;
                    event.preventDefault();
                    const next = shiftDay(day, offset);
                    if (next > today) return;
                    const calendar = event.currentTarget.parentElement;
                    chooseDay(next);
                    requestAnimationFrame(() =>
                      calendar?.querySelector<HTMLButtonElement>(`[data-day="${next}"]`)?.focus(),
                    );
                  }}
                >
                  <span>{outside ? '' : Number(day.slice(-2))}</span>
                  {!outside && value > 0 && <small>{value}</small>}
                </button>
              );
            })}
          </div>
          <div className="db-calendar-footer">
            <span>每日去重文档 / 配图数</span>
            <button className="db-text-button" onClick={() => chooseDay(today)}>
              回到今天
            </button>
          </div>
          <p className="db-caption">
            {observed
              ? `变更检测始于 ${observed}，此前仅有部分文档日期。`
              : '当前仅有已知文档日期，历史记录不完整。'}
          </p>
        </section>
        <section className="db-day-panel" aria-labelledby="db-day-title">
          <div className="db-section-head">
            <div>
              <p className="db-eyebrow">{selected === today ? '今天' : '当天明细'}</p>
              <h2 id="db-day-title">{selected}</h2>
            </div>
            <span>{details.length} 条记录</span>
          </div>
          {details.length ? (
            <>
              <ul className="db-event-list">
                {details.slice(0, limit).map((event) => (
                  <li key={event.id}>
                    <span className="db-event-dot" data-kind={event.kind} />
                    <div>
                      <div className="db-event-meta">
                        <span>{ACTIVITY_KINDS[event.kind]}</span>
                        <small>{event.source === 'metadata' ? '文档日期' : '检测记录'}</small>
                      </div>
                      {event.docId && graph.index.has(event.docId) ? (
                        <a href={docHref(event.docId)}>
                          {event.title} <span aria-hidden="true">↗</span>
                        </a>
                      ) : (
                        <strong>{event.title}</strong>
                      )}
                      <p>
                        {event.kind === 'state-changed'
                          ? `${stateLabel(event.from as DocumentState)} → ${stateLabel(event.to as DocumentState)}`
                          : event.kind === 'moved'
                            ? `${collectionLabel(event.from)} → ${collectionLabel(event.to)}`
                            : event.collections.map(collectionLabel).join(' / ') || '未关联文档'}
                        {event.files?.length
                          ? ` · ${event.files.map((f) => f.split('/').pop()).join('、')}`
                          : ''}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              {details.length > limit && (
                <button className="db-text-button" onClick={() => setLimit(limit + 20)}>
                  再显示 {Math.min(20, details.length - limit)} 条 ↓
                </button>
              )}
            </>
          ) : (
            <div className="db-empty db-empty-large">
              <span aria-hidden="true">◷</span>
              <h3>
                {!observed || selected < observed ? '这一天暂无已知记录' : '这一天未检测到变化'}
              </h3>
              <p>
                {!observed || selected < observed
                  ? '历史记录不完整，不能由此判断当天是否有活动。'
                  : '可以选择其他日期，或调整目录和活动筛选。'}
              </p>
            </div>
          )}
          <details className="db-method">
            <summary>这些记录能说明什么？</summary>
            <div>
              <p>
                按北京时间统计。同一天、同一个文档或配图去重；明细按对象、活动类型与迁移方向合并。迁移在来源与目标目录都可见，全部范围仅计一次。月历与明细共用目录、活动筛选。
              </p>
              <p>
                “文档日期”只来自明确填写的创建时间与最后更新时间，按回填时的目录归类，不能还原全部历史。“检测记录”来自本地加载时的快照比较；服务停用期间的多次保存可能合并到下次检测。静态页面显示构建时已知的记录。
              </p>
              <p>
                同路径同名的不同图片格式归为一组，新增格式只说明检测到新文件；已有图片首次检测仅建立基线。已删除或不再收录的文档历史不展示。这些记录不用于推算阅读时长、学习天数或掌握程度。
              </p>
            </div>
          </details>
        </section>
      </div>
    </div>
  );
}
