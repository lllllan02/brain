---
learning_status: pending
title: "MCP Streamable HTTP 服务端"
parent: mcp
category: "Agent"
tags: ["MCP", "工具调用", "协议"]
created_at: "2026-10-11T01:16:08+08:00"
updated_at: "2026-10-16T20:46:14+08:00"
reading_suggestions:
  - mcp-server
  - mcp-http-client
  - tool-permissions
---

**Streamable HTTP Server 独立监听 HTTP 地址，将 MCP 请求交给注册的工具处理。** 与[[mcp-server|stdio Server]]使用相同的订单查询逻辑，差别在于通信入口。

固定官方 Go SDK `v1.7.0`，要求 Go 1.25.0 或更新版本；代码尚未本地运行。接口依据[官方 HTTP 实现](https://github.com/modelcontextprotocol/go-sdk/blob/v1.7.0/mcp/streamable.go)。

## 提供 HTTP 入口

在独立目录保存为 `main.go`：

```go
package main

import (
	"context"
	"fmt"
	"log"
	"net/http"

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
	handler := mcp.NewStreamableHTTPHandler(
		func(r *http.Request) *mcp.Server { return server }, nil)
	mux := http.NewServeMux()
	mux.Handle("/mcp", handler)
	log.Fatal(http.ListenAndServe("127.0.0.1:8080", mux))
}
```

`NewStreamableHTTPHandler` 将 MCP Server 包装成 HTTP Handler，挂在 `/mcp`。每个工具不需要单独编写 HTTP 路由。

## 启动与调用

```bash
go mod init example.com/order-http-server
go get github.com/modelcontextprotocol/go-sdk@v1.7.0
go run .
```

保持进程运行，由[[mcp-http-client|HTTP Client]]连接 `http://127.0.0.1:8080/mcp`。预期查询 `A001` 返回「已发货」，不存在的编号返回错误。

本例仅监听本机，未实现接入认证。提供远程访问时需配置 HTTPS 与授权；接真实数据还需按[[tool-permissions|业务权限]]检查订单归属。

## 同一个服务处理多个用户时，哪些状态不能混用？

联调常用一个客户端和固定凭据；上线后如果把当前用户、临时对象或工具结果放进全局变量，后一个请求可能读到前一个用户的数据。连接或会话标识也不能自行替代认证身份。

请求进入时由可信认证结果确定租户与用户，访问对象时再次检查归属，业务状态使用显式且受控的标识关联。长任务转入后台后也要携带明确的业务身份与授权范围，同时考虑执行时权限是否已变化。

服务容量要覆盖慢调用与大结果：限制并发、响应大小和总时限，避免单个工具拖住整个服务。错误日志与排障记录需要可关联，但不应无差别记录凭据及敏感参数。
