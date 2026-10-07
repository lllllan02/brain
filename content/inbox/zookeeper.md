---
title: "ZooKeeper 如何用节点和会话实现协调？"
category: "分布式系统"
updated_at: "2026-10-07"
tags: ["ZooKeeper", "ZAB", "Watch"]
---

ZooKeeper 用树形命名空间保存少量协调状态，通过有序更新、会话和通知构建选主、注册与锁等协议。它保存的是协调元数据，不是面向大文件或业务明细的数据库。

znode 包含数据、版本与子节点信息。持久节点不会随客户端离开而自动删除；临时节点与会话绑定，会话过期后删除；顺序节点带递增序号，可用于排队。TCP 短暂断开不等于会话立即过期，不能用断连瞬间推断临时节点已消失。

Leader 通过 ZAB 协调写入并由法定数量节点确认，更新具有顺序保证。普通读取通常由连接的服务器直接返回，可能落后于最新提交；因此不能把所有普通读写概括为完整的线性一致读写。需要新鲜度约束时，应使用适当的同步协议并核对其保证。

标准 Watch 是一次性通知，告诉客户端“状态可能变化”，客户端仍需重新读取并重新注册。不能把 Watch 当作每个变化都完整保留的事件日志；持久 Watch 是另一类接口，需要按版本和使用方式区分。

顺序临时节点可以实现排队锁：最小序号获得资格，其余只关注前驱，减少同时唤醒。读取前驱与注册 Watch 之间仍可能发生删除，需用循环检查处理竞争。获得资格后访问外部资源，依然需要 [[distributed-locks|防止过期持有者继续写入]]。

Observer 可以扩展读服务，但不参与法定投票。具体一致性与会话语义见 [Programmer's Guide](https://zookeeper.apache.org/doc/current/zookeeperProgrammers.html)，协调协议见 [Recipes](https://zookeeper.apache.org/doc/current/recipes.html)。
