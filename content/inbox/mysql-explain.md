---
title: "MySQL EXPLAIN"
category: "MySQL"
updated_at: "2026-10-07"
tags: ["MySQL", "执行计划", "SQL优化", "索引", "JOIN"]
classes: ["overview"]
---

`EXPLAIN` 展示 MySQL 为 SQL 选择的**执行计划**：访问哪些表、怎样查找数据、使用哪个索引、预计检查多少行，以及是否需要排序或临时表。以下按传统表格格式说明，可用 `EXPLAIN FORMAT=TRADITIONAL SELECT ...` 查看。

理解回表成本前，先区分 [[mysql-index-structure|InnoDB 的聚簇索引与二级索引]]：所选索引决定如何定位候选，也影响是否继续读取完整行。

## 字段总览

| 字段 | 简单含义 |
|---|---|
| [[mysql-explain-id\|id]] | 查询块编号；同一查询块访问多张表时可有多行相同的 id |
| [[mysql-explain-select-type\|select_type]] | 查询块的类型，如 SIMPLE、PRIMARY、SUBQUERY |
| [[mysql-explain-auxiliary-fields\|table]] | 这一行访问的表、别名或中间结果集 |
| `partitions` | 计划访问的分区；非分区表通常为 NULL |
| [[mysql-explain-type\|type]] | 当前表的访问方式，如 ref、range、ALL |
| [[mysql-explain-index-fields\|possible_keys]] | 可能用于查找数据的候选索引 |
| `key` | 当前计划选用的索引 |
| `key_len` | 使用的索引键长度，单位字节 |
| `ref` | 索引等值查找时用于匹配的常量、列或表达式 |
| [[mysql-explain-rows-filtered\|rows]] | 当前访问步骤预计检查的行数 |
| `filtered` | 预计候选行经过剩余条件后留下的百分比 |
| [[mysql-explain-extra\|Extra]] | 覆盖索引、条件过滤、排序、临时表等补充信息 |

## 单表：怎样逐字段读结果

假设非分区表 `orders` 包含 `user_id INT NOT NULL`、`status INT NOT NULL`，分别有普通索引 `idx_user_id(user_id)`、`idx_status(status)`，另有其他业务列。

```sql
EXPLAIN FORMAT=TRADITIONAL
SELECT * FROM orders
WHERE user_id = 100 AND status = 1;
```

下面是用于讲解的一种可能计划，**数值为示意，未在实际数据库运行**；索引选择和估算会随数据分布、统计信息及版本变化。

```text
id  select_type  table   partitions  type  possible_keys           key          key_len  ref    rows  filtered  Extra
1   SIMPLE       orders  NULL        ref   idx_user_id,idx_status  idx_user_id  4        const  100   20.00     Using where
```

1. **定位对象**：`id=1`、`SIMPLE` 表示简单查询块；`table=orders` 表示访问订单表，`partitions=NULL` 对应这里的非分区表。
2. **理解查找方式**：两个索引都是候选，计划选择 `idx_user_id`，按 `user_id=100` 做 `ref` 等值查找。`key_len=4` 对应这里非空 INT 的键长度，`ref=const` 表示匹配常量 100。
3. **估算数据量**：预计找到约 100 行候选记录，剩余的 `status=1` 条件留下约 20%，因此这一步预计输出 `100 × 20 / 100 = 20` 行。`Using where` 提示还要按条件过滤。

## JOIN：为什么一个 id 会有多行

```sql
EXPLAIN FORMAT=TRADITIONAL
SELECT u.id, o.id
FROM users AS u
JOIN orders AS o ON o.user_id = u.id
WHERE u.id BETWEEN 100 AND 110;
```

若 `users.id` 是主键、`orders.user_id` 有普通索引，可能得到下面的访问结构；仅摘录相关字段，未运行验证。

| id | select_type | table | type | key | ref |
|---|---|---|---|---|---|
| 1 | SIMPLE | u | range | PRIMARY | NULL |
| 1 | SIMPLE | o | ref | idx_user_id | 示例库名.u.id |

**一行通常描述对一个表或结果集的访问步骤，一个查询块可以对应多行。** 这里同一个 SELECT 访问两张表，所以两行的 id 都为 1；普通 JOIN 不会自动变成 PRIMARY 或 SUBQUERY。按此嵌套循环计划，先从 u 取候选行，再拿每个 u.id 查找 o；优化器也可能选择其他连接顺序或算法。

分区表也遵循这个粒度：若 orders 按年份分为 `p2025`、`p2026`，跨年查询的 `partitions` 可能为 `p2025,p2026`，通常仍只是一行表访问计划。

## 实际分析顺序

先用 `id / select_type / table / partitions` 确认对象，再按 **type → key → rows 与 filtered → Extra** 判断访问范围、索引选择、候选数据量和额外操作。用 `possible_keys / key_len / ref` 解释为什么这样访问，结合 SQL 和表结构决定是否调整条件或索引。

普通 EXPLAIN 给出计划，不提供完整执行后的实测统计：`type / key` 是当前计划的策略选择，`rows / filtered` 是估算。估算输出也不等于整个 SQL 的最终返回数，后续 JOIN、聚合、去重、LIMIT 都可能改变它。需要验证耗时、实际行数和循环次数时，可在合适环境使用会真实执行查询的 `EXPLAIN ANALYZE`。

接口访问数据库慢，也可能在执行 SQL 之前就发生了[[db-connection-pool|连接池排队]]。先区分获取连接与 SQL 执行的耗时，再用执行计划分析已经定位到的查询。

参考：[MySQL EXPLAIN 语法与 ANALYZE](https://dev.mysql.com/doc/refman/8.4/en/explain.html)。
