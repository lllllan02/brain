---
title: "Watch（监听机制）"
category: "分布式系统"
created_at: "2026-10-08"
updated_at: "2026-10-09"
tags: ["Watch", "通知"]
aliases: ["监听机制", "变化通知机制"]
---

**Watch（监听机制）是一种让客户端订阅数据或资源变化、在变化发生时接收事件通知的机制，常用于服务发现和配置更新。**

基本原理是 **「客户端注册监听 → 服务端记录监听关系 → 匹配的变化发生 → 通知客户端」**。客户端据此更新本地状态，无需不断主动查询；通知是否携带新值、监听能否持续生效，取决于具体系统的实现。

例如，在 [[zookeeper|ZooKeeper]] 中，客户端监听 `/config`，配置变化后，服务端通过已有的 TCP 长连接发送事件，客户端再读取新配置。传统 Watch 是一次性的，触发后需要重新注册；ZooKeeper 3.6.0 起也支持持久化 Watch。这些是 ZooKeeper 的实现特点，不是所有 Watch 的共同限制。

Watch 不等于完整变更日志。例如，ZooKeeper 传统 Watch 在触发到重新注册之间可能发生多次修改，重新读取只能得到当前状态，不能还原每一次变化。

参考：[ZooKeeper Watch 文档](https://zookeeper.apache.org/doc/r3.9.0/zookeeperProgrammers#ch_zkWatches)、[ZooKeeper 连接与通知](https://zookeeper.apache.org/doc/r3.4.10/zookeeperOver.html)。
