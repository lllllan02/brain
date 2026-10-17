---
learning_status: organized
parent: agent-context
title: "上下文裁剪与筛选"
aliases: ["Context Truncation", "Context Trimming", "Context Filtering", "上下文裁剪", "上下文筛选"]
category: "Agent"
tags: ["上下文管理"]
created_at: "2026-10-09"
updated_at: "2026-10-17T20:23:32+08:00"
reading_suggestions:
  - context-budget
  - langchain-message-trimming-summary
  - anthropic-context-editing-summary
  - context-compaction
learning_status_changed_at: "2026-10-17T20:25:55.430+08:00"
---

历史消息和工具结果不断增长时，可以通过选择保留哪些原文，缩减本轮输入。

**上下文裁剪（Context Trimming）是按长度或时间范围删减输入的操作。** 常见做法是先保留固定指令，再从最新交互向前取，达到[[context-budget|Token 预算]]或轮数上限就停止，较早的交互不再放入。

**上下文筛选（Context Filtering）是按当前任务的相关性选择输入的操作。** 可以用资料类型、关键词等规则匹配，也可以让模型判断哪些内容仍有用，再由程序选入原文。相关的旧证据可以留下，近期的无关内容也可以排除。

![[assets/context-selection.png|同一组历史：裁剪保留最近三轮，筛选保留学习相关内容]]

两者可以组合，但都可能误删信息：有效目标、约束与关键证据应优先保留，工具请求与结果须成对处理。[[langchain-message-trimming-summary|消息裁剪与状态删除]]还需区分：本轮不选入，不等于删除[[history-storage|保存的历史]]。有用的旧信息仍放不下时，可用[[context-compaction|摘要压缩]]保留要点。

工具结果占用较大时，可用[[anthropic-context-editing-summary|占位文本替换旧结果]]，保留调用线索、近期结果和重要结果。[[complexity-trap-summary|旧结果屏蔽的实验]]提示，评估还要检查早期约束是否仍被遵守、任务成功率与总成本，不能只看 Token 降幅。
