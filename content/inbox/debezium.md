---
title: "Debezium 如何表示并恢复数据库变更？"
category: "数据同步"
updated_at: "2026-10-07"
tags: ["Debezium", "CDC", "Kafka Connect"]
---

Debezium 通过数据库连接器把日志变化转换为带来源位置和操作类型的事件。常见部署使用 Kafka Connect，也可以嵌入其他运行方式；它不是只能从 Kafka 中读取现成数据的消费者。

连接器初次运行通常按配置进行快照，再衔接增量日志。事件包含 before、after、操作类型与源元数据；快照读取的记录与之后真正发生的插入应区分，例如快照操作标记 r 不等于新增业务事件。

连接器保存源端进度，以便重启后继续读取；Kafka 消费者保存的是下游消费位点。部分连接器还需要 Schema history 恢复历史日志对应的表结构，这三类状态不能混淆，也不能只备份业务 Topic 就认为连接器可以完整恢复。

下游按主键应用变化，并处理删除、重复和跨分区顺序边界。事务元数据可以帮助识别来源事务，但不会自动让每个下游的多表写入成为同一个原子事务。

事件扁平化便于某些目标消费，却可能丢掉操作与来源信息，需要先确认删除与重放所需字段。Outbox Event Router 则把业务在同一数据库事务中写入的 Outbox 记录转换为事件；Outbox 的业务语义需要应用主动设计。

数据库日志必须保留到连接器追上进度。部署时监控快照进展、重启恢复、日志积压和 Schema 兼容，不能仅检查进程存活。

见 [Debezium 架构](https://debezium.io/documentation/reference/stable/architecture.html)、[MySQL 连接器](https://debezium.io/documentation/reference/stable/connectors/mysql.html) 与 [Outbox Event Router](https://debezium.io/documentation/reference/stable/transformations/outbox-event-router.html)。
