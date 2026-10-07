---
title: "OpenTelemetry 如何串起一次请求的观测数据？"
category: "可观测性"
updated_at: "2026-10-07"
tags: ["OpenTelemetry", "Trace", "Collector"]
type: "concept"
---

OpenTelemetry 统一应用产生与传输 Trace、Metric 和 Log 的方式。它提供埋点 API、SDK、协议与采集组件，本身不等于保存和查询全部观测数据的后端。

Metric 用于观察总体趋势和告警，Log 记录离散事件及其上下文，Trace 串起一次操作的跨服务路径。三者互补：指标发现异常时间段，再用调用链和 [[logging-pipeline|日志]] 定位具体行为。

一个 Trace 描述一次分布式操作，Span 记录其中一段工作，包含开始与结束时间、属性、状态及父子关系。服务通过请求头或消息元数据传播上下文，才能把跨进程的操作连接起来。Span 的边界应包住实际工作，不能把本应只覆盖一次数据库查询的 Span 延长到整个请求结束。

自动埋点可覆盖 HTTP、数据库等常见库，业务步骤仍可能需要手动补充。基础设施团队可以统一 SDK、导出与后端，业务团队仍需定义领域步骤、关键属性，并确保异步任务与消息传递时上下文正确衔接。服务名等身份通常放在 Resource 属性中，请求特征放在 Span 属性中；敏感数据与高基数字段需要按用途控制，不能直接复制所有请求内容。

SDK 通常通过有界队列和批量导出，把数据送到 Collector 或后端。Collector 的 receiver 接收数据，processor 批处理、过滤或采样，exporter 转发到存储。观测链路失败时，需要决定缓冲、丢弃和重试策略，避免业务线程被无限阻塞。

Head sampling 在开始时决定采样，成本较低，但难以提前知道请求最终是否失败；tail sampling 汇总一段 Trace 后决定是否保留，代价是缓存与路由要求。上游已经丢掉的 Span，后面的 tail sampling 无法重新找回。

指标可以采用不同的推送或抓取管线，不能把所有信号都概括为同一条 HTTP 导出路径。[[slow-api-investigation|排障]] 时将 Trace、日志中的 trace_id 与指标时间窗口对应，才能把单次异常与总体变化联系起来。

OpenTracing 主要定义追踪接口，OpenCensus 提供追踪和指标采集等能力；两者于 2019 年宣布合并为 OpenTelemetry。阅读旧资料时应保留这一历史关系，不能把三个名称视为今天需要同时搭建的三套系统。[项目历史与迁移](https://opentelemetry.io/blog/2023/sunsetting-opencensus/)

职责见 [OpenTelemetry 概述](https://opentelemetry.io/docs/what-is-opentelemetry/) 与 [Collector 架构](https://opentelemetry.io/docs/collector/architecture/)。
