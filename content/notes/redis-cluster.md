---
title: "Redis 集群（Cluster）"
category: "Redis"
updated_at: "2026-10-07"
tags: ["Redis", "Cluster", "分片"]
aliases: ["Cluster", "Redis Cluster", "Redis 集群"]
---

**Redis 集群（Cluster）把数据分片（sharding）到多个主节点，并让各分片具备[[redis-replication|副本]]与故障切换能力**，用于单机放不下或需要水平扩展的场景。

- **分片**：按 `CRC16(key) % 16384` 把 key 映射到 16384 个槽（slot），每个槽由一个主节点负责，副本用于故障恢复。固定槽与 [[consistent-hashing|一致性哈希环]] 是不同的映射方式。
- **路由**：客户端按槽路由；`MOVED` 提示槽归属已更新，`ASK` 用于迁移中的临时转发（需配合 `ASKING`），不能据此永久改写槽映射。
- **扩容**：扩容要迁移槽和数据，增加节点不会立刻均匀分散负载。
- **跨槽限制**：多 key 操作通常要求位于同一槽，可用 hash tag 共置，但大量数据共用一个标签会重新形成热点。

故障切换的安全边界见 [Cluster 规范](https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/)。对不能容忍重复或过期持有者的操作，还要设 [[distributed-locks|外部约束]]。
