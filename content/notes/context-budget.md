---
learning_status: understood
parent: agent-context
title: "上下文预算"
aliases: ["Token Budgeting", "Context Budget", "Token 预算"]
category: "Agent"
tags: ["上下文管理"]
created_at: "2026-10-09"
updated_at: "2026-10-11T18:53:08+08:00"
reading_suggestions:
  - context-layering
  - context-trimming
  - context-compaction
  - pi-compaction-summary
---

模型的上下文窗口有限，对话消息和工具结果却会不断追加，不能让输入无限增长。因此，Agent 需要在窗口耗尽前，通过[[context-trimming|裁剪]]或[[context-compaction|压缩]]缩减上下文。

什么时候触发这些操作？**上下文预算（Token Budgeting）是根据窗口容量与后续调用所需空间，设定输入可用额度和缩减阈值的机制。** 程序通过 Token 计数或估算判断是否达到阈值，提前为模型回复和后续交互留出空间。

## 哪几个量不能混淆？

| 量 | 作用 |
| --- | --- |
| 窗口上限 | 模型与接口允许的总容量 |
| 输出预留 | 给本轮生成留空间，且不超过模型输出上限 |
| 压缩触发阈值 | 输入多大时开始缩减 |
| 近期保留预算 | 压缩时留下多少原始历史 |

[[pi-compaction-summary|Pi]]分别用预留量控制触发时机、用近期预算寻找保留边界。**「何时压缩」与「保留多少」是两个决定。**

## 怎样计算？

一种预算规划方法是从窗口中扣除输出预留和安全余量，得到输入目标上限。**只有两者独立时才分别相减；实际 Agent 也可能把它们合并为同一份预留。** 下图是假设分配：

![[assets/context-budget.png|上下文预算超限示例：当前输入 28k 超过压缩阈值 24k，加上输出预留 4k 和余量 2k，总需求 34k 超出窗口 32k]]

输入还要容纳指令、工具定义等必需内容，剩余空间才能分给历史与摘要；可按[[context-layering|职责分层]]分配，不必固定百分比。

**「计数对象是完整请求」**：指令、消息、工具定义与结果、多模态内容都不能漏算。[[claude-context-budget-summary|Claude 的计数说明]]还指出缓存内容仍占窗口；thinking、估算误差和超限行为应按具体接口核对。图中的分配是规划目标，不是所有 API 的拒绝条件。

## 实际可以怎么做？

参考这些实现，可以先采用下面的配置思路，再根据任务调整；这是实践建议，不是各 Agent 统一的默认规则。

1. **「先确定可用容量，再设触发线」**。读取实际模型和接口上限，为回复、工具结果增长及计数误差留空间。可参考[[opencode-context-budget-summary|OpenCode V2 的比例预留与最低预留量]]；采用[[codex-context-budget-summary|Codex 这类有效窗口]]时，明确已扣掉哪些余量，避免重复扣除。更换模型或输出设置后重新计算，[[claude-code-context-budget-summary|Claude Code 的触发点]]也有相应的适用条件。
2. **「单独配置压缩后的保留预算」**。像[[pi-compaction-summary|Pi]]一样，将触发阈值与近期保留量分开。压缩后的完整输入应低于触发线，并留出继续交互的空间；摘要多长、保留多少，需结合任务验证，不承诺固定压缩比例。
3. **「每轮复查，用实际结果调参」**。记录压缩前后完整输入、压缩频率，以及是否因信息丢失而重复调用工具。经常超限就提前触发或限制单次加载；经常丢失关键内容，就调整保留策略。工具返回后仍要重新计数，不能只在用户发消息时检查。
