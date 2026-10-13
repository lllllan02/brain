---
learning_status: pending
title: "中间结果优化"
aliases: ["派生表优化", "CTE 优化", "聚合条件下推"]
category: "MySQL"
parent: mysql-query-optimization
tags: ["MySQL", "SQL优化"]
created_at: "2026-10-12T22:02:26+08:00"
updated_at: "2026-10-12T22:02:26+08:00"
---

**中间结果是查询执行中供后续操作使用的数据；优化重点是减少无用的构建、传递和重复计算，同时保留结果语义。** 中间结果不一定完整保存成表，也可能在操作节点间逐行传递。以下讨论 MySQL 8.4、InnoDB。

## 过滤应发生在哪一步

假设 orders 有 user_id、amount，需求是取得用户 7 的订单总额，并且只在总额超过 100 时返回：

```sql
SELECT user_id, total
FROM (
    SELECT user_id, SUM(amount) AS total
    FROM orders
    GROUP BY user_id
) AS totals
WHERE user_id = 7 AND total > 100;
```

如果先处理所有用户的订单、保存分组结果，再筛用户 7，就多计算了其他用户的组。可以将同一需求表达为：

```sql
SELECT user_id, SUM(amount) AS total
FROM orders
WHERE user_id = 7
GROUP BY user_id
HAVING SUM(amount) > 100;
```

user_id 是分组键，提前限制它只排除不需要的组；若有适当索引，还可能减少原表扫描。总额条件必须等聚合完成才能判断，不能改成 `WHERE amount > 100`，否则会排除原本应参与求和的小额订单。

这里展示的是两个可能的处理过程，**「原 SQL 不一定真的先聚合所有用户」**：MySQL 可自动把第一条的外层条件分别下推为 WHERE 与 HAVING。需从[[mysql-query-plans|计划与实际行数]]确认是否已完成优化，不能把语法改写直接当成性能收益。规则及限制见[[mysql-derived-optimization#不能合并时，条件还能提前吗|派生条件下推]]。

## 保存结果还是重新计算

**物化（Materialization）是把查询结果保存为可再次访问的临时结果的执行方式。** 它与将派生表合并到外层查询块是不同路径：

| 办法 | 可能减少的工作 | 代价与边界 |
| --- | --- | --- |
| 合并查询块 | 省去单独构建中间表，让过滤和连接共同优化 | 聚合、DISTINCT、LIMIT 等会阻止派生表合并 |
| 尽早过滤并只保留需要的列 | 减少后续聚合、传递及保存的数据 | 只能移动语义允许的条件；聚合结果条件不能充当原始行过滤 |
| 物化后复用 | 避免多次生成相同结果，可能给临时结果建立索引 | 需要构建与保存，过大时可能使用磁盘；复用收益须覆盖成本 |

CTE 是用 WITH 命名的查询表达式，并不自带「只计算一次」的承诺。[[mysql-derived-optimization#合并与物化改变了什么|合并与物化规则]]规定：若 CTE 被物化，同一语句中的多次引用复用一次构建结果；若被合并，须按最终计划判断。不要只为改成 WITH 就认定消除了重复计算。

同样不能为了少处理数据，跨过 LIMIT 随意移动过滤：先取最近二十笔订单再筛用户 7，与先筛用户 7 再取其最近二十笔，是不同需求。

验证时查看聚合与物化节点的输入输出、构建次数和耗时，以及[[mysql-derived-optimization#临时表是成本，也是复用手段|临时存储成本]]。未出现 Using temporary 也不能证明没有物化；以上示例未连接数据库执行。
