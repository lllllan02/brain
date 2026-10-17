import type { ReaderGraph } from '../types/graph.ts';
import type { ReadingQueue } from '../types/reading.ts';
import type { useReadingHistory } from './useReadingHistory.ts';
import { memo, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { staticPages } from '../data/library-client.ts';
import { documentAppearance } from '../document-state.ts';
import { activityDay } from './activity-model.ts';
import { dashboardData, DASHBOARD_STATES, docDate, shortDate } from './dashboard-data.ts';
import { DashboardOverview } from './DashboardOverview.tsx';
import { DashboardActivity } from './DashboardActivity.tsx';
import './workbench.css';

import { dashboardHref, type DashboardView } from './dashboard-route.ts';
const stateColors = Object.fromEntries(
  DASHBOARD_STATES.map((state) => [`--db-${state}`, documentAppearance({ state }).color]),
) as CSSProperties;
const views = [
  {
    id: 'overview',
    title: '学习概况',
    icon: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  },
  {
    id: 'activity',
    title: '变更记录',
    icon: 'M4 5h16v16H4z M8 2v6 M16 2v6 M4 11h16 M8 15h2 M14 15h2',
  },
] as const;
export const Workbench = memo(function Workbench({
  graph,
  hidden,
  reading,
  queue,
  view,
  openLibrary,
}: {
  graph: ReaderGraph;
  hidden: boolean;
  reading: ReturnType<typeof useReadingHistory>;
  queue: ReadingQueue;
  view: DashboardView;
  openLibrary(): void;
}) {
  const [today, setToday] = useState(() => activityDay(new Date().toISOString())!);
  const [selectedDay, setSelectedDay] = useState(today);
  const host = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const data = useMemo(() => dashboardData(graph), [graph]);
  useEffect(() => {
    if (hidden) return;
    const update = () => setToday(activityDay(new Date().toISOString())!);
    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, [hidden]);
  useEffect(() => {
    if (hidden) return;
    host.current?.scrollTo({ top: 0 });
  }, [view, hidden]);
  const changeView = (next: DashboardView) => {
    reading.navigate(dashboardHref(next));
    host.current?.scrollTo({ top: 0 });
    requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }));
  };
  const openActivity = (day = today) => {
    setSelectedDay(day);
    changeView('activity');
  };
  const current = views.find((item) => item.id === view)!;
  return (
    <main
      className="workbench"
      data-dashboard-view={view}
      hidden={hidden}
      aria-label="知识库统计看板"
      ref={host}
      style={stateColors}
    >
      <a
        className="db-skip"
        href="#dashboard-content"
        onClick={(event) => {
          event.preventDefault();
          heading.current?.focus();
        }}
      >
        跳到看板内容
      </a>
      <aside className="db-sidebar">
        <p className="db-sidebar-label">我的学习空间</p>
        <nav aria-label="看板视图">
          {views.map((item) => (
            <a
              key={item.id}
              href={dashboardHref(item.id)}
              aria-current={view === item.id ? 'page' : undefined}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d={item.icon} />
              </svg>
              {item.title}
              <span aria-hidden="true">↗</span>
            </a>
          ))}
        </nav>
        <div className="db-library-note">
          <span className="db-library-symbol" aria-hidden="true">
            ✳
          </span>
          <strong>
            {data.docs.length.toLocaleString('zh-CN')}
            <small> 篇文档</small>
          </strong>
          <p>文档、引用与阅读状态</p>
          <div>
            <i />
            {staticPages ? '静态文档快照' : '随文档同步'}
          </div>
          <small>
            {data.latest ? `最近内容日期 · ${shortDate(docDate(data.latest))}` : '文档日期尚未填写'}
          </small>
        </div>
      </aside>
      <div className="db-content" id="dashboard-content">
        <h1 className="db-sr-only" ref={heading} tabIndex={-1}>
          {current.title}
        </h1>
        {view === 'overview' && (
          <DashboardOverview
            data={data}
            graph={graph}
            reading={reading}
            queue={queue}
            today={today}
            openLibrary={openLibrary}
            openActivity={openActivity}
          />
        )}
        {view === 'activity' && (
          <DashboardActivity
            graph={graph}
            today={today}
            selected={selectedDay}
            setSelected={setSelectedDay}
          />
        )}
      </div>
    </main>
  );
});
