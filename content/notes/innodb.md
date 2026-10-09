---
title: "InnoDB"
category: "MySQL"
created_at: "2026-10-09"
updated_at: "2026-10-09"
tags: ["MySQL", "存储引擎", "事务"]
aliases: ["InnoDB 存储引擎", "InnoDB 事务", "MySQL 事务"]
---

**InnoDB 是 [[mysql|MySQL]] 默认的事务型[[storage-engine|存储引擎]]，负责底层数据存取，提供事务、并发控制和崩溃恢复能力。** 它通过聚簇索引组织记录，用缓存减少磁盘访问，并结合日志、[[mysql-mvcc|多版本并发控制（MVCC）]]和锁支撑可靠的并发读写。

## ACID 如何实现

[[transaction|事务的 ACID]]是通用要求，InnoDB 中的主要实现分工如下：

| 特性 | 主要机制 | 作用 |
| --- | --- | --- |
| 原子性（A） | [[mysql-undo-log\|Undo Log]]、崩溃恢复 | 保存撤销信息，回滚时撤销已执行的修改；崩溃后配合恢复机制完成回滚。 |
| 一致性（C） | 事务机制、数据约束、业务逻辑 | 用主键、唯一、外键等约束限制非法数据，业务规则仍需正确的应用逻辑维护。 |
| 隔离性（I） | 多版本并发控制（MVCC）、锁 | 按隔离级别控制版本可见性与并发修改，包括行级锁及必要的范围锁。 |
| 持久性（D） | [[mysql-redo-log\|Redo Log]]、[[wal\|WAL]]、[[mysql-flushing\|刷盘机制]] | 严格持久化配置下，提交前确保所需日志持久化，崩溃后重做必要修改。 |

## 其他核心机制

- 索引组织：常规索引使用 [[mysql-index-structure|B+ 树]]，[[mysql-clustered-index|聚簇索引]]叶子保存行记录。
- 内存缓存：[[mysql-buffer-pool|Buffer Pool（缓冲池）]]缓存数据页和索引页，减少磁盘 I/O；它本身不提供持久性保证。
- [[mysql-isolation-levels|隔离级别]]：支持读未提交、读已提交、可重复读和可串行化，默认使用可重复读（RR）。
- 恢复与提交：[[mysql-crash-recovery|崩溃恢复]]结合 Redo 与 Undo 处理数据页和未完成事务；开启 [[mysql-binlog|Binlog]] 时，通过内部两阶段提交协调事务提交状态。

参考：[InnoDB 官方文档](https://dev.mysql.com/doc/refman/8.4/en/innodb-storage-engine.html)、[ACID 模型](https://dev.mysql.com/doc/refman/8.4/en/mysql-acid.html)、[事务隔离级别](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html)。
