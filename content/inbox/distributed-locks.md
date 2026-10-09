---
title: "分布式锁（Distributed Lock）"
category: "分布式系统"
updated_at: "2026-10-09"
tags: ["分布式锁", "Redis", "etcd", "ZooKeeper"]
aliases: ["Distributed Lock", "Fencing Token"]
---

**分布式锁（Distributed Lock）是一种通过共享锁状态协调多个进程访问同一资源的互斥机制，目标是让同一时刻只有一个执行者执行受保护操作。** 例如，多台机器上的任务都可能处理同一订单，就需要共同竞争处理资格，避免重复执行或并发覆盖。

单个进程里的锁只能约束该进程内的线程。跨机器的执行者需要访问同一份锁状态，才能判断谁获得了执行资格；这份状态可以由 Redis、数据库，或 [[distributed-coordination-service|分布式协调服务]]维护。

基本过程是 **「竞争锁 → 获得资格后执行 → 释放锁」**。竞争必须具有原子性，不能让多个执行者同时判断锁为空并各自成功。[[etcd|etcd]] 的普通 Put 加租约只会写入可过期的键，需要配合事务竞争或锁协议；[[zookeeper|ZooKeeper]] 可用临时顺序节点排队，等待者监听前驱节点并重新检查持锁资格。

锁还需要处理持有者故障。租约允许锁在未续期时过期，但旧持有者可能只是暂停，并未停止：A 的租约过期后，B 获得锁；A 恢复后继续操作，仍会发生并发写入。

因此，**「获得锁」的保证范围取决于锁协议和故障条件**。严格保护外部资源时，可用 fencing token（隔离令牌）：每次持锁资格带有递增编号，资源端拒绝旧编号的操作。只有资源端实际检查编号才有效；数据正确性还可能需要事务、唯一约束或幂等处理。

参考：[Redis 分布式锁文档](https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/)、[etcd 并发 API](https://etcd.io/docs/v3.6/dev-guide/api_concurrency_reference_v3/) 和 [Martin Kleppmann 对锁正确性的分析](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html)。
