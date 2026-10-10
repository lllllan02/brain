---
title: "FastMCP：工具可见性与会话范围"
parent: mcp
category: "Agent"
tags: ["MCP", "工具调用"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
source:
  - "[Component Visibility](https://gofastmcp.com/servers/visibility)"
  - "[Tools 的可见性说明](https://gofastmcp.com/servers/tools#component-visibility)"
---

**FastMCP 在服务端控制工具是否可见、可调用，并允许对单个会话调整工具集合。**

这发生在 MCP 服务端，与 Host 是否将已发现的工具提供给模型，是不同层的选择。禁用工具会同时让它从列表消失并拒绝调用，而不必删除实现。

## 全局与会话怎样配合

全局规则按名称或标签启停组件，影响所有客户端；会话中的 `ctx.enable_components()`、`ctx.disable_components()` 只改变当前会话，`ctx.reset_visibility()` 恢复全局默认。

规则先应用全局配置，再应用会话覆盖，因此全局禁用不是不可覆盖的权限禁令。例如可让公共工具默认可用，再按会话需求开放特定工具，而不影响其他客户端。

可见性决定能力是否可用，业务授权仍需判断谁有权调整集合、谁能访问具体数据。以上依据 2026-10-10 官方文档，未运行示例。
