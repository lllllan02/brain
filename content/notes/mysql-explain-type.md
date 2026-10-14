---
learning_status: pending
title: "EXPLAIN 访问类型"
category: "MySQL"
parent: mysql-explain-reading
updated_at: "2026-10-12T22:13:41+08:00"
tags: ["MySQL", "执行计划", "索引"]
aliases: ["EXPLAIN type", "MySQL EXPLAIN type", "访问方式"]
reading_suggestions:
  - mysql-manual-queries
---

**`type` 描述 MySQL 怎样访问当前表。** 它既用于单表查询，也用于连接中的表访问；以下取值按 MySQL 8.4 的[[mysql-manual-queries#EXPLAIN 的字段与常见标记|官方说明]]解释。

| 值 | 含义 |
| --- | --- |
| `system` | 表只有一行，是 const 的特殊情况 |
| `const` | 用常量等值匹配主键或唯一索引的全部键部分，最多匹配一行；该行的列值可被后续优化视为常量 |
| `eq_ref` | 对前面表的每个行组合，用完整主键或 UNIQUE NOT NULL 索引等值查找，最多匹配一行 |
| `ref` | 按非唯一索引，或索引的最左前缀等值查找所有匹配行；不保证唯一 |
| `fulltext` | 使用 FULLTEXT 全文索引访问 |
| `ref_or_null` | 在 ref 等值查找之外，再查找索引键为 NULL 的行 |
| `index_merge` | 合并当前表的多个索引扫描结果；key 与 key_len 分别列出所用索引和相应键长度 |
| `unique_subquery` | 将部分基于唯一键的 IN 子查询替换为索引查找 |
| `index_subquery` | 将部分基于非唯一索引的 IN 子查询替换为索引查找 |
| `range` | 用索引访问一个或多个键值区间；key 指明索引，ref 为 NULL |
| `index` | 全索引扫描；可只读覆盖索引，也可沿索引顺序读取完整数据行 |
| `ALL` | 全表扫描 |

`const` 的值由常量条件确定，`eq_ref` 则针对前面表的每个行组合进行唯一查找。`ref` 与 `eq_ref` 的区别在于索引条件能否保证每轮匹配唯一。

**「type 表示访问方式，不是整条 SQL 的耗时评级。」** 实际工作量还受行数、重复次数和是否需要取行等因素影响。
