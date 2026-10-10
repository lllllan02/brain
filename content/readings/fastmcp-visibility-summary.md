---
title: "FastMCP：工具可见性与会话范围"
parent: mcp
category: "Agent"
tags: ["MCP", "工具调用"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
---

**FastMCP 在服务端控制组件是否可见、可调用，并区分全局规则与单个会话的规则。** 这与 Host 是否把已发现的工具交给模型，是不同层的选择。

来源：[Component Visibility](https://gofastmcp.com/servers/visibility)、[Tools 的可见性说明](https://gofastmcp.com/servers/tools#component-visibility)，按 2026-10-10 文档总结，未运行示例。

## 控制什么

服务端可以按名称或标签启用、禁用工具，也可用 `only=True` 只启用指定集合。禁用工具不出现在工具列表中，也不能被调用；工具实现不必因此删除。[启用与禁用](https://gofastmcp.com/servers/tools#component-visibility)

全局规则影响所有连接的客户端；会话规则只改变当前会话。`ctx.enable_components()`、`ctx.disable_components()` 可以逐步调整集合，`ctx.reset_visibility()` 恢复全局默认。文档说明会话规则可以覆盖全局规则，因此全局禁用不能直接理解为不可覆盖的权限禁令。[会话可见性](https://gofastmcp.com/servers/visibility#per-session-visibility)

## 怎样理解它的边界

可以借鉴这种范围划分：公共工具作为默认集合，任务需要时再在当前会话开放其他工具，避免一次调整影响所有客户端。

应用时仍需判断谁有权改变集合、谁有权访问具体数据。这里的工程判断是：动态开放能力应有授权依据，不能让模型仅通过调用一个「解锁」工具就获得业务权限。
