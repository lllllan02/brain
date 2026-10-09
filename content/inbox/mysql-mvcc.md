---
title: "MySQL MVCC（多版本并发控制）"
category: "MySQL"
created_at: "2026-10-09"
updated_at: "2026-10-09"
tags: ["MySQL", "MVCC", "事务"]
aliases: ["InnoDB MVCC", "MySQL 多版本并发控制"]
---

**MVCC（Multi-Version Concurrency Control，多版本并发控制）是一种通过保留数据版本、按可见性规则读取数据来减少读写锁冲突的并发控制机制。** 在 [[innodb|MySQL InnoDB]] 中，它主要支持普通 SELECT 的一致性非锁定读（快照读），提高读写并发能力。

核心实现由三部分配合：

- 隐藏字段：聚簇索引记录中的 `DB_TRX_ID` 标识最近修改它的事务，`DB_ROLL_PTR` 指向相应的 Undo 记录。
- [[mysql-undo-log|Undo Log]]：保存重建旧版本所需的信息，通过回滚指针逐步构建历史版本，而不是为每次修改复制整张表。
- 读视图（Read View）：依据事务状态和可见性规则，判断当前读取应使用哪个版本。

在读已提交（RC）和可重复读（RR）下，普通 SELECT 通常借此读取可见版本，无需等待其他事务释放行锁；`SELECT ... FOR UPDATE` 等锁定读和写操作仍需锁机制，MVCC 并不消除所有并发等待。

参考：[InnoDB 多版本机制](https://dev.mysql.com/doc/refman/8.4/en/innodb-multi-versioning.html)、[一致性非锁定读](https://dev.mysql.com/doc/refman/8.4/en/innodb-consistent-read.html)。
