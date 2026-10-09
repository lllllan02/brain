---
title: "PostgreSQL"
category: "数据存储"
created_at: "2026-10-09"
updated_at: "2026-10-09"
tags: ["数据库", "PostgreSQL"]
aliases: ["Postgres"]
---

**PostgreSQL（简称 Postgres）是开源的对象关系型数据库管理系统，在[[relational-database|关系模型]]基础上支持丰富的数据类型和扩展机制，常用于业务数据存储、复杂查询和数据处理。**

它的主要能力包括：

- 多样化数据：支持 JSONB、数组、UUID 等类型，可在表中处理结构化和半结构化数据。
- 事务与并发：支持 ACID [[transaction|事务]]，通过多版本并发控制（MVCC）与锁协调并发访问。
- 复杂查询：支持窗口函数、公共表表达式（CTE）等 SQL 能力，便于组织多步查询和统计分析。
- 扩展机制：可增加自定义类型、函数和扩展，例如用 PostGIS 处理地理空间数据、用 pgvector 支持向量检索。
- 恢复与复制：通过[[wal|预写日志（WAL）]]、流复制和逻辑复制等机制支持恢复与数据同步，为高可用部署提供基础。

参考：[PostgreSQL 官方介绍](https://www.postgresql.org/about/)。
