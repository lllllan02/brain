---
learning_status: pending
parent: agent-trace
title: "Agent Trace 内容采集"
category: "Agent"
tags: ["Agent", "Trace", "数据脱敏", "采样"]
created_at: "2026-10-12T23:28:23+08:00"
updated_at: "2026-10-13T01:35:20+08:00"
reading_suggestions:
  - agent-trace-spans
  - otel-genai-tracing
  - langfuse-tracing
  - otel-trace-collection
---

**排查 Agent 决策需要区分工具原始结果、处理后的上下文，以及实际发出的模型请求；内容采集策略决定这些证据还能保留多少。** 仅有 token 数或一段摘要，可以分析成本，却通常不足以复核模型是否看到了关键事实。

## 在哪个时点取证？

假设查询订单返回了订单号与配送地址，Harness 压缩结果后再发给模型。采集点应分别位于工具返回后、上下文变换后、模型请求组装完成处。由程序记录来源调用 ID、变换版本与对应请求，不让模型事后猜测当时读过什么。

Eino 实验的 context/baseline 给出一个实际反例：`tool.raw_result` 中订单为 A，`context.prepare` 的输入仍为 A，输出却为 B，下一轮模型请求也包含 B。以下是该变换记录的字段摘录，省略金额、状态和调用 ID：

```json
{
  "input": {"raw": {"order_id": "A"}, "strategy": "identity-v1"},
  "output": {"order_id": "B"}
}
```

这段输入输出由 `labs/agent-trace/internal/lab/business.go` 的 `labTool.InvokableRun` 写入：原始结果生成后调用 `Step`，加工完成后调用 `End`，再把 `prepared` 返回给 Eino。具体插入位置见[[agent-trace-spans|业务步骤的 Span 创建]]。这是应用主动注入的上下文污染，不能归咎于模型；`identity-v1` 这个标签也不能证明实际执行了恒等变换。保留变换前后的内容，才能查出第一次偏离。自动工具回调只看到处理后返回的结果，因此实验在工具内部额外记录原始结果。

自动 generation 提供每轮模型消息。`internal/lab/model.go` 的 `boundedModel.Generate` 和 `Stream` 包装底层模型：先通过预算检查，再记录 `model.request` 中的消息与调用 options 里的工具定义，随后调用 `m.Base.Generate` 或 `m.Base.Stream`。记录的是这次转交给底层模型的数据。两者均只能覆盖客户端可见请求；服务端隐藏拼接的指令应标为不可见，不能声称已经记录完整服务端上下文。

在 Langfuse 中选中 `get_order` 下的 `context.prepare`，可直接比较这次变换的输入输出：

![[assets/agent-trace-langfuse-context.jpg]]

## 怎样选择采集方式？

[[otel-genai-tracing|OTel GenAI 约定]]默认不采集敏感内容，允许按需开启。以下是应用可以选择的方式，取舍取决于需要回答的问题：

| 方式 | 收益 | 代价与边界 |
| --- | --- | --- |
| 仅操作元数据、耗时和用量 | 载荷较小，适合总体运行观察 | 难以复核内容错误 |
| 脱敏后的输入输出 | 可以分析多数消息与参数问题 | 被删除的事实无法用于归因 |
| 大内容独立存储，Trace 留版本引用 | 将检索字段与大载荷分开管理 | 需管理访问、保留期与引用完整性 |

按 [[langfuse-tracing#采集能力的边界|发送前脱敏]] 的方式，先对导出副本执行处理，再送往观测系统，不意外修改真正发给模型的请求。脱敏、截断和未采集应分别标记；敏感内容不应通过异常堆栈或 metadata 旁路泄露。

## 大内容怎样保留，又不改变模型输入？

实验的 `Protector.Value` 先对观测副本脱敏；超过 8 KiB 的字符串写入本地 `payloads/<sha256>.txt`，Span 中返回引用、哈希、字节数、预览与处理状态。成功保存时 `status=truncated` 表示 Span 内只保留摘要，完整脱敏副本仍在 artifact；写入失败则是 `artifact_write_failed`。`matches_model_payload` 只表示此字符串是否被脱敏改变，不证明整条模型请求已完整保存。

`Recorder.ExportSpans` 在导出前处理属性、事件、Link 属性、错误说明和 resource 等副本，同时生成本地记录并交给下游 exporter。不能只依赖输入输出的 MaskFunc 而忽略 metadata 等路径。当前处理依赖已知秘密值和有限正则，不能据此声称已识别所有个人信息。

本地 artifact 路径不是远程可访问的永久 URL；迁移、删除和权限变化会影响读取。只有 hash 能核对一致性，不能还原内容。检查点和账本属于执行状态，即使观测已脱敏，也不能默认这些文件适合进入观测附件或知识库。

## 采样之后还能找回错例吗？

[[otel-trace-collection#采样的收益与代价|Head 与 Tail sampling]]决定哪些轨迹被保留。Head sampling 无法预知最终失败；Tail sampling 能利用收到的执行结果，但取不回上游已丢弃的 Span，也未必等得到数小时后的用户差评。

因此应先确定错例发现的时间范围，再安排基础保留期与采样策略。可以保留一部分正常样本用于基线比较，并优先保留已知错误或慢请求；只保留失败样本得到的是排障集合，不能直接用其失败占比估算整体质量。

还应观察导出丢弃量、队列溢出和载荷截断。整条记录已丢失时，无法靠该条 Trace 自己标注缺失，需要采集系统的计数或日志辅助判断。
