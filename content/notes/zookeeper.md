---
title: "ZooKeeper"
category: "分布式系统"
updated_at: "2026-10-08"
tags: ["ZooKeeper", "ZAB", "Watch", "znode"]
aliases: ["ZK"]
---

**ZooKeeper 是一种[[distributed-coordination-service|分布式协调服务]]：通过多台服务器共同维护一棵树形数据，为应用提供配置、成员、选主和锁等少量协调状态。** 客户端通过读写树上的节点参与协调。

应用访问的是同一份逻辑数据；ZooKeeper 内部保留多个副本，以便部分服务器故障后仍能提供服务。它用以下机制维护这份状态：

- 数据组织：[[zookeeper-znode|节点（znode）]]由路径标识，可保存数据和子节点；持久、临时与顺序属性分别支持长期配置、成员存活和排队次序。
- 写入复制：[[zab|ZAB 原子广播协议]]由领导者（Leader）确定事务顺序，经多数确认后提交；换主时先恢复一致的事务历史，再接收新写入。
- 变化通知：客户端用 [[zookeeper-watch|Watch]] 监听节点变化，收到事件后重新读取状态；临时节点在所属会话（Session）结束后自动删除，短暂断线不会立即删除。

这些机制可组合成命名服务、配置管理、选主、[[distributed-locks|分布式锁]]和服务注册。[[zookeeper-consistency|普通读可能返回旧值]]，不同客户端也不保证在同一时刻看到完全相同的状态。

边界：适合少量协调元数据，不适合大体量业务数据或消息队列；它的协议保证仅覆盖自身状态，不能让业务对外部系统的操作自动具备原子性。

官方资源：[官网](https://zookeeper.apache.org/)、[代码仓库](https://github.com/apache/zookeeper)、[Programmer's Guide](https://zookeeper.apache.org/doc/current/zookeeperProgrammers.html) 与 [Recipes](https://zookeeper.apache.org/doc/current/recipes.html)。
