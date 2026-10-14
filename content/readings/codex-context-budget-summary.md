---
title: "Codex：上下文预算与压缩阈值"
parent: context-budget
category: "Agent"
tags: ["上下文管理"]
created_at: "2026-10-11T18:46:39+08:00"
updated_at: "2026-10-13T12:48:15+08:00"
source:
  - "https://github.com/openai/codex/blob/main/codex-rs/models-manager/models.json"
  - "https://github.com/openai/codex/blob/main/codex-rs/protocol/src/openai_models.rs"
  - "https://learn.chatgpt.com/docs/config-file/config-reference"
  - "https://github.com/openai/codex/blob/main/codex-rs/core/src/session/context_window.rs"
  - "https://github.com/openai/codex/blob/main/codex-rs/core/src/compact.rs"
reading_suggestions:
  - context-budget
---

**「Codex 的原始窗口、有效窗口和自动压缩线是三个不同的数。解释百分比前，要先说明分母用的是哪一个。」**

本文依据 2026-10-11 核对的官方文档及公开源码，未固定源码提交或运行验证。比例计算沿用[[context-budget|上下文预算的计数口径]]。

取[公开模型目录](https://github.com/openai/codex/blob/main/codex-rs/models-manager/models.json)中 GPT-6.1-Sol 的基础 `context_window = 272,000` 为算例；不启用窗口扩展、额外阈值覆盖或 fallback 缓冲，按默认 `total` 范围计数。这里描述公开配置路径，不代表本次桌面会话的实时参数。

## 怎样计算预算？

| 项目 | 该配置下的值与口径 |
| --- | --- |
| 原始窗口 | 272,000 Token；目录中的 `max_context_window` 是允许扩展的上限，不能替代当前窗口 |
| 当前计数 | 活跃上下文的 Token 用量；不是整个会话历次调用的累计消耗 |
| 有效窗口 | 默认按原始窗口的 95%：258,400 Token |
| 余量 | 上述差额 13,600 是给系统、工具开销和模型输出的合并 headroom，不能再全部当成独立安全余量 |
| 自动压缩 | 基础阈值为原始窗口的 90%：244,800 Token；若配了更低值，采用更低值 |
| 输出预留 | 这段窗口计算未把 13,600 再拆为固定输出预留与安全余量；模型输出能力不等于这里的预留 |
| 压缩后 | 没有从这组参数推导出的固定占用比例，需对重建后的上下文重新计数 |

[窗口计算源码](https://github.com/openai/codex/blob/main/codex-rs/protocol/src/openai_models.rs)分别计算 95% 的有效窗口和 90% 的基础压缩线。因此 244,800 相对原始窗口是 **90%**，相对有效窗口却约为 **94.7%**；两个百分比描述的是同一位置。

[配置说明](https://learn.chatgpt.com/docs/config-file/config-reference)还允许只统计初始前缀之后的增长量（`body_after_prefix`）。[运行判断](https://github.com/openai/codex/blob/main/codex-rs/core/src/session/context_window.rs)另有 fallback 缓冲和轮末压缩条件，因此上述算例不能覆盖所有模式。

## 压缩后剩多少？

[本地摘要路径](https://github.com/openai/codex/blob/main/codex-rs/core/src/compact.rs)为保留的用户文本设置约 20,000 Token 预算，再加摘要和重建的初始上下文；这**「不是完整压缩结果的上限」**，也不能套用到所有服务端压缩路径。
