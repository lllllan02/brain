---
title: "ZAB（ZooKeeper 原子广播协议）"
category: "分布式系统"
created_at: "2026-10-08"
updated_at: "2026-10-08"
tags: ["ZooKeeper", "ZAB", "共识"]
aliases: ["ZooKeeper Atomic Broadcast", "ZAB 协议"]
---

**ZAB（ZooKeeper Atomic Broadcast）是 [[zookeeper|ZooKeeper]] 使用的、基于领导者（Leader）的原子广播协议：正常运行时按统一顺序复制并提交事务，换主时先恢复一致的事务历史，再继续广播。** 原子广播要求各副本最终交付相同事务，并保持相同顺序，允许应用进度暂时不同。

它的运作可概括为两部分：

- 消息广播：Leader 为写事务分配递增事务 ID（ZXID），向跟随者（Follower）发送提案（Proposal）；节点将提案写入持久日志后回复确认（ACK）。Leader 收到多数确认后广播提交（COMMIT），各副本按 ZXID 顺序应用事务。ZXID 由领导者时期（epoch）和时期内计数器组成，用于标识换主前后的顺序。
- 崩溃恢复：Leader 故障或失去多数支持时，集群重新选主；新 Leader 与参与恢复的副本确立历史，补齐缺失事务、截断不被新历史保留的尾部。多数节点完成同步和新 Leader 确认后，才恢复处理新写入，以保留所有已提交事务及其顺序。

在默认等权投票配置下，[[quorum|多数派]]指超过半数的投票服务器，至少为 `⌊N/2⌋ + 1` 台，包含 Leader 自身；5 台需要 3 台，Observer 不计入投票人数。任意两个多数集合都有交集，但保住历史还依赖选主与恢复规则，仅凑齐回复数量不足以保证一致。

**「故障前尚未提交」不等于「恢复后一定丢弃」**：被新 Leader 选定历史保留的提案可能在恢复时提交。协议必须保证已提交事务不丢失、各副本历史一致，不能简单写成「所有未提交事务都会回滚」。

ZAB 与 [[consensus-protocol|共识协议]]密切相关，特点在于围绕连续事务广播组织正常运行和换主恢复。协议针对节点崩溃等故障，不覆盖任意伪造消息的拜占庭故障；失去多数支持时无法继续提交新写入。

依据：[ZooKeeper Internals](https://zookeeper.apache.org/doc/current/zookeeperInternals.html)与 [Zab 论文](https://www.cs.cornell.edu/courses/cs6452/2012sp/papers/zab-ieee.pdf)。
