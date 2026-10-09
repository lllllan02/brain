---
title: "MySQL 事务隔离级别"
category: "MySQL"
created_at: "2026-10-09"
updated_at: "2026-10-09"
tags: ["MySQL", "事务"]
aliases: ["InnoDB 隔离级别", "Isolation Level"]
---

**事务隔离级别规定并发事务之间能看到哪些数据、需要受到哪些并发约束。** [[innodb|InnoDB]] 支持四种隔离级别，默认使用可重复读（RR）。

| 隔离级别 | 核心特点 |
| --- | --- |
| 读未提交（RU） | 普通读取可能看到其他事务尚未提交的修改，即脏读。 |
| 读已提交（RC） | 每次快照读建立新的快照，只读取已提交版本；同一事务两次读取可能因其他事务提交而不同。 |
| 可重复读（RR） | 同一事务的快照读沿用首次快照读建立的快照，使其看到稳定的已提交数据版本；仍能看到自身修改。 |
| 可串行化（Serializable） | 加强并发约束，使事务执行效果等价于某种串行执行，通常会增加锁等待。 |

隔离主要由 [[mysql-mvcc|MVCC]] 和锁共同实现。**RR 的一致快照针对快照读，不能直接套用于加锁查询或 UPDATE。** 对范围内新增行的并发影响，InnoDB 还通过必要的范围锁等机制处理，不能只凭隔离级别名称判断是否会出现幻读。

参考：[InnoDB 事务隔离级别](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html)。
