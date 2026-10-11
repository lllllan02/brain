---
title: "MCP 的接入授权与权限边界"
parent: mcp
category: "Agent"
tags: ["MCP", "OAuth", "权限"]
created_at: "2026-10-11T10:06:16+08:00"
updated_at: "2026-10-11T10:06:16+08:00"
---

**「接入 Server、访问业务数据、批准一次操作」是不同的权限判断。** Client 接入常见有三种情形：

- 本地 stdio：宿主启动 Server 子进程，通常不走 HTTP 的 OAuth 流程；访问范围由进程权限和沙箱约束。
- 预先配置凭据：Client 按服务要求携带 API key 或 token，由应用从配置、环境变量或凭据存储中读取并注入请求。
- OAuth 用户授权：用户在浏览器登录并批准权限，Client 换取、保存和使用令牌；接入方式见[[mcp-oauth-client|最小 OAuth 示例]]。官方[授权规范](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization)面向 HTTP 传输。

Server 调用下游 API 是另一段授权关系，即使使用 stdio，也可能需要 API key 或用户授权；不能把发给 MCP Server 的令牌直接当作下游凭据。

凭据由应用管理，不放进提示词、工具参数或返回结果。配置和环境变量不自动构成隔离：模型若能调用读文件、Shell 等广泛工具，仍需通过[[sandbox-execution|工具权限与沙箱]]限制其读取凭据；日志也应避免泄露。

接入成功后，服务端及下游仍需按[[tool-permission-design|业务权限规则]]检查用户能操作哪些数据；宿主另行判断本次动作是否需要用户确认。工具可见不等于获准执行，[[fastmcp-visibility-summary|FastMCP 的可见性控制]]只是其中一层，协议版本适用范围仍待核对。
