---
title: "Redis 复制（Replication）"
category: "Redis"
updated_at: "2026-10-07"
tags: ["Redis", "复制"]
aliases: ["Replication", "Redis replication", "主从复制"]
---

**复制（replication）让一个主节点把数据同步给一个或多个副本（replica）**，副本可用于读扩展和故障接替，也是 [[redis-sentinel|Sentinel]] 与 [[redis-cluster|Cluster]] 的基础。

- **同步方式**：首次或历史无法衔接时全量同步（full resync），再补齐期间的变化；复制标识与偏移量匹配、所需历史仍在 backlog 中时，可做部分重同步（partial resync），避免每次重传全量。
- **延迟与一致性**：副本有延迟，刚写主节点就立刻读副本可能看不到新值。`WAIT` 能让一定数量副本确认收到写入，但不能把系统变成强一致存储，也不能替代所有副本的持久化保障。
- **丢失风险**：复制是异步的，主节点回复成功时，写入未必已经到达将来被选中的副本。
- **复制不是备份**：误删会迅速同步到所有副本，备份要独立保留并演练恢复。

依据见 [Replication](https://redis.io/docs/latest/operate/oss_and_stack/management/replication/)。
