---
parent: agent
title: "最小 Agent Loop"
aliases: ["Agent Loop", "Agent 循环"]
category: "Agent"
tags: ["Agent", "反馈循环", "工具调用"]
created_at: "2026-10-09"
updated_at: "2026-10-11T11:08:32+08:00"
---

**最小 Agent Loop 是让模型决策、程序执行工具、结果回传模型的反馈循环。** 实现只需模型调用、工具执行、上下文保存和循环控制，可以放在同一段程序中。

1. 调用模型：传入用户问题、当前上下文和可用工具说明。
2. 判断输出：返回最终答案时结束；返回[[tool-calling|工具调用请求（Tool Call）]]时，由程序执行工具。
3. 更新上下文：将工具调用请求与执行结果加入消息历史（Messages），由[[agent-context|上下文管理]]组织下一轮输入，再调用模型。

再次调用模型时，不能只传最初的问题；必须带上之前的调用和结果，模型才能知道执行进展。还需设置最大迭代次数等终止条件，避免无限循环；触发限制不代表任务完成。

## 循环如何落到代码

![[assets/agent-loop.png|最小 Agent Loop：模型决策、工具执行与结果反馈]]

下面是 Go 风格伪代码，用抽象接口表达控制流程，不依赖具体 SDK，也不能直接运行。假设模型每轮正常返回「工具调用请求」或「最终答案」；`maxTurns` 限制模型调用轮数。

```go
func AgentLoop(question string, maxTurns int) (string, error) {
    messages := []Message{UserMessage(question)}
    tools := AvailableTools() // 工具说明与对应的执行函数

    for turn := 0; turn < maxTurns; turn++ {        // ① 检查轮数
        reply, err := Model.Call(messages, tools.Specs()) // ② 调用模型
        if err != nil {
            return "", err
        }
        messages = append(messages, reply)        // ③ 保存完整模型回复

        if len(reply.ToolCalls) == 0 {
            return reply.Text, nil                // 无工具调用：返回答案
        }

        for _, call := range reply.ToolCalls {
            result, err := tools.Execute(call.Name, call.Args) // ④ 执行
            messages = append(messages,           // ⑤ 回传结果或错误
                ToolResult(call.ID, result, err))
        }
        // 带着全部历史进入下一轮，让模型根据工具结果继续决策
    }
    SaveProgress(messages)
    return "", Error("达到轮数上限，任务可能尚未完成")
}
```

模型只提出工具名称和参数，实际执行由程序完成。每条工具结果通过 `call.ID` 对应原请求；先保存模型回复，再追加工具结果，下一轮才能读到完整的调用与反馈。工具执行失败也可以作为反馈，让模型决定修正参数、换用工具或说明限制。

这段示例只展示循环，省略了参数与权限检查、超时和重试等工程细节；达到轮数上限时保留进度并报告中断，不把中断当作成功。

循环之外的机制按实际问题选择，见 [[agent|Agent]]。
