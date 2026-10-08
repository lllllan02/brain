---
title: "Paxos"
category: "分布式系统"
updated_at: "2026-10-08"
tags: ["Paxos", "共识", "提案"]
aliases: ["Paxos"]
---

**Paxos 是一种基于多数派的共识算法**：它用「提案编号（ballot）＋ Prepare/Accept 两阶段 ＋ 承诺」让一组参与者为一个决策位置只选定一个值。它容忍少数节点失效、消息丢失或乱序（但不能被篡改），**优先保安全——绝不会选出两个不同的值**；代价是**不保证进展**，也以难理解、难实现著称。单值形式（single-decree）只解决一个决策位置，Multi-Paxos 把它扩展成日志。

三种角色：Proposer 发起提案，Acceptor 保存承诺和接受记录，Learner 得知已经选定的值；同一进程可以承担多个角色，角色不等于独立机器。

安全性来自三样东西：[[quorum|多数派的交集]]、Acceptor 记住的承诺，以及后续提案必须继承已有值的规则。具体过程见[[paxos-two-phases|两个阶段]]。

**为什么可能没有进展**：多个 Proposer 会用更大的 ballot 不断打断对方（活锁），Prepare 也不像互斥锁那样独占整个过程；实际系统通常引入稳定领导者，Multi-Paxos 复用 Prepare 结果，但换主时仍要恢复已接受的历史。

Paxos 的「两个阶段」与两阶段提交不同，不能混为一谈。模型对应 [Paxos Made Simple](https://lamport.azurewebsites.net/pubs/paxos-simple.pdf)；它不覆盖[[consensus-fault-models|任意撒谎的节点]]。
