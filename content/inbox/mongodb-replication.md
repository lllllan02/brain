---
title: "MongoDB 副本集"
category: "数据存储"
created_at: "2026-10-08"
updated_at: "2026-10-08"
tags: ["MongoDB", "副本集", "一致性"]
aliases: ["MongoDB replication", "write concern", "read concern", "read preference"]
---

**副本集用一组节点保存同一份数据、提供高可用：一个 Primary 接收写入，Secondary 复制它的操作日志。** 发生故障时从 Secondary 中选出新的 Primary。

读写行为由三个独立设置控制，它们解决不同的问题、不能互相替代：

- **write concern**：写入要多少个数据节点确认才算成功，决定写确认条件，影响丢数据风险和延迟。
- **read preference**：从哪个节点读（Primary、Secondary 还是就近），决定读请求走哪。
- **read concern**：读到什么可见性的数据，例如只读已提交。

多数写确认由满足条件的投票数据节点参与；**仲裁节点不保存数据**，不能把它算进数据副本。

参考：[MongoDB 复制](https://www.mongodb.com/docs/manual/replication/)。
