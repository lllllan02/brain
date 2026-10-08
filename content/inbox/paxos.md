---
title: "Paxos 如何选定一个不会被后续提案推翻的值？"
category: "分布式系统"
updated_at: "2026-10-07"
tags: ["Paxos", "共识", "提案"]
aliases: ["Paxos", "Multi-Paxos"]
---

单值 Paxos 让多个参与者为一个决策位置选定至多一个值。它通过 [[quorum|多数派的交集]]、节点记住的承诺，以及后续提案继承已有值的规则维持安全，允许节点暂时不知道结果。

Proposer 发起提案，Acceptor 保存承诺和接受记录，Learner 得知已经选定的值。同一进程可以承担多个角色，角色不等于独立机器。

## 两个阶段如何衔接

每个 ballot 必须唯一且可比较，例如用递增轮次与节点编号组合。它表示提案顺序，不要求依赖全局物理时钟。Acceptor 至少保存已承诺的最高 ballot，以及已接受的 ballot 和值。

1. Prepare：Proposer 选择更大的 ballot，向 Acceptor 请求承诺。接受者若同意，就记录不再接受更小 ballot，并返回自己已接受的最高 ballot 及其值。
2. Accept：收到一个多数派的承诺后，Proposer 从这些回复中选择最高已接受 ballot 对应的值；只有回复全部没有已接受值时，才可自由选择。随后发送当前 ballot 与所选值。
3. Acceptor 只有在该 ballot 不低于自己已承诺值时才能接受，并可靠保存相应状态。一个提案被多数 Acceptor 接受，其值即被选定；Learner 还可能需要额外消息才能得知结果。

应在回复前持久化恢复所需状态，并把同一 ballot 只对应一个值作为实现约束。超时不意味着上一提案没有被选定，不能直接换值重试。为什么必须选最高已接受值，见 [[paxos-value-selection|选值规则的反例]]。

## 为什么安全仍可能没有进展

多个 Proposer 可以用更大 ballot 不断打断对方；Prepare 不像互斥锁那样独占整个过程。实际系统通常引入稳定领导者改善进展。Multi-Paxos 将单值实例扩展为日志，在正确完成覆盖相应实例的准备后，稳定领导者可复用该准备结果；换主时仍要恢复已接受的历史。

Paxos 的「两个阶段」与两阶段提交的准备、事务决定不同，不能混为一个协议。上述模型对应 [Paxos Made Simple](https://lamport.azurewebsites.net/pubs/paxos-simple.pdf)；它不覆盖 [[consensus-fault-models|任意撒谎的节点]]。
