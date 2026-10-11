---
title: "MCP 工具调用的 Go 最小实现"
parent: mcp-flow
category: "Agent"
tags: ["MCP", "工具调用", "Go"]
created_at: "2026-10-11T10:12:32+08:00"
updated_at: "2026-10-11T10:27:06+08:00"
---

**在普通工具调用程序中，将「本地声明工具、本地执行函数」替换为「从 MCP Server 发现工具、通过 Client 调用」。** 模型侧仍然使用相同的函数工具格式，不需要改成另一种模型调用协议。

## 在普通实现上替换两处

复制[[tool-calling-go|普通工具调用的 Go 最小实现]]的 `main.go`。MCP 使用官方 Go SDK `v1.7.0`，要求 Go 1.25.0 或更新版本；先按[[mcp-server|stdio 订单 Server]]编译出 `order-mcp`。

在 Client 目录安装依赖：

```bash
go get github.com/modelcontextprotocol/go-sdk@v1.7.0
```

给 `main.go` 的 imports 增加 `"os/exec"` 和 `"github.com/modelcontextprotocol/go-sdk/mcp"`。把 `run` 中标记为「替换点」的工具定义及 `execute := executeLocal`，替换为下面代码；`llm` 的创建与 `messages` 开始的模型调用循环原样保留。`executeLocal` 已不再使用，可删除。

```go
client := mcp.NewClient(&mcp.Implementation{
    Name: "order-host", Version: "1.0.0",
}, nil)
session, err := client.Connect(ctx, &mcp.CommandTransport{
    Command: exec.Command("/绝对路径/order-mcp"),
}, nil)
if err != nil { return err }
defer session.Close()

// 从 Server 发现定义，再转换为相同的模型工具格式。
toolsForModel := []openai.ChatCompletionToolUnionParam{}
for tool, err := range session.Tools(ctx, nil) {
    if err != nil { return err }
    if tool.Name != "query_order" { continue }
    schemaJSON, err := json.Marshal(tool.InputSchema)
    if err != nil { return err }
    var parameters openai.FunctionParameters
    if err := json.Unmarshal(schemaJSON, &parameters); err != nil { return err }
    toolsForModel = append(toolsForModel,
        openai.ChatCompletionFunctionTool(openai.FunctionDefinitionParam{
            Name: tool.Name,
            Description: openai.String(tool.Description),
            Parameters: parameters,
        }),
    )
}
if len(toolsForModel) == 0 { return fmt.Errorf("Server 未提供 query_order") }

// 同一个执行入口，内部改成向 Server 发送 tools/call。
execute := func(name, arguments string) (string, error) {
    if name != "query_order" {
        return "", fmt.Errorf("未知工具")
    }
    var args map[string]any
    if err := json.Unmarshal([]byte(arguments), &args); err != nil {
        return "", fmt.Errorf("参数不是有效 JSON")
    }
    if id, ok := args["order_id"].(string); !ok || id == "" {
        return "", fmt.Errorf("缺少有效订单编号")
    }
    result, err := session.CallTool(ctx, &mcp.CallToolParams{
        Name: name, Arguments: args,
    })
    if err != nil { return "", err }
    // 保留 isError 与结果内容，让模型能区分业务失败和成功。
    data, err := json.Marshal(map[string]any{
        "isError": result.IsError,
        "content": result.Content,
        "structuredContent": result.StructuredContent,
    })
    return string(data), err
}

```

替换 Server 的绝对路径，沿用普通实现的 SDK 依赖与模型环境变量，执行 `go run .`。Client 会启动 Server；模型要求查询 A001 后，业务逻辑在 Server 进程执行，结果再经原有循环交回模型。HTTP 接入只需按[[mcp-http-client|HTTP Client 示例]]替换 transport。

## 对照代码看区别

| 位置 | 普通工具调用 | MCP 接入 |
| --- | --- | --- |
| 工具定义 | 程序写出 JSON Schema | `session.Tools` 发现，`InputSchema` 映射到 `parameters` |
| 执行入口 | `executeLocal(name, arguments)` | `session.CallTool(ctx, params)` |
| 模型交互 | 提供 tools、接收 tool_calls、按 tool_call_id 回传 | 复用同一套代码 |

模型看到的仍是 `query_order`，不会自动变成 Server 名称。多个 Server 有同名工具时，Host 需通过[[tool-registry|注册表]]加前缀或映射，并在执行时还原目标名称。本例只接一个 Server、一个文本查询工具；复杂 Schema 和多模态结果需另行适配，权限检查仍由应用与服务端承担。

接口依据：[Go SDK Client 源码](https://github.com/modelcontextprotocol/go-sdk/blob/v1.7.0/mcp/client.go)、[官方 Client 示例](https://github.com/modelcontextprotocol/go-sdk/blob/v1.7.0/README.md#getting-started)、[模型函数工具格式](https://developers.openai.com/api/docs/guides/function-calling)。代码已对照 SDK 接口检查，尚未编译此 MCP 变体，也未完成与真实模型的联调。
