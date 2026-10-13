---
title: "Pydantic AI：工具并发、失败反馈与取消"
parent: tool-scheduling
category: "Agent"
tags: ["Agent", "工具调用"]
created_at: "2026-10-10"
updated_at: "2026-10-13T12:48:15+08:00"
source:
  - "[Advanced Tool Features](https://pydantic.dev/docs/ai/tools-toolsets/tools-advanced/)"
  - "[工具执行源码 _tool_execution.py](https://github.com/pydantic/pydantic-ai/blob/main/pydantic_ai_slim/pydantic_ai/_tool_execution.py)"
---

**Pydantic AI 在运行时组织并发与顺序屏障，并把「要求模型修正」与「调用已经失败」分成不同反馈。**

## 同轮调用怎样执行

多次调用默认并发调度。标记 `sequential=True` 的工具成为屏障：之前的调用完成 → 该工具单独执行 → 后续调用开始。也可以通过运行级设置统一串行。

例如模型依次发出 A、B、W、C，只有 W 标为 `sequential=True`：A、B 可以重叠，二者完成后 W 单独运行，W 完成后 C 才开始。这是按模型发出顺序设置的屏障，不自动把 A、B 的结果填入 W 的参数。

因此，模型一次返回多个调用，**「并不意味着运行时必须全部同时启动」**。

## 屏障在源码中怎样实现

`_segment_by_barriers` 将连续的普通调用组成并行段，每个屏障工具独占一段。执行循环逐段创建异步任务，收完当前段的完成事件后才进入下一段。因此，段内可以逐个收到结果，后段仍需等待当前段全部结束。

这是顺序屏障的实现参考，没有在这段分段逻辑里自动识别文件读写冲突；不能把它等同于按任意资源和容量生成批次的规划器。依据 2026-10-12 查阅的 `main` 分支，定位以上函数及 `for segment in segments`；未运行源码。

## 失败之后让谁做什么

- 参数校验失败或 `ModelRetry`：把问题反馈给模型，要求它修正，受重试预算限制。
- `ToolFailed`：返回明确的失败结果，让模型决定下一步，不消耗上述修正预算。
- 其他异常：默认向外传播，可能终止运行。

这一区分避免把「换参数再试」和「程序原样重发」混为一谈。限制重复失败还需运行级预算：文档指出 `tool_calls_limit` 只计成功调用，约束模型反复尝试失败工具应使用 `request_limit`。调用次数预算与同时执行多少个工具也是两个不同指标。

## 超时与取消的边界

工具超时会产生重试提示，但内置工具超时设置不自动覆盖 MCP 等外部工具集。同步工具在线程中执行，取消异步等待不能强制停止该线程，已发生的副作用也不会撤销。再次调用前仍需判断重复执行是否安全。

依据 2026-10-12 官方文档，未运行示例。
