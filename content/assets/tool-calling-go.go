// Go 工具调用示例：模型提出调用，程序查询本地假订单，再把结果交回模型。
// 运行：将本文件放入独立目录（可命名为 main.go），使用 Go 1.25.0 或更新版本。
//   go mod init example.com/order-tool-demo
//   go get github.com/openai/openai-go/v3@v3.63.1
//   go run .
// 环境变量：OPENAI_API_KEY、MODEL；兼容服务可另设 OPENAI_BASE_URL，
// 基础地址通常以 /v1/ 结尾，不包含 /chat/completions。
// 本例仅演示非流式文本调用；订单为假数据，实际业务需在执行前检查权限。
// 原示例已用 Go 1.25.6、SDK v3.63.1 编译通过，未调用真实模型。
// 依据：https://github.com/openai/openai-go/tree/v3.63.1
//       https://developers.openai.com/api/docs/guides/function-calling

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/openai/openai-go/v3"
)

// executeLocal 是程序真正执行的工具；模型只提供名称和 JSON 参数。
func executeLocal(name, arguments string) (string, error) {
	if name != "query_order" {
		return "", fmt.Errorf("未知工具")
	}
	// 先校验工具名，再解析参数；不直接执行模型生成的代码。
	var args struct {
		OrderID string `json:"order_id"`
	}
	if err := json.Unmarshal([]byte(arguments), &args); err != nil {
		return "", fmt.Errorf("参数不是有效 JSON")
	}
	// 用本地数据模拟只读查询，查询结果序列化后交给模型。
	orders := map[string]string{"A001": "已发货", "A002": "待付款"}
	status, ok := orders[args.OrderID]
	if !ok {
		return "", fmt.Errorf("订单不存在")
	}
	data, err := json.Marshal(map[string]string{"status": status})
	return string(data), err
}

func run() error {
	// 同时限制总时长与模型调用轮数，避免循环无限继续。
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()
	// SDK 从 OPENAI_API_KEY、OPENAI_BASE_URL 读取配置。
	llm := openai.NewClient()

	// 替换点：工具定义和执行入口。MCP 版本只替换这一段。
	// JSON Schema 告诉模型工具用途、参数类型与必填字段，不执行查询。
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
		// 保留包含 tool_calls 的原始助手消息，让后续结果能关联到对应调用。
		messages = append(messages, assistant.ToParam())
		// 没有工具调用时输出模型回答并结束；是否调用由模型决定。
		if len(assistant.ToolCalls) == 0 {
			fmt.Println(assistant.Content)
			return nil
		}
		// 一条消息可能请求多个工具，逐一执行并回传，失败也作为结果反馈。
		for _, call := range assistant.ToolCalls {
			result, err := execute(call.Function.Name, call.Function.Arguments)
			if err != nil {
				result = "工具执行失败：" + err.Error()
			}
			// call.ID 对应 tool_call_id，不能用工具名称替代。
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
