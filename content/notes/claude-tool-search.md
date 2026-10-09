---
title: "Claude 的 Tool Search 与延迟加载"
aliases: ["ToolSearch", "Claude Tool Search"]
category: "Agent"
tags: ["按需加载", "工具调用", "Claude"]
created_at: "2026-10-09"
updated_at: "2026-10-09"
---

**Claude Tool Search 通过搜索工具目录实现[[tool-loading|工具按需加载]]。** API 的协议行为与 Claude Code 的产品策略有所区别，以下依据 2026-10-09 的官方文档。

## Claude API 的机制

1. 应用提交工具定义，给延迟工具设置 `defer_loading: true`，同时提供非延迟的搜索工具。
2. 模型起初只获得搜索工具及非延迟工具的完整定义，根据任务发起搜索。
3. API 搜索工具目录，返回 `tool_reference`，并将引用展开为完整定义加入模型上下文。
4. 模型发起正常的[[tool-calling|工具调用]]，自定义工具仍由应用执行并回传结果。

`defer_loading` 控制定义何时进入模型上下文；完整定义仍须在每次请求的 `tools` 中发送，服务端才能检索和展开。搜索覆盖名称、描述和参数信息，官方提供 Regex 与 BM25 两种搜索方式，不能据此断言使用 Embedding 或向量数据库。[API 官方说明](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool)

## Claude Code 的暴露策略

当前官方文档说明：启用 MCP Tool Search 时，启动阶段加载工具名称与 Server 说明，完整工具定义延迟加载。因此不能把 Claude Code 描述为“所有延迟工具名称都不可见”。

Server 配置中的 `alwaysLoad: true` 可让工具提前加载；是否启用搜索还受模型、服务提供方和配置支持影响。这些是 Claude Code 的策略，不是 MCP 的通用要求。[Claude Code 官方说明](https://code.claude.com/docs/en/mcp#scale-with-mcp-tool-search)

官方 API 已说明搜索类型，但上述资料不足以确定 Claude Code 在所有配置下选择哪种实现，也不能据此还原全部服务端细节。
