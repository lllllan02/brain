---
title: "ZAB（ZooKeeper 原子广播协议）"
category: "分布式系统"
created_at: "2026-10-08"
updated_at: "2026-10-09"
tags: ["ZooKeeper", "ZAB", "共识"]
aliases: ["ZooKeeper Atomic Broadcast", "ZAB 协议"]
---

**ZAB（ZooKeeper Atomic Broadcast）是 [[zookeeper|ZooKeeper]] 使用的[[atomic-broadcast|原子广播协议]]，通过 Leader 统一排序、多数派确认和崩溃恢复，让写事务按相同的全局顺序可靠提交，并在换主后保留已提交的事务。**

它主要做两件事：

- 消息广播：Leader 为写事务分配全局有序的事务编号 ZXID，发送给 Follower；收到包含自身在内的[[quorum|多数派]]确认后提交，各节点再按相同顺序应用事务。节点的应用进度可以暂时不同。
- 崩溃恢复：Leader 故障后重新[[leader-election|选主]]，新 Leader 与其他节点同步事务历史，再恢复写入，确保已提交事务不会因换主丢失。尚未提交的事务如何处理取决于恢复后的历史，不能一概说都会回滚。

这里的「相同顺序」称为 [[total-order|全序性（Total Order）]]，描述消息交付的排序约束；[[sequential-consistency|顺序一致性]]则是完整读写历史的一种一致性模型。把 ZAB 的作用写成「保证写事务的顺序一致性」，容易混淆这两个层面。

理解边界时可以分别看：ZAB 负责写事务的有序广播与恢复；[[zookeeper-consistency|ZooKeeper 的对外读写保证]]还取决于读请求如何处理。写入按序提交，不意味着任意节点的普通读立即得到最新值。

依据：[ZooKeeper Internals](https://zookeeper.apache.org/doc/current/zookeeperInternals.html)与 [Zab 论文](https://www.cs.cornell.edu/courses/cs6452/2012sp/papers/zab-ieee.pdf)。
