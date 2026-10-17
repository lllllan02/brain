---
learning_status: pending
title: "工具执行调度"
parent: tool-calling
category: "Agent"
tags: ["Agent", "工具调用"]
created_at: "2026-10-10"
updated_at: "2026-10-17T15:47:36+08:00"
reading_suggestions:
  - pydantic-tool-execution-summary
  - llmcompiler-summary
  - agent-retry
---

顺序执行工具已经能完成任务；要减少独立调用之间的等待，就需要组织并发。

**工具执行调度（Tool Scheduling）是组织工具调用并发执行的机制：决定哪些调用一起执行，哪些调用需要等待。**

## 哪些调用可以并发？

- 依赖已满足：没有前置调用，或前置已成功完成。
- 资源无冲突：与运行中的调用没有读写或共享状态冲突。

满足这两点后，还需有空余执行名额；并发上限按执行环境和下游服务的承载能力设置。

## 怎样组织并发执行？

- 分批调度：整批结束后再推进，便于通过[[gemini-tool-scheduler-summary|批次屏障]]或[[pydantic-tool-execution-summary|工具级屏障]]控制阶段边界。
- 按就绪条件调度：任一调用完成后重新检查并补位，减少无关等待，需要持续维护运行状态。

![[assets/tool-scheduling-dispatch.png|分批调度与按就绪条件调度的运行对比]]

## 调度器怎样实现？

### 接收调用与依赖

固定流程或模型提供[[llmcompiler-summary|调用列表]]，每条包含 `ID`、`Tool`、`Args`、`Deps`。例如 C 声明 `Deps=[A]`，参数用 `ResultRef(A)` 引用 A 的结果。程序校验依赖和引用；无法确认独立的调用保留串行顺序。

### 根据参数判断资源冲突

开发者在[[tool-registry|工具注册表]]登记两个回调：

- `Execute(args)`：执行工具，返回结果或错误。
- `Resources(args)`：按实际参数生成规范化的资源键与读写模式。

调度器据此比较占用：同资源读读可并发，读写、写写需互斥。规则缺失或影响无法完整识别时先独占；业务先后另用依赖表达。

![[assets/tool-scheduling-resource-check.png|根据实际参数生成资源声明，再与当前占用比较]]

### 筛选、派发与处理完成

一个调度循环维护 `pending`（待执行）、`running`（运行及占用）、`results`（按 ID 保存结果），执行协程通过 `done` 通道回报完成。

1. 调度器筛选调用：前置成功后填参并校验权限；前置失败则阻断后继。
2. 调度器尝试派发：检查冲突和空余名额，通过后先登记占用，再启动执行；暂不可用就尝试其他调用。
3. 调度器处理完成：确认执行结束后保存结果、释放占用，再继续派发。

检查、占用和登记由同一循环完成。两种[[assets/tool-scheduling-pseudocode.go|调度循环]]只改变等待方式：分批收齐本批事件再派发，就绪收到一个事件就尝试补位。附件是未编译运行的 Go 风格伪代码。

结果按 ID [[langgraph-tool-execution-summary|回传给模型]]，失败交由上层[[agent-retry|重试或重规划]]；超时或取消不能直接当成执行结束。[[cloudflare-code-mode-summary|Code Mode]]与[[openai-programmatic-tools-summary|托管程序]]也可表达上述控制流。
