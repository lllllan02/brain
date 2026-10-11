---
title: "MCP Client 的最小实现（stdio）"
parent: mcp
category: "Agent"
tags: ["MCP", "工具调用", "协议"]
created_at: "2026-10-11T01:11:26+08:00"
updated_at: "2026-10-11T01:16:08+08:00"
---

**stdio Client 启动 Server 子进程，通过标准输入输出发现工具、发起调用并读取结果。** 本例调用[[mcp-server|订单查询 Server]]。

固定官方 Go SDK `v1.7.0`，要求 Go 1.25.0 或更新版本；代码尚未本地运行。[官方 Client 示例](https://github.com/modelcontextprotocol/go-sdk/blob/v1.7.0/README.md#getting-started)

## 连接并调用

在独立的 Client 目录保存 `main.go`，替换 Server 可执行文件的绝对路径：

```go
package main

import (
	"context"
	"fmt"
	"log"
	"os/exec"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

func run() error {
	ctx := context.Background()
	client := mcp.NewClient(
		&mcp.Implementation{Name: "order-client", Version: "1.0.0"}, nil)

	// 启动 Server，通过标准输入输出连接。
	session, err := client.Connect(ctx, &mcp.CommandTransport{
		Command: exec.Command("/绝对路径/order-mcp"),
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

`Connect` 建立连接，`Tools` 获取定义，`CallTool` 调用，`Close` 关闭连接。本例输出文本结果，并区分调用错误与工具执行失败。

## 运行与模型接入

先编译 Server，再在 Client 目录执行：

```bash
go mod init example.com/order-client
go get github.com/modelcontextprotocol/go-sdk@v1.7.0
go run .
```

Client 自行启动 Server；预期先发现 `query_order`，随后输出包含「已发货」的结果。

本例直接指定工具名与参数。接入模型后由宿主组织：获取定义 → 适配到模型 API → 模型提出调用 → 检查权限并经 Client 执行 → 结果交回模型。具体关系见[[mcp-flow|交互流程]]。
