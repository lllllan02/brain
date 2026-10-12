---
title: "消息通信与事件处理模式导读"
category: "消息队列"
type: "article"
tags: ["消息队列", "发布订阅", "流处理"]
created_at: "2026-10-12T20:40:35+08:00"
updated_at: "2026-10-12T20:40:35+08:00"
source:
  - "https://learn.microsoft.com/en-us/azure/architecture/guide/technology-choices/messaging"
  - "https://learn.microsoft.com/en-us/azure/architecture/patterns/publisher-subscriber"
  - "https://learn.microsoft.com/en-us/azure/architecture/patterns/queue-based-load-leveling"
  - "https://kafka.apache.org/43/design/design/"
  - "https://developer.confluent.io/patterns/event-processing/event-processor/"
---

**这些资料解释消息系统怎样分离发送与处理、分发信息、缓冲压力，以及重新读取和计算事件。** 本篇摘取通用模式，Azure 产品配置不直接套用于 Kafka；Kafka 部分以 4.3 文档为依据。

## 异步与发布订阅

微软的 [Asynchronous Messaging](https://learn.microsoft.com/en-us/azure/architecture/guide/technology-choices/messaging)将生产者、消息中间件和消费者分开。中间件暂存消息后，发送方与接收方不必同时运行；需要业务结果时，仍可用独立的响应消息衔接。这减少了直接等待，却没有消除对消息保存和中间件可用性的依赖。

[Publisher–Subscriber](https://learn.microsoft.com/en-us/azure/architecture/patterns/publisher-subscriber)进一步解决接收方不断变化的问题：直接调用要求发送方维护接收方地址与失败处理；改为订阅后，分发交给消息系统，订阅方自行选择信息。原文描述的是逻辑上的一对多分发，不能据此推断每种实现都会为订阅方创建物理消息副本，也不能把特定产品的持久保留能力当成发布订阅的定义。

## 缓冲怎样平滑负载

[Queue-Based Load Leveling](https://learn.microsoft.com/en-us/azure/architecture/patterns/queue-based-load-leveling)从突发并发压垮下游的问题出发，在请求与处理之间放入缓冲，允许处理方按自己的能力取走工作。原文强调，增加消费者却不限制其总访问速率，仍会使共享数据库等下游过载。

该模式适合允许延后处理的波动负载。持续输入大于输出时，队列只会增长；需观察积压和延迟，并在安全范围内扩处理能力或限制输入。消息能保存多久、能保存多少，以及故障后是否还在，同样限制缓冲效果。

## 历史为什么能够重新处理

Kafka [Design 的 Consumer Position](https://kafka.apache.org/43/design/design/#consumer-position)把消费进度表示为分区中的位置。记录保存与进度分开后，消费者可以回到旧位置，重新处理仍然存在的数据；文中举例是修复消费程序的错误后重读消息。

这是日志系统提供重放的一种实现。重读能重新执行逻辑，却不能自动撤销已发生的外部操作，也不能找回已经清理的事件。业务应用要额外界定重放的输入范围、输出目标和副作用。

## 传递数据与计算数据

Confluent 的 [Event Processor](https://developer.confluent.io/patterns/event-processing/event-processor/)把处理器描述为读取事件、执行操作并可能写出新事件的组件。过滤、字段转换、与其他数据关联等步骤可以组合成处理应用。

原文以传感器记录为例：从输入流读取数据，将地点字段转为大写，再写入输出流。它展示了传输之外的计算职责；Kafka Streams 和 Flink SQL 可以表达这些步骤，但仅启动消息存储服务不会自动完成它们。本篇未执行文中的代码。
