---
learning_status: understood
title: "JOIN 与索引"
category: "MySQL"
parent: mysql-indexes
tags: ["索引", "SQL优化", "JOIN"]
created_at: "2026-10-12T17:42:58+08:00"
updated_at: "2026-10-12T17:42:58+08:00"
reading_suggestions:
  - mysql-index-access-cost
  - mysql-manual-queries
---

**JOIN 是按连接条件组合多个表中记录的操作。** 索引在连接中的作用，是帮助每次匹配快速找到另一张表的候选，或先减少参与连接的行。以下讨论 MySQL 8.4、InnoDB。

## 重复匹配的成本来自哪里

假设查询某地区用户的已支付订单：

```sql
SELECT u.id, o.id
FROM users AS u JOIN orders AS o ON o.user_id = u.id
WHERE u.region = 'east' AND o.status = 'paid';
```

如果计划先筛出用户，再逐个找订单，这是一条嵌套循环连接路径：

`取一个用户 → 用用户 id 找已支付订单 → 输出匹配行 → 处理下一个用户`

没有合适的订单索引时，逐个用户扫描订单会重复检查大量无关记录。若 orders 有 `(user_id, status)`，每轮可用当前用户 id 和 paid 定位候选；users 上的 region 索引则可能减少外层参与连接的用户。二者减少的是不同位置的工作。

## 索引要跟随实际连接路径

先筛用户只是一个候选计划。如果已支付订单极少，优化器也可能先筛订单，再按用户主键查用户。不要按 SQL 书写顺序认定谁先访问，也不要只按表的总行数决定连接顺序；过滤后的行数、每次匹配量与索引成本都重要。

连接列的数据类型、字符集等也应兼容，避免转换妨碍定位。上述查询中 user_id 与 status 每轮都为等值条件，不能据此断言 `(user_id, status)` 永远优于 `(status, user_id)`；前导列的取舍还要看其他查询。

## 看每轮工作，也看执行几轮

[[mysql-manual-queries#分页与连接的工作量|官方连接说明]]同时介绍嵌套循环与哈希连接。没有连接索引不代表 MySQL 8.4 必然采用逐行全表重扫，优化器可能采用哈希连接。

用 EXPLAIN ANALYZE 观察实际连接算法、内层循环次数及每轮输出量：即使每轮索引查找很快，执行几十万轮仍可能昂贵。它会实际执行查询；本篇仅推演访问路径，未运行实验。更多字段含义沿用[[mysql-index-access-cost|索引选择中的验证方法]]。
