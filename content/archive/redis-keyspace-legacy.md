---
title: "Redis 键空间（Keyspace）"
category: "Redis"
updated_at: "2026-10-07"
tags: ["Redis", "键空间", "TTL"]
aliases: ["Redis 键空间", "Redis keyspace"]
---

**Redis 的 key 位于逻辑数据库中，value 有明确类型；key 的 TTL（time to live）控制整个 key 的生命周期**，部分版本还支持 Hash 字段过期，要按版本和命令分别确认。

逻辑数据库编号不是权限隔离或独立资源池，Redis Cluster 只支持数据库 0。命名应包含业务范围，避免不同租户或环境冲突。

键空间语义见 [Redis Keyspace](https://redis.io/docs/latest/develop/using-commands/keyspace/)。
