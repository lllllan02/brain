---
learning_status: organized
parent: agent
title: "最小 Agent Loop"
aliases: ["Agent Loop", "Agent 循环"]
category: "Agent"
tags: ["Agent", "反馈循环", "工具调用"]
created_at: "2026-10-09"
updated_at: "2026-10-17T20:58:21+08:00"
reading_suggestions:
  - tool-calling
learning_status_changed_at: "2026-10-17T21:00:22.131+08:00"
---

**Agent Loop 是让模型反复决策、程序执行工具，并将结果交回模型的反馈循环。** 它让 Agent 能根据执行结果决定下一步，逐步推进需要多次操作的任务。

最小流程是：把用户问题和工具说明传给模型；模型返回[[tool-calling|工具调用请求]]时，程序执行工具，把调用与结果加入消息历史，再请求模型；模型返回最终回答时，结束循环。消息历史保留了此前做过什么、得到什么，供下一轮决策使用。

![[assets/agent-loop.png|最小 Agent Loop：工具结果进入消息历史，再交给模型决策]]

下面用 Go 风格伪代码表达这个流程，不依赖具体 SDK，不能直接运行。假设模型正常响应时只返回工具调用或最终回答；`tools` 同时提供工具说明和执行入口。

```go
func AgentLoop(question string, maxTurns int) (string, error) {
    messages := []Message{UserMessage(question)}
    for turn := 0; turn < maxTurns; turn++ {
        reply, err := CallModel(messages, tools.Specs())
        if err != nil {
            return "", err
        }
        messages = append(messages, reply)
        if len(reply.ToolCalls) == 0 {
            return reply.Text, nil
        }
        for _, call := range reply.ToolCalls {
            result, err := tools.Execute(call.Name, call.Args)
            messages = append(messages, ToolResult(call.ID, result, err))
        }
    }
    return "", Error("达到轮数上限，任务可能尚未完成")
}
```

模型提出工具名称和参数，程序负责执行；`call.ID` 将结果或错误对应到原请求。`maxTurns` 限制模型调用次数，达到上限表示中止；返回回答也不保证任务成功，仍需核对实际结果。
