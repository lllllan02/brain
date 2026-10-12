---
title: "MySQL 官方手册导读：事务与锁"
category: "MySQL"
parent: mysql-overview
type: "article"
tags: ["MySQL", "事务", "MVCC"]
created_at: "2026-10-12T14:03:16+08:00"
updated_at: "2026-10-12T14:03:16+08:00"
source:
  - "https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/innodb-consistent-read.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/innodb-multi-versioning.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/innodb-locking.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/innodb-deadlocks-handling.html"
---

MySQL 8.4 的 InnoDB 文档从三个角度解释并发：隔离级别规定读取与并发约束，多版本机制提供旧数据，锁协调有冲突的操作。本篇只节选这些基本关系及死锁处理，不穷举加锁规则。

## 隔离级别怎样影响读取

[隔离级别](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html)列出读未提交、读已提交（RC）、可重复读（RR）和可串行化，InnoDB 默认 RR。基础阅读先抓住 RC 与 RR 普通查询的差异。

[一致性非锁定读](https://dev.mysql.com/doc/refman/8.4/en/innodb-consistent-read.html)明确：RC 的每次一致性读使用新快照；RR 通常沿用本事务首次一致性读建立的快照，但仍能看到本事务自己的修改。不能直接把这个规则套给 UPDATE 或 `SELECT ... FOR UPDATE`。

文档的双会话示例中，A 在 RR 事务内首次查询看不到记录；B 插入并提交后，A 再次普通查询仍看不到，A 提交并开始后续查询才看到。例子说明的是快照建立时间与事务边界的关系，不表示 RR 中所有语句永远只能访问同一批行。

## 历史版本从哪里来

[多版本机制](https://dev.mysql.com/doc/refman/8.4/en/innodb-multi-versioning.html)说明，InnoDB 保存撤销信息，一方面用于回滚，另一方面用于重建旧版本。记录中的事务标识与回滚指针关联修改事务和 Undo 记录；读取时按可见性规则选取适用版本。这就是多版本并发控制（MVCC）减少读写冲突的基础。

旧信息不能全部在提交时删除：插入 Undo 只需支持回滚，而更新 Undo 还可能被已有快照读取，需要等到不再有事务需要它。因而长时间保留读事务可能延长历史版本保留时间。这里应先理解版本为什么存在、为什么不能立即回收，不必先背内部字段长度。

## 有了旧版本，为什么仍需要锁

[InnoDB 锁](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking.html)区分共享锁与排他锁，也区分记录锁、间隙锁和临键锁（Next-Key Lock）。记录锁作用于索引记录；间隙锁约束向间隙插入；临键锁结合记录及其前方间隙。历史读取与阻止并发修改解决不同问题，MVCC 不会取消所有等待。

分析锁范围时，需要一起给出隔离级别、索引、搜索条件和记录是否存在。例如 RR 中通过唯一索引唯一条件找到记录，可以只锁该记录；范围访问可能还需要保护间隙。不能用「WHERE 只写了一个值」推断只会锁一行，也不能把 RR 简化成对所有语句都相同的幻读结论。

[死锁处理](https://dev.mysql.com/doc/refman/8.4/en/innodb-deadlocks-handling.html)要求应用准备重新执行被死锁回滚的事务，并建议查看最近死锁信息、缩短事务、统一访问顺序和使用合适索引。学习重点是找到相互等待的资源与顺序，再决定如何减少冲突；本篇未执行并发实验，具体 SQL 的锁范围仍需按条件核对。
