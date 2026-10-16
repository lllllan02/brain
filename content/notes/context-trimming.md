---
learning_status: pending
parent: agent-context
title: "上下文裁剪与筛选"
aliases: ["Context Truncation", "Context Trimming", "Context Filtering", "上下文裁剪", "上下文筛选"]
category: "Agent"
tags: ["上下文管理"]
created_at: "2026-10-09"
updated_at: "2026-10-16T20:47:46+08:00"
reading_suggestions:
  - context-budget
  - langchain-message-trimming-summary
  - anthropic-context-editing-summary
  - context-compaction
---

**上下文裁剪与筛选通过选择保留哪些原文来缩减输入。** 裁剪通常按时间、数量取舍，如滑动窗口只保留近期交互；筛选侧重任务相关性，两者可以组合。

![[assets/context-selection.png|同一段历史经过裁剪与筛选后的对照]]

裁剪要保护目标、约束和关键证据，并保持工具请求与结果配对。[[langchain-message-trimming-summary|LangChain 的消息裁剪]]还提醒我们区分：只过滤本轮输入，还是删除保存的状态。

若主要占用来自工具结果，可以像 [[anthropic-context-editing-summary|Claude Context editing]] 一样：保留调用，用占位文本替换旧结果，保留近期结果和指定的重要结果。

[[complexity-trap-summary|The Complexity Trap 的实验]]表明，旧结果屏蔽值得作为简单基线，但仍需检查任务成功率与总成本，不能只看 Token 降幅。触发与保留量交给[[context-budget|预算]]控制；有用的旧信息放不下时，再引入[[context-compaction|摘要压缩]]。

## 按长度删除最旧消息，会丢掉什么？

用户开头说“只能修改测试目录”，中间积累了大量日志。简单保留最近若干轮，会删掉这个仍有效的限制；删除工具调用而保留对应结果，还可能破坏消息配对。

裁剪前先区分当前约束、关键证据、可重取大结果和已失效尝试。稳定约束进入明确维护的任务状态，证据保留定位信息，重复结果优先去重；工具交互按完整单元处理。被裁内容若未来可能需要，应仍可按引用找回。

验证裁剪策略时，设置必须依赖早期约束才能正确完成的任务，并检查后续动作是否仍遵守。只测请求能否成功发送，会把信息损失隐藏起来。
