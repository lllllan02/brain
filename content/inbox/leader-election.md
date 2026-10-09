---
title: "选主（Leader Election）"
category: "分布式系统"
created_at: "2026-10-09"
updated_at: "2026-10-09"
tags: ["分布式系统", "选主", "Leader Election", "共识"]
aliases: ["Leader Election", "leader election", "主节点选举"]
---

**选主（Leader Election）是在一组节点中确定由谁承担领导者职责的过程，例如由它统一安排写事务的顺序，并在它故障后重新选出接替者。** 在 ZooKeeper 中，投票节点参与选举，Observer 不参与投票。

选出负责人后，还需要恢复数据历史，才能继续安全地写入。[[zab|ZAB]] 把换主后的同步与恢复接在选举之后，避免已提交事务因换主丢失。

选主的目标是避免多个有效领导者同时推进冲突决策；网络分区时仍可能有旧节点自认为是主，因此还要结合[[quorum|多数派]]和协议规则约束它的权限。
