---
title: "Anthropic：按规则清理旧工具结果"
aliases: ["Claude Context editing"]
parent: context-trimming
category: "Agent"
tags: ["Agent", "上下文管理", "工具调用"]
created_at: "2026-10-11T16:21:13+08:00"
updated_at: "2026-10-11T16:21:13+08:00"
source: "https://platform.claude.com/docs/en/build-with-claude/context-editing"
---

**Claude 的工具结果清理用占位文本替换旧结果，默认保留工具调用，让模型仍能看到行动线索。** 本文节选 Context editing 的工具结果清理及其配套机制，依据 2026-10-11 页面；不展开 thinking 清理和 SDK 摘要部分。

## 清理发生在哪里？

`clear_tool_uses_20250919` 达到阈值后，从最旧的工具结果开始清理。处理发生在服务端、模型接收输入之前；客户端仍维护完整历史，无需同步成清理后的版本。这适用于旧文件内容、搜索结果已不再需要的工具密集任务。

## 哪些规则决定取舍？

| 参数 | 作用 |
| --- | --- |
| `trigger` | 按输入 Token 或工具使用次数触发 |
| `keep` | 保留近期多少次工具交互 |
| `exclude_tools` | 指定哪些工具的调用与结果不清理 |
| `clear_tool_inputs` | 是否连调用参数一起清理，默认关闭 |
| `clear_at_least` | 要求一次至少清理指定 Token 数，达不到则不执行 |

工具结果清理会使受影响的提示缓存前缀失效，因此要权衡节省量与缓存重建成本。Token counting 可预览处理后的占用，响应中的 `applied_edits` 可查看实际清理量。

配合 memory tool 时，可在清理前保存重要信息，后续按需读取。由此可见，清理规则还需要信息保护和回查安排，不能仅凭「较旧」判断无用。

原文将此功能标为 beta，使用 `context-management-2025-06-27` 请求头；接入前核对当前支持情况。重点阅读 [Tool result clearing](https://platform.claude.com/docs/en/build-with-claude/context-editing#tool-result-clearing) 及配置、缓存、Token counting、memory tool 小节。本文未调用 API 验证。
