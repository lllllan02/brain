---
title: "MongoDB 的文档模型如何影响读写与分片？"
category: "数据存储"
updated_at: "2026-10-07"
tags: ["MongoDB", "文档数据库", "分片"]
---

MongoDB 用 BSON 文档保存对象，适合围绕聚合对象读写嵌套结构。文档结构可灵活变化，但字段约定、校验和索引仍需要设计。

经常一起读取、规模有界且生命周期一致的数据，可以嵌入同一文档；多处共享、独立更新或会持续增长的数据，更适合引用。无限增长的数组会让文档越来越难更新和索引，“少做一次关联”不足以证明嵌入一定更好。

单文档更新具有原子性，条件更新可把状态判断与修改一起完成。跨文档事务能够表达更大范围的约束，但需要符合部署条件并承担额外成本，不能因支持事务就忽略数据聚合边界。

副本集以 Primary 接收写入，Secondary 复制操作。write concern 决定写入确认条件，read preference 决定读哪个节点，read concern 决定读取可见性；三者解决不同问题。多数写确认由满足条件的投票数据节点参与，仲裁节点不保存数据，不能把任意多数节点都算成数据副本。

分片键决定数据分布和请求路由。单调键可能集中写入，缺少分片键的查询可能需要访问多个分片。唯一约束也受分片键影响：不能假设任何分片集合中的 `_id` 都由跨分片约束自动保证全局唯一。

数据建模见 [关系建模](https://www.mongodb.com/docs/manual/applications/data-models-relationships/)，部署边界见 [复制](https://www.mongodb.com/docs/manual/replication/) 与 [分片](https://www.mongodb.com/docs/manual/sharding/)。
