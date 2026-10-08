---
title: "ZooKeeper 节点（znode）"
category: "分布式系统"
created_at: "2026-10-08"
updated_at: "2026-10-08"
tags: ["ZooKeeper", "znode", "节点"]
aliases: ["znode", "ZooKeeper 节点"]
---

**节点（znode）是 [[zookeeper|ZooKeeper]] 树形数据中的存储单元，由路径标识，可保存少量数据并拥有子节点。** 例如 `/config/service-a` 可保存某个服务的配置。

按生命周期和命名，常见类型有：

- 持久节点：创建后一直存在，直到被显式删除。
- 临时节点：与创建它的会话绑定，会话结束时自动删除；客户端短暂掉线不等于会话立刻结束，在超时窗口内重连可以恢复。
- 顺序节点：创建时名字后自动附加序号，序号在同一父节点下递增，可用于排队。

持久与临时决定生命周期，顺序决定命名，两者可组合成持久顺序或临时顺序节点。例如，[[distributed-locks|分布式锁]]可用临时顺序节点表示等待者，按序号确定持锁资格，会话结束后自动清理对应节点。

每个节点带版本号，支持按版本做条件更新，避免直接覆盖别人的修改。边界：节点适合承载小的协调状态，不适合放大对象、当数据库或高吞吐存储；临时节点不能有子节点。规范见 [ZooKeeper 数据模型](https://zookeeper.apache.org/doc/current/zookeeperProgrammers.html#sc_DataModel)。
