---
title: "原子广播（Atomic Broadcast）"
category: "分布式系统"
created_at: "2026-10-09"
updated_at: "2026-10-09"
tags: ["原子广播", "一致性"]
aliases: ["Atomic Broadcast", "原子广播协议", "全序广播"]
---

**原子广播（Atomic Broadcast）是一种具有可靠交付与顺序保证的[[distributed-broadcast|分布式广播]]机制，让节点可靠地交付同一组消息，并按相同顺序交付。** 「交付」指把消息交给上层处理；在协议规定的故障与通信条件下，正常节点不会永久遗漏其他正常节点已经交付的消息。

它强调两个相互配合的要求：

- 可靠交付：不能有的正常节点确认了消息，其他正常节点却永久遗漏。
- [[total-order|全序性（Total Order）]]：若一个节点按 A → B → C 交付，其他节点也按这个顺序交付，不能改成 B → A → C。

节点可以处理得有快有慢，原子广播不要求所有节点在同一瞬间生效，也不保证任意本地读取都能看到最新结果。[[zab|ZAB]] 是 ZooKeeper 对原子广播的具体实现；它与针对单次决定的[[consensus-protocol|共识协议]]密切相关，但关注的是连续消息的可靠、有序交付。

依据：[ZooKeeper Internals：Atomic Broadcast](https://zookeeper.apache.org/doc/current/zookeeperInternals.html#Atomic+Broadcast)。
