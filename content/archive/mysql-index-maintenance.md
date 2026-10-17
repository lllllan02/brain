---
learning_status: pending
title: "索引维护"
category: "MySQL"
parent: mysql-indexes
tags: ["索引", "SQL优化", "DDL"]
created_at: "2026-10-12T17:42:58+08:00"
updated_at: "2026-10-12T17:42:58+08:00"
reading_suggestions:
  - mysql-index-access-cost
  - mysql-manual-queries
---

**索引维护是围绕查询与约束需求，创建、验证、调整和移除索引的管理过程。** 它既要保留读取收益，也要控制额外空间、写入和变更成本。以下以 MySQL 8.4、InnoDB 为范围；命令是示例，未在实际数据库执行。

## 创建之前，先确认缺少什么

先用 `SHOW CREATE TABLE orders`、`SHOW INDEX FROM orders` 查看列序、前缀长度、唯一约束及现有索引，再结合代表性 SQL 的计划决定是否新增。例如已有 `(user_id, created_at)`，再建 `(user_id)` 可能重复普通定位能力，但较窄索引仍可能有成本差异；若一个索引承担唯一性或外键要求，更不能仅凭前缀相同删除。

假设确需增加按用户和时间访问的普通二级索引：

```sql
ALTER TABLE orders
  ADD INDEX idx_user_time (user_id, created_at),
  ALGORITHM=INPLACE, LOCK=NONE;
```

建立索引要读取已有数据并构建有序条目。INPLACE 不等于瞬间完成，LOCK=NONE 表达允许并发读写的要求；不支持所请求方式时语句会报错。普通二级索引通常无需重建整张表，但仍消耗 CPU、I/O 与临时空间。主键、全文或空间索引有不同限制。

[[mysql-manual-queries#索引变更与可见性|在线 DDL 说明]]还指出：结束时更新表定义需要排他元数据锁，持锁事务可能让操作等待。因此，「在线」不保证整个过程无阻塞。

## 如何验证收益

对代表性参数比较[[mysql-index-access-cost|执行计划、实际工作量与耗时]]，同时观察写入延迟和索引空间；不能只验证一条低频查询。统计估算明显偏离时可检查是否需要 `ANALYZE TABLE orders`，它更新统计信息，不是重建索引的命令。

## 删除之前，怎样观察影响

**不可见索引（Invisible Index）是仍被存储和维护、但默认不参与优化器选计划的索引。** 可先让待移除的二级索引不可见，观察典型业务和低频任务，再决定是否删除：

```sql
ALTER TABLE orders ALTER INDEX idx_user_time INVISIBLE;
-- 若出现退化，可恢复参与计划选择
ALTER TABLE orders ALTER INDEX idx_user_time VISIBLE;
-- 确认无需保留后，删除使用的是：
-- ALTER TABLE orders DROP INDEX idx_user_time;
```

不可见期间仍有写入成本，唯一约束也继续生效，所以只能评估查询计划的影响，不能据此测出真正删除后的写入收益。显式或隐式主键不能设为不可见；外键所需索引还受约束规则限制。观察「没被查询用到」也不能替代约束核对。
