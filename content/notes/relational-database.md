---
title: "关系型数据库（Relational Database）"
category: "数据存储"
created_at: "2026-10-09"
updated_at: "2026-10-09"
tags: ["数据库", "数据模型"]
aliases: ["Relational Database", "关系数据库"]
---

**关系型数据库（Relational Database）是基于关系模型组织和管理数据的数据库，在逻辑上用行和列组成的表表示数据，通常通过 SQL 进行查询和更新。** 每行是一条记录，每列是一个具有指定类型的字段；这里的「关系」是关系模型中的表，不只是指表之间的关联。

它的主要能力包括：

- 数据关联：用主键标识记录，用外键约束引用关系，并通过 JOIN 关联查询不同表；JOIN 不要求事先定义外键。
- 完整性约束：通过主键、唯一、非空、外键等约束，限制不符合规则的数据。
- [[transaction|事务]]：主流关系型数据库支持 ACID 事务，将多步修改作为一个整体处理。
- 查询与统计：通过 SQL 过滤、关联、分组和聚合数据，并可用[[database-index|索引]]加速适合的查询。

例如，用户表保存用户信息，订单表通过 `user_id` 关联用户，查询时可组合出「用户及其订单」。[[mysql|MySQL]]、[[postgresql|PostgreSQL]]、[[oracle-database|Oracle Database]]、[[sql-server|SQL Server]] 都是常见实现。

参考：[PostgreSQL 关系数据库概念](https://www.postgresql.org/docs/current/tutorial-concepts.html)。
