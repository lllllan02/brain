---
title: "ZooKeeper 读写与一致性"
category: "分布式系统"
created_at: "2026-10-08"
updated_at: "2026-10-08"
tags: ["ZooKeeper", "ZAB", "一致性"]
aliases: ["ZooKeeper 一致性", "ZooKeeper 读一致性"]
---

**[[zookeeper|ZooKeeper]] 的写操作具有线性一致性（Linearizability），普通读可能返回旧值；副本按相同顺序应用事务，不代表所有客户端同时看到最新状态。**

- 写：客户端连接的服务器将写请求交给 Leader，由 [[zab|ZAB]] 排序、复制并提交。线性一致性表示每次成功写入都像是在请求发出与成功响应之间的某一刻原子生效，并遵守写操作之间的实时先后关系。
- 读：所连接的服务器直接返回本地数据，无需多数确认，因此可能落后于其他副本。客户端的操作顺序得到保留，读取不会倒退到自己此前见过的更旧状态，但不能据此推断其他客户端已经看到相同结果。

例如，A 写入配置并收到成功响应后，B 连接的副本可能还未应用这次事务，此时 B 的普通读仍可能返回旧配置。顺序一致性（Sequential Consistency）允许这种情况，线性一致读则要求遵守已经完成的写入。

常见做法是在读取前调用 `sync()`，等成功回调后再读，以使当前连接的服务器跟进 Leader 的状态。但 `sync()` 本身不是多数派操作，不能把它当作所有故障场景下的严格线性一致读保证。

> **过时**：原笔记将 `sync()` 后读取描述为「读到最新值」，该保证过强；官方内部文档明确说明其边界，并指出读取前完成一次实际的多数派操作（如写入）可提供更强保证。

依据：[一致性保证](https://zookeeper.apache.org/doc/current/zookeeperProgrammers.html#ch_zkGuarantees)与 [Internals：Consistency Guarantees](https://zookeeper.apache.org/doc/current/zookeeperInternals.html#Consistency+Guarantees)。
