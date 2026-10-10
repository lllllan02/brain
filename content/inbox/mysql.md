---
title: "MySQL"
category: "MySQL"
created_at: "2026-10-09"
updated_at: "2026-10-09"
tags: ["MySQL", "数据库"]
---

**MySQL 是开源的[[relational-database|关系型数据库]]管理系统，通过表组织数据，使用 SQL 完成查询和更新，常用于保存用户、订单、库存等业务数据。** 应用通常通过数据库驱动连接 MySQL 服务端，由服务端负责数据存储、查询执行和并发访问。

它的主要能力包括：

- 结构化数据与 SQL：定义表和字段，进行增删改查、JOIN 关联查询以及分组统计。
- 事务与约束：默认存储引擎 [[innodb|InnoDB]] 提供事务支持、主键、唯一约束和外键，帮助维护数据完整性。
- 索引与查询优化：通过[[database-index|索引]]减少数据扫描，并用 [[mysql-explain|EXPLAIN]]查看查询执行计划；InnoDB 的常规索引采用 [[mysql-index-structure|B+ 树]]。
- 数据保护与复制：InnoDB 用 [[mysql-redo-log|Redo Log]]支持崩溃恢复与持久性；MySQL 还提供备份恢复和复制能力，为故障恢复、读流量分担和高可用部署提供基础。

例如，订单系统可以把「创建订单」和「扣减库存」放在同一事务中提交。MySQL 提供事务与约束机制，库存是否充足、订单能否创建等业务判断仍需应用正确实现。

参考：[MySQL 官方介绍](https://dev.mysql.com/doc/refman/8.4/en/what-is-mysql.html)。
