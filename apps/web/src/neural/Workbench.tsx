import type { ReaderGraph } from '../types/graph.ts';
import type { ReadingQueue } from '../types/reading.ts';
import type { useReadingHistory } from './useReadingHistory.ts';
import React, { memo } from 'react';
import './workbench.css';
import { CONFIG } from '../config.ts';
import { ActivityTimeline } from './ActivityTimeline.tsx';
import { DashboardInsights } from './DashboardInsights.tsx';
import { DashboardPulse } from './DashboardPulse.tsx';

export const Workbench = memo(function Workbench({
  graph,
  hidden,
  reading,
  queue,
}: {
  graph: ReaderGraph;
  hidden: boolean;
  reading: ReturnType<typeof useReadingHistory>;
  queue: ReadingQueue;
}) {
  return (
    <main className="workbench" hidden={hidden} aria-label="知识库统计看板">
      <header className="stats-heading">
        <div>
          <p>{CONFIG.brand.name} · 个人知识库</p>
          <h1>知识库概览</h1>
          <p className="stats-description">近期变化、内容构成与阅读入口。</p>
        </div>
        <span className="stats-live">
          <i />
          随文档自动更新
        </span>
      </header>
      <DashboardPulse graph={graph} reading={reading} queue={queue} hidden={hidden} />
      <DashboardInsights graph={graph} />
      <ActivityTimeline activity={graph.activity} graph={graph} />
    </main>
  );
});
