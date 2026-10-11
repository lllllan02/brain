---
title: "MCP Client 的最小实现（Streamable HTTP）"
parent: mcp
category: "Agent"
tags: ["MCP", "工具调用", "协议"]
created_at: "2026-10-11T01:16:08+08:00"
updated_at: "2026-10-11T01:16:08+08:00"
---

**Streamable HTTP Client 通过 URL 连接已经运行的 MCP Server，发现工具并调用。** 它不启动 Server 子进程，其余调用逻辑与[[mcp-client|stdio Client]]相同。

固定官方 Go SDK `v1.7.0`，要求 Go 1.25.0 或更新版本；代码尚未本地运行。接口依据[官方 HTTP 实现](https://github.com/modelcontextprotocol/go-sdk/blob/v1.7.0/mcp/streamable.go)。

## 连接并调用

先启动[[mcp-http-server|HTTP Server]]，在独立 Client 目录保存 `main.go`：

```go
package main

import (
	"context"
	"fmt"
	"log"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

func run() error {
	ctx := context.Background()
	client := mcp.NewClient(
		&mcp.Implementation{Name: "order-client", Version: "1.0.0"}, nil)

	// 连接已经运行的 HTTP Server。
	session, err := client.Connect(ctx, &mcp.StreamableClientTransport{
		Endpoint: "http://127.0.0.1:8080/mcp",
	}, nil)
	if err != nil {
		return err
	}
	defer session.Close()

	// 获取工具定义。
	for tool, err := range session.Tools(ctx, nil) {
		if err != nil {
			return err
		}
		fmt.Println("发现工具：", tool.Name, tool.Description)
	}

	result, err := session.CallTool(ctx, &mcp.CallToolParams{
		Name:      "query_order",
		Arguments: map[string]any{"order_id": "A001"},
	})
	if err != nil {
		return err
	}
	for _, item := range result.Content {
		if text, ok := item.(*mcp.TextContent); ok {
			fmt.Println(text.Text)
		}
	}
	if result.IsError {
		return fmt.Errorf("工具执行失败")
	}
	return nil
}

func main() {
	if err := run(); err != nil {
		log.Fatal(err)
	}
}
```

`StreamableClientTransport` 指定服务地址，SDK 处理 HTTP 上的 MCP 消息；工具发现和调用仍使用 `Tools`、`CallTool`。

## 运行与适用范围

```bash
go mod init example.com/order-http-client
go get github.com/modelcontextprotocol/go-sdk@v1.7.0
go run .
```

在另一个终端执行，Server 需保持运行。预期先发现 `query_order`，随后输出包含「已发货」的结果；连接错误和工具执行失败分别处理。

示例连接本机未认证服务。访问受保护服务时需增加接入授权；模型的工具选择与结果回传由宿主负责，具体见[[mcp-flow|交互流程]]。
