---
title: "ZooKeeper"
category: "分布式系统"
updated_at: "2026-10-09"
tags: ["ZooKeeper", "ZAB", "Watch", "znode"]
aliases: ["ZK"]
---

**ZooKeeper 是一种[[distributed-coordination-service|分布式协调服务]]，由多台服务器共同维护少量协调状态，供应用完成服务注册、配置管理、选主和分布式锁等工作。** 客户端访问同一份逻辑数据，集群内部通过多个副本保存它。

数据以树形的[[zookeeper-znode|节点（znode）]]组织，客户端通过读写节点参与协调，并用 [[watch|Watch]] 感知变化。服务器分为[[zookeeper-roles|Leader、Follower 和 Observer]]，通过 [[zab|ZAB 原子广播协议]]维护写事务的顺序与故障恢复。

[[zookeeper-client|客户端]]连接到某个服务器后发起请求，无需自己处理集群内部的读写路由；但[[zookeeper-consistency|普通读可能返回旧值]]，副本并不保证在同一时刻处于完全相同的进度。

ZooKeeper 适合少量协调元数据，不宜充当大规模业务数据库。借助它实现[[distributed-locks|分布式锁]]等功能时，还需处理业务操作自身的正确性。

官方资源：[官网](https://zookeeper.apache.org/)、[代码仓库](https://github.com/apache/zookeeper)、[编程指南](https://zookeeper.apache.org/doc/current/zookeeperProgrammers.html)与 [Recipes](https://zookeeper.apache.org/doc/current/recipes.html)。
