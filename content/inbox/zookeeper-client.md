---
title: "ZooKeeper 客户端如何连接与发送请求"
category: "分布式系统"
created_at: "2026-10-09"
updated_at: "2026-10-09"
tags: ["ZooKeeper", "客户端"]
aliases: ["ZooKeeper 客户端连接"]
---

**ZooKeeper 客户端从配置的服务器地址中选择一个可用节点建立长连接，后续请求通常复用该连接，读写协调由集群内部完成。** 客户端无需识别[[zookeeper-roles|Leader、Follower 或 Observer]]，也不必先访问一个统一的中心入口。

例如配置 `zk1:2181,zk2:2181,zk3:2181` 后，由客户端库选择服务器建立连接；通常不是每次请求都随机挑选节点。

- 读请求：当前连接的服务器直接读取本地数据，因而可能[[zookeeper-consistency|读到尚未追上其他客户端写入的旧值]]。
- 写请求：连接到 Leader 时由它协调；连接到 Follower 或 Observer 时，服务器内部转交 Leader，提交并应用后再向客户端返回结果。
- 断线重连：客户端库尝试其他服务器。普通全局会话尚未过期时可以延续；已经过期则需要建立新会话，原会话的临时节点会被删除。

「连接断开」与「会话过期」是两件事，重连也不意味着已过期的会话能够恢复。

依据：[ZooKeeper 会话说明](https://zookeeper.apache.org/doc/current/zookeeperProgrammers.html#ch_zkSessions)。
