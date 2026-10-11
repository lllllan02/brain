---
title: "普通工具调用的 Go 最小实现"
parent: tool-calling-flow
category: "Agent"
tags: ["工具调用", "Go", "API"]
created_at: "2026-10-11T10:18:25+08:00"
updated_at: "2026-10-11T10:27:06+08:00"
---

**模型返回工具名和参数，Go 程序执行本地函数，再把结果交回模型。** 本例用只读的假订单数据演示完整循环：声明 `query_order` → 模型提出调用 → 本地查询 → 回传状态 → 模型回答。

使用官方 OpenAI Go SDK 调用支持函数工具的 Chat Completions 兼容接口，示例采用非流式文本消息。接口字段对应[[tool-calling-chat-completions|原始请求与响应示例]]。

## 保存并运行

将下方代码保存为 `main.go`。使用 Go 1.25.0 或更新版本，安装固定版本的 SDK：

```bash
go mod init example.com/order-tool-demo
go get github.com/openai/openai-go/v3@v3.63.1
go run .
```

运行前配置 `OPENAI_API_KEY` 和 `MODEL`；接入兼容服务时，再设置 `OPENAI_BASE_URL` 为其 API 基础地址（通常以 `/v1/` 结尾，不含 `/chat/completions`）。SDK 读取凭据并处理 HTTP 通信。预期查询 A001 后打印包含「已发货」的回答，实际是否调用及回答措辞由模型决定。

`run` 组织模型调用循环，`executeLocal` 执行假订单查询。

```go
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/openai/openai-go/v3"
)

func executeLocal(name, arguments string) (string, error) {
	if name != "query_order" {
		return "", fmt.Errorf("未知工具")
	}
	var args struct {
		OrderID string `json:"order_id"`
	}
	if err := json.Unmarshal([]byte(arguments), &args); err != nil {
		return "", fmt.Errorf("参数不是有效 JSON")
	}
	orders := map[string]string{"A001": "已发货", "A002": "待付款"}
	status, ok := orders[args.OrderID]
	if !ok {
		return "", fmt.Errorf("订单不存在")
	}
	data, err := json.Marshal(map[string]string{"status": status})
	return string(data), err
}

func run() error {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()
	// SDK 从 OPENAI_API_KEY、OPENAI_BASE_URL 读取配置。
	llm := openai.NewClient()

	// 替换点：工具定义和执行入口。MCP 版本只替换这一段。
	toolsForModel := []openai.ChatCompletionToolUnionParam{
		openai.ChatCompletionFunctionTool(openai.FunctionDefinitionParam{
			Name:        "query_order",
			Description: openai.String("根据订单编号查询订单状态，只读操作"),
			Parameters: openai.FunctionParameters{
				"type": "object",
				"properties": map[string]any{
					"order_id": map[string]string{"type": "string"},
				},
				"required":             []string{"order_id"},
				"additionalProperties": false,
			},
		}),
	}
	execute := executeLocal

	messages := []openai.ChatCompletionMessageParamUnion{
		openai.UserMessage("查询订单 A001 的状态"),
	}
	for round := 0; round < 5; round++ {
		response, err := llm.Chat.Completions.New(ctx, openai.ChatCompletionNewParams{
			Model: os.Getenv("MODEL"), Messages: messages, Tools: toolsForModel,
		})
		if err != nil {
			return err
		}
		if len(response.Choices) == 0 {
			return fmt.Errorf("模型未返回消息")
		}
		assistant := response.Choices[0].Message
		messages = append(messages, assistant.ToParam())
		if len(assistant.ToolCalls) == 0 {
			fmt.Println(assistant.Content)
			return nil
		}
		for _, call := range assistant.ToolCalls {
			result, err := execute(call.Function.Name, call.Function.Arguments)
			if err != nil {
				result = "工具执行失败：" + err.Error()
			}
			messages = append(messages, openai.ToolMessage(result, call.ID))
		}
		// 下一轮将工具结果交回模型，让模型回答或继续调用。
	}
	return fmt.Errorf("超过示例允许的模型调用轮数")
}

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
```

订单数据是本地假数据，不包含真实业务鉴权；实际接入需在执行前检查业务权限。示例限制总时长和轮数，未实现流式、多模态或厂商特有消息字段。

## 对照 MCP

[[mcp-tool-calling-go|MCP 工具调用的 Go 最小实现]]复用这份代码，只替换工具定义来源和执行入口。模型 SDK 调用、循环与结果关联保持相同。

接口依据：[OpenAI Go SDK](https://github.com/openai/openai-go/tree/v3.63.1)、[官方 Function calling](https://developers.openai.com/api/docs/guides/function-calling)。验证状态：使用 Go 1.25.6 与 OpenAI Go SDK v3.63.1 编译通过，未调用真实模型。
