---
title: "ZooKeeper Watch"
category: "分布式系统"
created_at: "2026-10-08"
updated_at: "2026-10-08"
tags: ["ZooKeeper", "Watch", "通知"]
aliases: ["ZooKeeper 通知", "ZooKeeper Watch 机制"]
---

**Watch 是 [[zookeeper|ZooKeeper]] 的变化通知机制：客户端监听节点的数据、存在性或子节点列表，匹配的变化发生时收到事件；默认 Watch 触发一次后失效，事件不携带新值。**

客户端可在 `getData()`、`exists()` 或 `getChildren()` 读取时同时注册 Watch。常用流程是 **「读取并注册 → 收到事件 → 再次读取并注册」**，用来跟进配置、成员或选主状态；[[distributed-locks|分布式锁]]也可用它等待前驱节点删除。

需要区分三种限制：

- 通知顺序：对已监听的变化，客户端先收到相应 Watch 事件，再通过读取看到该变化；不同客户端收到通知的时间可能不同。
- 变化合并：触发到重新注册之间可能发生多次修改，重新读取只能得到当前状态，不能靠 Watch 还原每一次变化。
- 断线恢复：默认客户端库在原会话有效时重连，会自动重新注册已有 Watch；断线期间不接收事件，例如尚不存在的节点在此期间被创建又删除，存在性 Watch 可能漏掉这段变化。会话过期后则要建立新会话、重读并重新注册。

> **过时**：原笔记将普通断线与 Watch 失效混在一起；断线后恢复原会话与会话过期的处理不同，依据为下方官方 Watch 说明。

ZooKeeper 3.6.0 起还支持通过 `addWatch()` 注册持久 Watch（Persistent Watch），触发后无需再次注册，也可递归监听子树；这不改变事件不携带新值、不能当作完整变更日志的边界。

规范见 [Watch 说明](https://zookeeper.apache.org/doc/current/zookeeperProgrammers.html#ch_zkWatches)。
