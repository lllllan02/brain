---
title: "Paxos 两个阶段"
category: "分布式系统"
updated_at: "2026-10-08"
tags: ["Paxos", "Prepare", "Accept"]
aliases: ["Paxos 阶段", "Prepare 与 Accept"]
---

**[[paxos|Paxos]] 用 Prepare 和 Accept 两个阶段选定一个值。** 每个 ballot 唯一且可比较（例如递增轮次 + 节点编号），表示提案顺序，不依赖全局物理时钟；Acceptor 至少保存已承诺的最高 ballot，以及已接受的 ballot 和值。

1. **Prepare**：Proposer 选更大的 ballot，向 Acceptor 请求承诺；Acceptor 若同意，就记录「不再接受更小 ballot」，并返回自己已接受的最高 ballot 及其值。
2. **Accept**：收到多数派的承诺后，Proposer **从回复里选最高已接受 ballot 对应的值**；只有回复全部没有已接受值时，才能自由选值，然后发送当前 ballot 与所选值。
3. Acceptor 只有在该 ballot 不低于自己已承诺值时才接受，并可靠保存状态。一个值被多数 Acceptor 接受即被选定；Learner 可能还需要额外消息才知道结果。

实现上要在回复前持久化恢复所需状态，并保证同一 ballot 只对应一个值。**超时不代表上一提案没有被选定**，不能直接换值重试。为什么必须选最高已接受值，见 [[paxos-value-selection|选值规则的反例]]。
