---
learning_status: pending
parent: agent-trace
title: "Langfuse Trace 查看"
category: "Agent"
tags: ["Agent", "Trace", "可观测性"]
created_at: "2026-10-13T01:24:08+08:00"
updated_at: "2026-10-13T01:24:08+08:00"
reading_suggestions:
  - agent-trace-structure
  - agent-trace-capture
  - agent-trace-verification
  - agent-trace-evaluation
---

**先在列表中圈定异常运行，再用调用树看归属、时间线看等待、输入输出查证据，最后用评分判断是否符合业务预期。** 不同视图回答不同问题，不应只盯着节点颜色。

以下界面来自本地 Langfuse 4.56.0 与订单实验已有数据。打开实验报告中的 Trace 链接；服务运行时也可进入 [Tracing 列表](http://localhost:3000/project/trace-lab-project/traces)。网页登录使用实验 `.local/langfuse.json` 中的 email/password，程序接入的 API Key 不是登录密码。

## 从哪里找到想查的运行？

先选右上角时间范围，再根据问题筛选。此版本 Tracing 列表展示 observation，根运行和子步骤可能混排；**要统计任务，先在 Is Root Observation 里只保留 True**，不能把列表总行数当作任务数。

![[assets/agent-trace-langfuse-list.jpg]]

| 想找什么 | 可以怎样筛选 |
| --- | --- |
| 某次具体运行 | 使用报告里的直接链接，或 Trace ID 筛选 |
| 运行报错 | 搜索框使用页面提示的 `level:ERROR`；也查看失败步骤，防止根已恢复成功 |
| 慢步骤／慢任务 | 按 Latency 筛选，或使用 `latency:>2`；先明确筛的是根还是子节点 |
| 模型调用 | Type 选择 GENERATION，再按模型名、环境和 Version 比较 |
| 质量问题 | Numeric Scores 中选择对应规则，查看低分，再回到原 Trace |

页面有 Refresh 和自动刷新选择；没有新数据时先确认时间范围与筛选，再检查采集，不立即断言程序没执行。截图包含多轮历史实验，计数不是某一轮套件的统计结果。

## 调用树里先看哪几个节点？

打开 [normal/fixed 运行](http://localhost:3000/project/trace-lab-project/traces/d224a0068b8f4cfc41e774a82b2118d3)，选择 Tree，先点 `order.after_sales` 看输入、最终输出、stop_reason 和 version；再展开 Agent，分别查看 `ChatModel`、`ToolNode` 下的工具。

![[assets/agent-trace-langfuse-overview.jpg]]

点击模型节点，Preview → Raw 查看当轮消息和响应；点工具节点查看参数与结果。`model.request`、`tool.raw_result`、`context.prepare` 是应用补充节点，不是多调用了一次模型或工具。它们如何产生，由[[agent-trace-spans|Span 创建与结束]]说明。

模型响应里找到工具调用 ID，再在工具结果中对应；不要只凭相同名称寻找。框架内部 Chain、Graph、Lambda 不必逐个展开，先沿与问题有关的模型、工具与业务节点追踪。

## 时间花在哪里，是否真的并行？

切换 Timeline，打开标签，用 Zoom in/out 调整尺度。normal/fixed 总耗时约 4.35 秒，首个模型节点约 1.27 秒；订单和物流各约 21 毫秒，它们的横向位置重叠。

![[assets/agent-trace-langfuse-timeline.jpg]]

先找覆盖等待区间的长节点，再展开它的子节点。长根 Span 本身不能说明 CPU 忙，可能是在等模型、工具、审批或其他调用。父子耗时不能相加，并行工具耗时也不能当成串行总等待；更精确的重叠关系可用导出时间戳核对，见[[agent-trace-structure|并行与重试记录]]。

重试时查每次 attempt 的状态和时长。最终成功的根下仍可能有失败子步骤，那是有效历史，不应被最终成功覆盖。流式首事件与首个有效内容也要分开，本实验把两者写入根结果，不把连接建立时间当作首 token 时间。

## 查看之后怎样用来排障？

对错误订单，沿「模型消息 → 工具参数 → 原始结果 → 加工后内容 → 下一轮消息 → 答复」查第一次偏离。[[agent-trace-capture|内容采集]]中的截图展示原结果为 A、加工后变成 B，能直接把调查范围缩到上下文处理。

点根节点的 Scores，读取 `rules-v1` 分数及 Comment，再对照账本与中间证据。未报错不等于符合业务要求，失败也可能是预期的安全拒绝；[[agent-trace-evaluation|错例回归]]说明怎样固定这个样本并比较改动前后。

## 日常监测应看哪些信号？

把一次排查变成持续监测时，需要先固定统计范围与分母：

| 观察层次 | 信号 | 异常后做什么 |
| --- | --- | --- |
| 任务 | 根运行量、业务通过率、停止原因、延迟分布 | 找失败或慢任务，按场景／版本分组 |
| 模型与工具 | 请求量、错误、重试、用量缺失、长耗时步骤 | 回到具体 generation 或 tool |
| 采集系统 | 导出失败、队列损失、入库延迟 | 按[[agent-trace-verification\|采集可靠性]]逐层核验 |

当前仓库提供批次报告和 `make verify`，界面能手动筛选查看；尚未建立持续告警。将来设置告警应按正常基线、样本量与持续时间定阈值，质量和采集故障分别统计。不能用低分／失败样本集合推断总体成功率，也不能用偏置采样后的记录直接代表所有请求。
