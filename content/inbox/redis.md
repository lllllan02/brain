---
title: "Redis"
category: "Redis"
updated_at: "2026-10-09"
tags: ["Redis", "缓存", "数据结构"]
---

**Redis（Remote Dictionary Server）是以键值形式组织数据、主要在内存中提供低延迟读写的数据存储系统，常用于缓存、计数器、排行榜、会话状态和消息流等场景。**

它的核心能力包括：

- 内存读写：通过内存访问减少磁盘读取开销；常见命令采用串行执行模型，但并非所有工作都由一个线程完成，具体见[[redis-threading|线程模型]]。
- 丰富的数据类型：提供 String、Hash、List、Set、Sorted Set、Stream 等[[redis-data-types|数据类型]]，可直接完成计数、集合运算、排序等操作，并用[[redis-keyspace|键的过期时间（TTL）]]管理临时数据。
- 数据持久化：通过 [[redis-persistence|RDB 快照和 AOF 日志]]将数据保存到磁盘，用于重启恢复。
- 高可用与扩展：通过[[redis-replication|主从复制]]保留副本，用 [[redis-high-availability|Sentinel（哨兵）]]支持故障切换，或用 [[redis-cluster|Redis Cluster]]分片扩展数据容量和处理能力。
- 原子操作：单条命令执行具有原子性，也提供[[redis-atomic-operations|事务和 Lua 脚本]]组织多步操作；这不等于关系数据库式的事务回滚。

Redis 不只是缓存，也能作为共享的数据结构存储。是否把它作为唯一数据来源，还需评估持久化、复制和可接受的数据丢失窗口。

参考：[Redis 官方入门](https://redis.io/docs/latest/develop/get-started/)。
