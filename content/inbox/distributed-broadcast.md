---
title: "分布式广播（Distributed Broadcast）"
category: "分布式系统"
created_at: "2026-10-09"
updated_at: "2026-10-09"
tags: ["分布式系统", "广播"]
aliases: ["Distributed Broadcast", "分布式广播"]
---

**分布式广播（Distributed Broadcast）是在分布式系统中，把一条消息从一个节点发送给一组节点的一对多通信模式。** 这个名称说明通信方式，本身不承诺消息一定送达，也不规定各节点以什么顺序交付消息。

「普通广播」只是对没有特别说明可靠性和顺序保证的广播的泛称，不是与分布式广播并列的严格协议类别。[[atomic-broadcast|原子广播]]则为广播增加可靠交付和相同交付顺序的保证；[[zab|ZAB]] 是 ZooKeeper 实现原子广播的具体协议。

因此，可以按「通信模式 → 所需保证 → 具体协议」理解这几个词，不必把它们当成三个并列类别。
