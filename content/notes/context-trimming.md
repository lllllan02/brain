---
parent: agent-context
title: "上下文裁剪与筛选"
aliases: ["Context Truncation", "Context Trimming", "Context Filtering", "上下文裁剪", "上下文筛选"]
category: "Agent"
tags: ["上下文管理"]
created_at: "2026-10-09"
updated_at: "2026-10-11T16:30:26+08:00"
---

**上下文裁剪与筛选通过选择保留哪些原文来缩减输入。** 裁剪通常按时间、数量取舍，如滑动窗口只保留近期交互；筛选侧重任务相关性，两者可以组合。

![[assets/context-selection.png|同一段历史经过裁剪与筛选后的对照]]

裁剪要保护目标、约束和关键证据，并保持工具请求与结果配对。[[langchain-message-trimming-summary|LangChain 的消息裁剪]]还提醒我们区分：只过滤本轮输入，还是删除保存的状态。

若主要占用来自工具结果，可以像 [[anthropic-context-editing-summary|Claude Context editing]] 一样：保留调用，用占位文本替换旧结果，保留近期结果和指定的重要结果。

[[complexity-trap-summary|The Complexity Trap 的实验]]表明，旧结果屏蔽值得作为简单基线，但仍需检查任务成功率与总成本，不能只看 Token 降幅。触发与保留量交给[[context-budget|预算]]控制；有用的旧信息放不下时，再引入[[context-compaction|摘要压缩]]。
