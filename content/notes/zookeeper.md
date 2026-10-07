---
title: "ZooKeeper"
category: "分布式系统"
updated_at: "2026-10-07"
tags: ["ZooKeeper", "ZAB", "Watch"]
---

**ZooKeeper 是分布式协调服务，用树形命名空间保存少量协调状态，并提供有序更新、会话与通知**，常用来实现选主、注册、配置和分布式锁。它保存的是协调元数据，不是业务数据库。

树上的节点（znode）包含数据、版本和子节点，按生命周期与命名分为：

- 持久节点：不随客户端离开而删除；
- 临时节点：与会话绑定，会话过期后删除——短暂断连不等于会话立刻过期；
- 顺序节点：名字带递增序号，可用于排队。

写操作由 Leader 通过 ZAB 复制、经法定数量节点确认，具有顺序保证；普通读由连接的服务器直接返回，可能落后于最新提交，因此不能当作完整的线性一致读。Watch 是一次性通知，只提示「状态可能变化」，客户端要重新读取并重新注册，不能当作保留全部变化的日志。

顺序临时节点可以搭出排队锁：最小序号获得资格，其余只监听前驱，避免同时唤醒，具体用法见 [[distributed-locks|分布式锁]]。规范见 [Programmer's Guide](https://zookeeper.apache.org/doc/current/zookeeperProgrammers.html) 与 [Recipes](https://zookeeper.apache.org/doc/current/recipes.html)。
