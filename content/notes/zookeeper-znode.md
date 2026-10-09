---
title: "ZooKeeper 节点（znode）"
category: "分布式系统"
created_at: "2026-10-08"
updated_at: "2026-10-09"
tags: ["ZooKeeper", "znode", "节点"]
aliases: ["znode", "ZooKeeper 节点"]
---

**节点（znode）是 [[zookeeper|ZooKeeper]] 树形数据中的存储单元，由路径标识，可保存少量数据并拥有子节点，每个节点带版本号，支持按版本做条件更新。** 例如 `/config/service-a` 保存某个服务的配置。

它的作用是把应用要共同遵守的状态收敛成树上可定位、可读写也可订阅的对象：路径让多个进程指向同一份状态，层级把相关状态组织在一起，再配合 [[zookeeper-watch|Watch]] 的变化通知，就能用同一套原语表达配置、成员、[[leader-election|选主]]和 [[distributed-locks|锁]]。ZooKeeper 用节点树而非单纯键值存储，正是因为协调还要求按名分组、随会话自动清理、按创建次序排队这些语义。

边界：节点适合承载小的协调状态，不适合放大对象、当数据库或高吞吐存储；临时节点不能有子节点。
