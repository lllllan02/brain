---
learning_status: understood
title: "查询条件与索引定位"
category: "MySQL"
parent: mysql-indexes
tags: ["索引", "SQL优化"]
created_at: "2026-10-12T17:42:58+08:00"
updated_at: "2026-10-12T17:42:58+08:00"
reading_suggestions:
  - mysql-composite-index
  - mysql-index-access-cost
---

**索引定位是根据查询条件，在有序索引中确定查找点或扫描区间的过程。** 条件必须能转成索引键上的边界，才能跳过无关条目。以下以 MySQL 8.4、InnoDB 为范围，SQL 为假设示例。

## 为什么改写条件会影响定位

假设 created_at 是 DATETIME，已有索引 `(created_at)`，要查某一天的订单：

```sql
-- 按日期计算结果比较
WHERE DATE(created_at) = '2026-10-01'

-- 按索引保存的时间值划定范围
WHERE created_at >= '2026-10-01 00:00:00'
  AND created_at <  '2026-10-02 00:00:00'
```

索引保存完整时间，没有保存 `DATE(created_at)` 的计算结果。第二种写法直接给出区间边界；第一种通常不能由这个普通索引直接形成同样的范围，需要对候选计算日期。树本身仍然有序，问题在于优化器能否把条件转换为键值范围。

若确实需要按表达式查询，可以评估匹配表达式的函数索引，例如 `CREATE INDEX idx_day ON orders ((DATE(created_at)));`。它额外保存表达式的索引值，仍有存储与维护成本；不能将「列上有函数」概括成任何索引都无法使用。

## 另外两种常见情况

| 条件 | 为什么影响定位 |
| --- | --- |
| 字符串列 `code = 123` | 比较可能转为数值语义，`'123'`、`'0123'` 等都可能匹配，无法直接按原字符串键定位一个值。若业务查的是字符串编码，应传字符串参数，如 `code = '123'`，并确认语义相符。 |
| `name LIKE 'abc%'` 与 `name LIKE '%abc'` | 前者有固定开头，可能形成范围；后者缺少固定开头，匹配项可分散在整棵树中，普通索引无法据此确定小范围。 |

这些条件的依据见[[mysql-manual-queries#查询条件与索引定位|范围、类型转换与函数索引说明]]。联合索引还需满足其[[mysql-composite-index|列序与前缀条件]]。

## 不把所有情况都叫「索引失效」

先区分「不能形成有效定位范围」和「范围可用，但优化器认为代价更高」；后者属于[[mysql-index-access-cost|索引选择]]。即使不能定位，索引仍可能用于覆盖或全索引扫描。用 EXPLAIN 核对访问方式与扫描估算，再比较语义等价的改写；不要只看 `key` 是否有值。本篇未实测 SQL。
