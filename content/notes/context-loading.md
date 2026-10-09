---
title: "上下文按需加载（Just-in-Time Context）"
aliases: ["Just-in-Time Context", "上下文外置", "外部存储与按需加载"]
category: "Agent"
tags: ["上下文管理", "按需加载"]
created_at: "2026-10-09"
updated_at: "2026-10-09"
---

**上下文按需加载（Just-in-Time Context）是把完整信息保存在模型窗口之外，只在任务需要时读取相应片段的机制。** 上下文先保留摘要、元数据或可访问的引用，模型通过工具获取更多细节。[按需获取上下文](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)

例如，一次检索返回大量历史记录，可以采用「完整结果存文件或数据库 → 返回摘要与引用 ID → 按 ID、分页或范围读取」的方式。这是实现示例，也适用于日志、任务记录和长文档。

引用必须能重新找到原文，工具也要支持限制返回范围；仅返回一个无法访问的路径，或者再次取回全部内容，都无法解决超长输入。每次加载后仍需检查[[context-budget|预算]]，并选择与任务有关的内容。

[[context-compaction|压缩]]改变内容的表示，按需加载改变内容进入上下文的时机与范围，两者可以配合使用。[[tool-loading|工具按需加载]]则把类似思路用于工具定义，与读取工具返回的数据是不同对象。
