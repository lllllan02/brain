---
title: "Flink CDC 如何衔接快照、日志与状态恢复？"
category: "数据同步"
updated_at: "2026-10-07"
tags: ["Flink CDC", "Checkpoint", "流处理"]
---

Flink CDC 把数据库变更接入 Flink 的流处理与状态恢复机制。它可以并行读取存量、持续处理增量，但端到端正确性仍取决于源、算子状态与目标写入是否共同满足语义要求。

以支持增量快照的连接器为例，存量表按主键范围等方式拆成多个 Split 读取，并协调扫描期间的日志变化，避免快照与增量之间遗漏或重复覆盖。扫描并行度提高后，还需控制源库压力和连接器要求的 server ID 等配置范围。

Checkpoint 保存算子状态与源进度，失败后恢复到一致的检查点继续处理。恢复期间部分记录可能再次执行，只有目标支持相应事务提交或幂等写入时，才能达到要求的端到端结果；“开启 Checkpoint”不能独自保证外部系统只产生一次副作用。

源端快、目标慢会产生背压，延长处理延迟并影响 Checkpoint 完成。源日志保留时间必须覆盖停机与追赶窗口，检查点文件也需放在可恢复的持久存储中。

Schema 演进需要明确策略：新增字段、重命名、类型变化与删除字段对不同目标的支持不同。数据集成 Pipeline 的简单转换，也不能自动等同于任意复杂 SQL Join 或全部有状态计算能力。

适合直接同步的链路可使用 Pipeline API；需要复杂转换时，按实际 API 和连接器组合设计 Flink 作业。概念见 [Flink CDC](https://nightlies.apache.org/flink/flink-cdc-docs-stable/docs/get-started/introduction/)，恢复机制见 [Flink Checkpoints](https://nightlies.apache.org/flink/flink-docs-stable/docs/ops/state/checkpoints/)，DDL 处理见 [Schema evolution](https://nightlies.apache.org/flink/flink-cdc-docs-stable/docs/core-concept/schema-evolution/)。
