---
title: "MySQL EXPLAIN type"
updated_at: "2026-10-06"
tags: ["MySQL"]
classes: ["concept"]
---

# MySQL EXPLAIN type

`type` 表示 MySQL **访问当前表数据的方式**，回答「数据怎样找到」。索引会影响访问方式；具体选用哪个索引看 [[mysql-explain-index-fields|key]]，查询块的角色看 [[mysql-explain-select-type|select_type]]。

| 常见值 | 含义 |
|---|---|
| `system` | 表只有一行，是 const 的特殊情况 |
| `const` | 通常以常量等值匹配主键或唯一索引的全部键列，至多匹配一行 |
| `eq_ref` | JOIN 中对前面表的每组行组合，以主键或 UNIQUE NOT NULL 索引的全部键列查找，至多匹配一行 |
| `ref` | 通过非唯一索引或索引前缀做等值查找，可能匹配多行 |
| `range` | 使用索引扫描一个或多个范围，例如 BETWEEN、部分 IN 条件 |
| `index` | 全索引扫描，仍可能读取很多条目 |
| `ALL` | 全表扫描 |

常见学习顺序是 `system → const → eq_ref → ref → range → index → ALL`，用来理解从点查到大范围扫描的差异，**不能当成绝对的耗时排名**。例如扫描 20 行的小表可能比大量随机回表更便宜，而 `ALL + rows=2000000` 值得检查能否缩小访问范围。

其他可能值包括 `index_merge`（合并多个索引扫描）、`ref_or_null`（等值查找再查 NULL）、`fulltext`（全文索引检索）。第一轮不必背全列表，重点是结合 [[mysql-explain-rows-filtered|rows / filtered]] / [[mysql-explain-extra|Extra]] 判断总体成本。
