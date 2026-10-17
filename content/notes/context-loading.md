---
learning_status: reading
parent: agent-context
title: "上下文按需加载"
aliases: ["Just-in-Time Context", "上下文外置", "外部存储与按需加载"]
category: "Agent"
tags: ["上下文管理", "按需加载"]
created_at: "2026-10-09"
updated_at: "2026-10-17T20:30:23+08:00"
reading_suggestions:
  - agent-loading
  - context-compaction-storage
  - context-budget
  - deepagents-context-offloading-summary
learning_status_changed_at: "2026-10-17T20:26:27.955+08:00"
---

**上下文按需加载（Just-in-Time Context）是将任务资料保留在模型窗口外，需要时再读取相关部分的机制。** 长日志、文档和旧历史无须每轮完整带入，但要留下足以发现和读取它们的线索。

这里聚焦资料获取；Skill 指令、工具定义等对象的加载属于更广的 [[agent-loading|Agent 按需加载]]。

## 怎样取回需要的内容？

1. 程序将原文保存在文件或数据库中，窗口里保留路径或记录 ID。[[manus-context-engineering-summary|Manus 的可恢复思路]]要求省略内容时仍留下读取入口。
2. 模型依据用途说明、目录、预览或摘要判断要读什么。[[anthropic-context-engineering-summary|Anthropic 的动态检索思路]]利用这些线索逐步缩小范围，避免只凭含糊标题反复试读。
3. 已知位置就直接读取；位置不明时先搜索，再由工具按行号、章节或条件返回片段。[[deepagents-context-offloading-summary|Deep Agents]]用预览、文件路径和分段读取支持这一过程。

![[assets/context-loading-retrieval.png|日志排查示意：完整日志留在窗口外，按请求 ID 定位后，只将命中的原文片段读入下一轮上下文]]

[[context-compaction|压缩]]用摘要替代旧历史；按需加载让被省略的细节仍可回查，前提是[[context-compaction-storage|原始历史与读取入口已保存]]。大工具结果也可以直接外置，无须先经过压缩。

## 使用边界

核心目标、必要约束和资料入口应直接提供。已知必需且较小的材料可直接加载；长材料或暂不确定相关的内容再按需读取，记录已读范围以减少重复获取。分段结果应说明截断与后续位置。

路径必须可访问，需要原样回查时保存版本或快照。返回片段仍占用[[context-budget|上下文预算]]，搜索还可能遗漏信息、增加等待；应以能否找回证据并继续任务、总耗时与成本是否合算来判断效果。
