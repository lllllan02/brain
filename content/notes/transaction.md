---
title: "事务（Transaction）"
category: "数据存储"
created_at: "2026-10-09"
updated_at: "2026-10-09"
tags: ["数据库", "事务"]
aliases: ["Transaction", "数据库事务"]
---

**事务（Transaction）是数据库中作为一个整体管理的一组操作，通过提交或回滚决定修改是否生效。** 在[[relational-database|关系型数据库]]中，事务的四个核心特性简称 ACID：

- 原子性（Atomicity）：事务的修改整体生效或整体不生效。
- 一致性（Consistency）：事务执行前后，数据满足规定的完整性约束。
- 隔离性（Isolation）：并发事务按指定的隔离级别相互隔离。
- 持久性（Durability）：事务成功提交后，修改结果能够持久保存。

参考：[PostgreSQL 事务入门](https://www.postgresql.org/docs/current/tutorial-transactions.html)。
