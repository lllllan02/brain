---
title: "ZooKeeper 节点角色"
category: "分布式系统"
created_at: "2026-10-09"
updated_at: "2026-10-09"
tags: ["ZooKeeper"]
aliases: ["ZooKeeper Leader", "ZooKeeper Follower", "ZooKeeper Observer", "观察者"]
---

**ZooKeeper 的 Leader、Follower 和 Observer 是三种服务器角色，主要区别在于谁协调写入、谁参与投票。** 正常工作的集群有一个 Leader，可以有多个 Follower，Observer 按需加入；三种角色不代表固定有三台服务器。

| 角色 | 客户端请求如何处理 | 集群内的职责 |
| --- | --- | --- |
| Leader（领导者） | 处理本地读，协调写入 | 统一写事务顺序，自身也计入多数派确认 |
| Follower（跟随者） | 处理本地读，转交写请求 | 同步数据，参与写事务确认和 Leader 选举 |
| Observer（观察者） | 处理本地读，转交写请求 | 同步已提交数据，不参与写事务投票和 Leader 选举 |

从客户端使用角度，可以把 **「Observer 理解为不参与投票的 Follower」**。增加 Observer 可以分担读请求与客户端连接，又不增加[[quorum|多数派]]确认所需的投票人数；它仍有数据同步开销，也不能替代投票节点维持多数派。

Leader 故障时由投票节点重新[[leader-election|选主]]。这些分工由集群内部完成，[[zookeeper-client|客户端连接]]无需预先识别节点角色；三种角色都可以接收客户端读写请求。

依据：[ZooKeeper Observer 说明](https://zookeeper.apache.org/doc/current/zookeeperObservers.html)。
