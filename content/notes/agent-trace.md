---
learning_status: organized
parent: agent
title: "Agent Trace（执行追踪）"
aliases: ["Agent Trace 要记录什么", "Agent Tracing"]
category: "Agent"
updated_at: "2026-10-17T23:29:15+08:00"
tags: ["Agent", "Trace", "可观测性", "错例回流", "数据脱敏"]
reading_suggestions:
  - trace-and-span
  - eino-langfuse-tracing
  - agent-evaluation
learning_status_changed_at: "2026-10-18T00:31:14.730+08:00"
---

Agent Trace 按一次任务记录模型、工具和业务步骤，供排障与回归使用；结构沿用 [[trace-and-span|Trace 与 Span]]。

下面以 Eino 接 Langfuse 为例，按「接入 → 关联 → 采集 → 验收 → 排障」组织。代码节选来自 `labs/agent-trace/` 的 `be79b00`，依赖 Eino v0.9.14、Langfuse 回调 v2.0.2；省略了部分逻辑，不能独立运行，本次未重跑实验。

## 接入与收尾

[[eino-langfuse-tracing|Eino 的 Langfuse 回调]]负责模型、工具与 Agent 的自动埋点，应用补根运行和业务步骤：

1. [[assets/agent-trace-root.go|创建根运行并注册回调]]：入口初始化遥测后传入 `Engine.Telemetry`；`Engine.Run` 调用 `StartTrace`，把返回的 Context 传给 Runner，通过 `adk.WithCallbacks(handler)` 注册。全局与运行级注册选一种，避免重复记录。
2. [[assets/agent-trace-business.go|补充业务 Span]]：在上下文加工、规则判定和结果验收处调用 `Step`，用返回的子 Context 继续调用。`Step`、`End` 是实验封装；失败时写错误与状态，仅 `span.End()` 不会自动记录错误。
3. 完成收尾：消费流式事件并关闭消息流，再写最终输出和 `stop_reason`、结束根 Span。取消时停止业务执行，仍保留收尾机会；进程退出用独立、限时的 Context 执行 Flush／Shutdown。强制终止仍可能丢失尾部记录。

## 关联并行、重试与恢复

- [[assets/agent-trace-parallel.go|并行分支共用父 Context]]：每支创建自己的子 Span，再传自己的子 Context，汇合后继续；不要在共享变量里反复覆盖 Context，或用 `context.Background()` 断开关联。Eino ToolNode 已负责这层调度。
- 工具结果保留 `tool_call_id`：把模型提议、实际执行和返回值配对；工具名或时间接近不足以配对。父子关系表示操作包含关系，工具未必是提出调用的模型 Span 的子节点。
- 每次重试新增 Span：保留逻辑调用标识与递增 `attempt`，不要用最终成功覆盖失败历史。
- 跨入口保留任务标识：普通 HTTP 传播提取／注入 `traceparent`；此版回调的 `StartTrace` 会新建根，须显式关联原请求。长时间中断后可另起 Trace，保留 `task_id` 和检查点 ID；[[agent-checkpoint-recovery|检查点]]负责恢复执行状态。

## 采集内容

除时间、状态和调用标识外，保留用户输入、目标约束、最终回复与停止原因，模型／Prompt／代码版本、参数与用量，以及业务验收结果。内容证据在三个边界分别采集：

| 采集点 | 记录内容 |
| --- | --- |
| 工具执行后 | 实际参数、原始结果或错误 |
| 上下文加工后 | 加工前后内容、策略版本、来源调用 ID |
| 模型请求发出前 | 实际消息、工具定义、模型与参数 |

自动工具回调可能只看到加工后的返回值，原始结果要在工具内部补记。实验中的 `model.request` 补充客户端可见请求，不代表多调了一次模型，也不能取得服务端隐藏上下文。

在[[langfuse-tracing#采集能力的边界|导出副本上脱敏]]，覆盖输入输出、metadata 与错误等路径，保留真正执行的数据。大载荷独立存储，Trace 留引用、哈希与处理状态；区分脱敏、截断、未采集和保存失败。哈希不能还原内容，附件还需管理权限与保留期。

[[otel-trace-collection#采样的收益与代价|采样]]优先保留已知错误或慢请求，同时留正常基线；上游已经丢弃的 Span 无法补回，偏向失败的样本不能用于估算总体成功率。

## 验收采集

按三个边界核验，避免把「页面有数据」当作记录完整：

1. 本地断言：检查唯一根、ID 唯一、父节点存在且同 Trace、Span 已结束；核对模型调用数、工具提议与执行、重试历史。
2. 导出诊断：单独观察导出错误、队列丢弃、采样和 Flush 结果。本地文件存在不代表平台收到；丢失的 Trace 也无法自行报告丢失。
3. [[assets/agent-trace-verify.py|平台读回]]：按 Trace／Span ID 比较父关系、结束时间、根结果和评分，允许入库延迟，有界重试后仍缺项则失败。实验的 `make verify` 最多等待 120 秒，只核对已有结果，不重新调用模型。

采集完整性与业务正确性分别验收：工具成功返回后，还要查实际产物、账本或外部状态。

## 在 Langfuse 排障并回归

先按时间、版本、Trace ID、错误或低分筛选。实验使用的 Langfuse 4.56.0 列表会混排根与子 observation，统计任务时先设 `Is Root Observation=True`。Tree 看归属与节点输入输出，Timeline 看长等待和并行重叠；父子耗时不能相加。

内容错误沿「模型输入 → 调用参数 → 原始结果 → 加工结果 → 下一轮输入 → 最终答复」找首次偏离，再用局部对照验证原因。例如原始订单为 A、加工后变成 B，应先查上下文处理。根节点 Scores 的规则与评语要结合实际结果读，正确拒绝也可能是通过用例。

把确认的错例转成[[agent-evaluation#任务与验收|回归用例]]：固定输入、初始状态、工具数据与版本，补独立验收条件并关联来源 Trace。在同一数据集和评分规则上比较新旧版本，保留正常与边界样本；模型结果有随机性时重复运行。重执行写操作须使用隔离环境或模拟工具，不能直接向真实接口投喂旧调用。

已有[[assets/agent-trace-evidence.json|合成订单实验记录]]为 baseline 13/17、fixed 17/17，每场景各一次，差异来自应用故障注入与修复分支，只验证这组实验；不代表模型能力提升。日常另看任务通过率、延迟、用量与采集损失，当前实验尚未建立持续告警。
