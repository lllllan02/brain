---
learning_status: pending
title: "MCP Streamable HTTP 客户端"
parent: mcp
category: "Agent"
tags: ["MCP", "工具调用", "协议"]
created_at: "2026-10-11T01:16:08+08:00"
updated_at: "2026-10-16T20:46:14+08:00"
reading_suggestions:
  - mcp-client
  - mcp-http-server
  - mcp-flow
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

## HTTP 连接断开后，怎样避免把恢复连接变成重复业务？

客户端在等结果时断线，可能只是传输中断，服务端仍在执行。恢复通信与重新发起工具调用是不同决策，不能看到连接错误就统一重发所有请求。

先保留调用与业务操作的关联，按目标服务支持的状态查询或恢复机制接续。若需要重新执行，依据工具的幂等约定决定；不能把传输层请求编号当成天然的业务去重键。客户端还要区分用户取消、总期限耗尽和暂时断网，以免后台任务无限重连。

联调时应在“服务已接受但客户端未收到结果”处断开连接，检查任务是否重复、状态是否能找回、用户是否得到准确说明。正常响应的接口测试覆盖不了这个窗口。
