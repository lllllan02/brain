---
title: "MCP Client 的最小 OAuth 接入"
parent: mcp-permissions
category: "Agent"
tags: ["MCP", "OAuth", "授权"]
created_at: "2026-10-11T09:58:18+08:00"
updated_at: "2026-10-11T10:54:33+08:00"
---

桌面或命令行 Client 使用当前用户的权限访问远程 MCP Server 时，可以在[[mcp-http-client|HTTP Client]]上增加 OAuth 处理器：**「应用负责浏览器授权与回调，SDK 负责协议处理与令牌使用」**，后续工具调用方式不变。

## 授权怎样完成

![[assets/mcp-oauth-flow.png|MCP OAuth 接入时序图]]

这是[[oauth-code|授权码流程]]。授权服务器负责登录与发令牌，MCP Server 负责校验令牌和业务权限；两者可以由同一服务方提供。浏览器回传的是临时授权码，用户密码和令牌不需要进入模型上下文。

## 最小接线

以下使用官方 Go SDK `v1.7.0`，要求 Go 1.25.0 或更新版本。代码是接入片段，省略 imports 与回调监听器，尚未本地运行；`auth`、`mcp`、`oauthex` 均来自 `github.com/modelcontextprotocol/go-sdk`。

```go
handler, err := auth.NewAuthorizationCodeHandler(
    &auth.AuthorizationCodeHandlerConfig{
        PreregisteredClient: &oauthex.ClientCredentials{
            ClientID: "my-demo-client",
        },
        RedirectURL: "http://127.0.0.1:3142/callback",
        AuthorizationCodeFetcher: receiveAuthorization,
    },
)
if err != nil {
    return err
}

// client、ctx 沿用 HTTP Client 示例。
session, err := client.Connect(ctx, &mcp.StreamableClientTransport{
    Endpoint:     "https://orders.example.com/mcp",
    OAuthHandler: handler,
}, nil)
if err != nil {
    return err
}
defer session.Close()
// 此后仍使用 session.ListTools / session.CallTool。
```

`receiveAuthorization` 由应用实现，职责如下（伪代码）：

```text
启动本地回调监听器，再打开 SDK 提供的 args.URL
等待浏览器回调，支持超时、取消和授权失败
提取 code、state、iss，返回给 SDK 继续校验和换取令牌
结束后关闭监听器
```

运行前须向服务方登记 Client ID 与匹配的回调地址，本地应用通常注册为公开客户端，不内置共享 secret。目标服务必须已具备 OAuth 授权、发现与令牌校验能力；无鉴权的 HTTP Server 示例不能直接完成此流程。[官方完整 Client 示例](https://github.com/modelcontextprotocol/go-sdk/blob/v1.7.0/examples/auth/client/main.go)包含本地回调监听代码。

## 需要理解和处理什么

- PKCE 将兑换授权码的请求与发起授权的 Client 绑定；`state` 关联本次授权，`iss` 用于检查预期签发方。应用把真实回调参数交给 SDK，不自行伪造或跳过校验。
- `scope` 表达申请的权限，`resource` 指定目标 MCP 服务；取得令牌后，服务端仍需检查具体业务数据的访问权。[MCP 授权规范](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization)
- SDK 处理授权发现、换取令牌、请求头注入，并在服务方提供刷新令牌时处理续期。应用负责安全保存与恢复[[oauth-token|令牌]]，按用户和目标服务隔离；最小示例可先只保留在内存。持久化扩展点见 [SDK 配置与示例](https://pkg.go.dev/github.com/modelcontextprotocol/go-sdk@v1.7.0/auth)。
