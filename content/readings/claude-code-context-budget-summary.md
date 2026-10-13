---
title: "Claude Code：上下文预算与压缩阈值"
parent: context-budget
category: "Agent"
tags: ["上下文管理"]
created_at: "2026-10-11T18:46:39+08:00"
updated_at: "2026-10-13T12:48:15+08:00"
source:
  - "https://code.claude.com/docs/en/model-config#default-auto-compact-thresholds"
  - "https://code.claude.com/docs/en/env-vars"
---

**「Claude Code 的触发点随模型和配置变化；知道窗口与阈值，不代表能把剩余空间拆成固定的输出预留和安全余量。」**

本文依据 2026-10-11 核对的官方文档，未运行验证。比例计算沿用[[context-budget|上下文预算的计数口径]]。

选用官方文档中「原生 1M 窗口的模型」这一场景，如 Opus 4.7 及以后；不套用到所有模型、云会话或自定义网关。

## 怎样计算预算？

| 项目 | 可确认的值与口径 |
| --- | --- |
| 窗口 | 此场景为 1,000,000 Token |
| 当前输入 | 会话中实际送入模型的上下文；大小随会话变化，包含指令、消息、文件和工具内容等 |
| 自动压缩 | 官方给出约 967,000 Token，即约 **96.7% 的 1M 窗口** |
| 输出上限 | `CLAUDE_CODE_MAX_OUTPUT_TOKENS` 可设置；默认值和封顶值随模型变化 |
| 输出预留、安全余量 | 本次查阅的官方文档没有将约 33,000 的差额完整拆成两个独立固定值；不能推定为某个固定输出预算加某个安全预算 |
| 压缩后 | 未给出固定的窗口占用率或前后比例，须按压缩后实际输入计数 |

[模型配置文档](https://code.claude.com/docs/en/model-config#default-auto-compact-thresholds)列出了上述适用范围；[环境变量说明](https://code.claude.com/docs/en/env-vars)说明提高输出上限会缩小压缩前的有效空间。因此 **967K 是该默认场景的近似触发点，不是任意输出设置下都成立的常量**。

用户还可设置自动压缩窗口。`CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` 的百分比按文档以自动压缩窗口为基准，不能无条件当作原始模型窗口百分比。[[claude-compaction-summary|Claude API 的 150,000 Token 阈值]]是另一项接口策略，不代表 Claude Code。

## 压缩后剩多少？

这些公开参数**「没有规定压缩后必须降到窗口的某个比例」**。需要对重组后完整输入重新计数，不能用摘要长度代替整个上下文的大小。
