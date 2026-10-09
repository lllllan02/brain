---
title: "存储引擎（Storage Engine）"
category: "数据存储"
created_at: "2026-10-09"
updated_at: "2026-10-09"
tags: ["数据库", "存储引擎"]
aliases: ["Storage Engine"]
---

**存储引擎（Storage Engine）是数据库管理系统中负责底层数据组织、存储和读取的组件，其实现影响索引访问、事务支持和并发控制等能力。**

以 [[mysql|MySQL]] 为例，服务端负责 SQL 解析、优化等公共工作，再调用表所使用的存储引擎访问数据。不同表可以选择不同引擎：

- [[innodb|InnoDB]]：默认引擎，支持事务、行级锁、多版本并发控制（MVCC）和崩溃恢复。
- MyISAM：不支持事务，采用表级锁。
- MEMORY：将表数据保存在内存中，服务重启后数据丢失，表定义仍保留。

参考：[MySQL 存储引擎](https://dev.mysql.com/doc/refman/8.4/en/storage-engines.html)。
