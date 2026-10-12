---
title: "MySQL"
aliases: ["MySQL", "MySQL 学习入口"]
category: "MySQL"
type: "overview"
tags: ["MySQL", "数据库"]
created_at: "2026-10-12T14:03:16+08:00"
updated_at: "2026-10-12T16:40:01+08:00"
---

**MySQL 是通过表和 SQL 管理数据的关系型数据库管理系统。** 服务端解析、优化和执行 SQL，存储引擎负责底层数据访问。本专题以 MySQL 8.4、InnoDB 为范围。

## 查询与性能

| 方向 | 核心问题 |
| --- | --- |
| 执行流程与存储组织 | SQL 怎样执行，数据页与缓冲池怎样配合？ |
| [[mysql-indexes\|索引原理与设计]] | 数据怎样组织，查询如何定位和取数？ |
| 执行计划与 EXPLAIN | 查询选择了什么路径，扫描了多少数据？ |
| 查询优化与慢查询排查 | 瓶颈在哪里，怎样验证优化效果？ |

[[mysql-manual-queries|查询与索引导读]]提供机制与观察方法的官方依据。

## 事务与并发

事务把一组操作作为整体处理；隔离级别、MVCC 与锁共同约束并发读写。[[mysql-manual-transactions|事务与锁导读]]解释「能读到哪个版本、哪些操作会阻塞、死锁怎样形成」。

## 日志与可靠性

[[mysql-manual-recovery|日志、复制与恢复导读]]区分 Redo、Undo、Binlog 的职责，以及崩溃恢复、复制和备份恢复各自解决的问题。进一步扩展数据容量时，还需考虑[[database-sharding|分库分表]]的查询与事务代价。

[[mysql-learning-resources|学习资料导读]]说明各资料的覆盖范围，便于按具体问题选择来源。
