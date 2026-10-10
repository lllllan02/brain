---
title: "ZooKeeper 读写与一致性"
category: "分布式系统"
created_at: "2026-10-08"
updated_at: "2026-10-09"
tags: ["ZooKeeper", "ZAB", "一致性"]
aliases: ["ZooKeeper 一致性", "ZooKeeper 读一致性"]
---

**[[zookeeper|ZooKeeper]] 的写操作可线性化，普通读取可能返回旧值；它的整体保证介于[[sequential-consistency|顺序一致性]]与[[linearizability|线性一致性]]之间。** 它既不保证完整读写历史的线性一致性，也不能仅用[[eventual-consistency|最终收敛]]概括。

## 为什么写和读的保证不同

写请求最终交给 Leader，由 [[zab|ZAB]] 排序、广播，经多数派确认后提交；服务节点应用事务后向客户端返回成功。写操作因此具有统一顺序，并尊重写操作之间的真实时间先后关系。

普通读直接由客户端连接的服务器读取本地数据，不经过多数派确认。其他客户端的写入即使已经成功，该服务器也可能还没有应用对应事务，所以读取会滞后。

例如，初始 `x=0`，A 写入 `x=10` 并收到成功响应，B 随后才开始读，却得到 `0`。它违反线性一致性，但可以符合顺序一致性：逻辑上把 B 的读排在 A 的写之前，仍能保持各客户端自身的操作顺序。

## 读到旧值，仍然保留了什么保证

ZooKeeper 保持客户端自身的操作顺序，同一正常会话中的读取不会退回到此前已经看过的更旧版本。不同客户端却可能在同一时刻看到不同进度的数据。

因此，需要分别看 **「写操作的实时顺序、普通读的可见性、各副本的同步进度」**。全序性说明事务排列一致，最终收敛说明副本以后会追上；二者都不能单独推出读取符合真实时间约束。

依据：[ZooKeeper 官方一致性说明](https://zookeeper.apache.org/doc/current/zookeeperInternals.html#Consistency+Guarantees)与[编程指南](https://zookeeper.apache.org/doc/current/zookeeperProgrammers.html#ch_zkGuarantees)。
