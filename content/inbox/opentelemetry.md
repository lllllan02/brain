---
title: "OpenTelemetry"
category: "可观测性"
updated_at: "2026-10-08"
tags: ["OpenTelemetry", "Trace", "Metric", "Log"]
aliases: ["OTel", "OpenTelemetry"]
---

**OpenTelemetry（OTel）是一套统一「产生与传输遥测数据」的标准与工具**：它规定了 Trace、Metric、Log 的埋点 API、SDK、协议和采集组件，让应用用同一种方式上报观测数据。它本身**不是保存和查询数据的后端**。

三种信号互补：**Metric** 观察总体趋势和告警，**Log** 记录离散事件及其上下文，**Trace** 串起一次操作的跨服务路径——先用指标发现异常时间段，再用调用链和 [[logging-pipeline|日志]] 定位具体行为。

追踪模型见[[trace|Trace]] 与 [[span|Span]]；数据的导出、采集与采样见[[opentelemetry-collector|Collector 与采样]]。

OpenTracing 主要定义追踪接口，OpenCensus 提供追踪和指标采集，两者于 2019 年合并为 OpenTelemetry。读旧资料时要保留这层历史，不能把三个名字当成今天要同时搭的三套系统。[项目历史](https://opentelemetry.io/blog/2023/sunsetting-opencensus/)、[概述](https://opentelemetry.io/docs/what-is-opentelemetry/)。
