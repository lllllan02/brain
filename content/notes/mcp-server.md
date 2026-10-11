---
title: "MCP Server 的最小实现（stdio）"
parent: mcp
category: "Agent"
tags: ["MCP", "工具调用", "协议"]
created_at: "2026-10-11T01:07:45+08:00"
updated_at: "2026-10-11T01:16:08+08:00"
---

**stdio Server 将业务函数注册成工具，通过标准输入输出接收调用并返回结果。** 以下用内存订单查询展示实现，Server 本身不调用模型。

固定官方 Go SDK `v1.7.0`，要求 Go 1.25.0 或更新版本；代码尚未本地运行。[官方 SDK](https://github.com/modelcontextprotocol/go-sdk/tree/v1.7.0)

## 定义并启动工具

在 Server 目录保存为 `main.go`：

```go
package main

import (
	"context"
	"fmt"
	"log"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

type QueryInput struct {
	OrderID string `json:"order_id" jsonschema:"要查询的订单编号"`
}

type QueryOutput struct {
	Status string `json:"status"`
}

func queryOrder(ctx context.Context, req *mcp.CallToolRequest,
	input QueryInput) (*mcp.CallToolResult, QueryOutput, error) {
	orders := map[string]string{"A001": "已发货", "A002": "待付款"}
	status, ok := orders[input.OrderID]
	if !ok {
		return nil, QueryOutput{}, fmt.Errorf("订单不存在")
	}
	return nil, QueryOutput{Status: status}, nil
}

func main() {
	server := mcp.NewServer(
		&mcp.Implementation{Name: "order-server", Version: "1.0.0"}, nil)
	mcp.AddTool(server, &mcp.Tool{
		Name:        "query_order",
		Description: "根据订单编号查询订单状态，只读操作",
	}, queryOrder)
	if err := server.Run(context.Background(), &mcp.StdioTransport{}); err != nil {
		log.Fatal(err)
	}
}
```

`queryOrder` 实现业务，`AddTool` 注册工具，`Run` 接收消息；SDK 从 Go 类型推导参数结构并完成转换。

## 编译并接入

```bash
go mod init example.com/order-mcp
go get github.com/modelcontextprotocol/go-sdk@v1.7.0
go build -o order-mcp .
```

可以用[[mcp-client|stdio Client]]调用，也可以在采用 `mcpServers` 格式的宿主中配置，位置以宿主文档为准：

```json
{
  "mcpServers": {
    "orders": {
      "command": "/绝对路径/order-mcp"
    }
  }
}
```

宿主启动该进程，无需另开终端运行它。预期查询 `A001` 返回「已发货」，不存在的编号返回错误。

标准输出用于协议消息，日志应写标准错误。接真实数据库时，按[[tool-permission-design|权限规则]]从可信身份检查订单归属，不能只凭模型提供的订单号放行。
