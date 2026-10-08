---
title: "一致性协议（共识协议）"
category: "分布式系统"
created_at: "2026-10-08"
updated_at: "2026-10-08"
tags: ["共识", "一致性"]
aliases: ["Consensus Protocol", "共识协议", "一致性协议"]
---

**共识协议（Consensus Protocol）是一套让多个节点在消息延迟、节点故障等条件下，对某个值达成一致的通信与决策规则；连续使用共识可确定操作日志的顺序，让副本按相同顺序更新状态。** 工程讨论中常称其为「一致性协议」，但系统的读写一致性还取决于如何使用协议。

协议既要保证已作出的决定不会互相冲突，也要在满足故障数量、通信和选主等条件时继续推进；它不要求各节点在每一瞬间的本地状态都相同。

常见协议及其组织方式如下：

| 协议 | 核心方式 |
| --- | --- |
| [[paxos\|Paxos]] | 用提案编号、承诺和多数确认，为一个决策位置选定一个值。 |
| Multi-Paxos | 连续执行 Paxos 形成日志，稳定领导者可复用准备阶段，减少后续决策开销。 |
| [[raft\|Raft]] | 将过程组织为选主、日志复制和安全性规则，由 Leader 复制日志并推进提交。 |
| [[zab\|ZAB]] | 由 Leader 有序广播事务，并在换主时恢复事务历史；严格分类属于原子广播协议。 |

共识针对一次决定，原子广播针对一串消息的可靠、有序交付；二者密切相关，但不能只因都使用多数确认，就认为过程和保证完全相同。

上述协议主要处理节点崩溃和网络通信故障，不覆盖任意撒谎的节点。[[zookeeper-consistency|ZooKeeper 的普通读可能返回旧值]]，也说明底层复制协议不能直接等同于对外的线性一致读保证。

依据：[Paxos Made Simple](https://lamport.azurewebsites.net/pubs/paxos-simple.pdf)、[Raft 论文](https://raft.github.io/raft.pdf)与 [Zab 论文](https://www.cs.cornell.edu/courses/cs6452/2012sp/papers/zab-ieee.pdf)。
