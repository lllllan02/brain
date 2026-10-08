---
title: "MySQL EXPLAIN type"
category: "MySQL"
updated_at: "2026-10-08"
tags: ["MySQL", "执行计划", "访问方式", "索引", "全表扫描"]
aliases: ["EXPLAIN type", "访问方式"]
---

**`type` 是 EXPLAIN 里表示「MySQL 怎样访问当前表」的字段**，回答「数据怎么找到」。索引会影响访问方式，具体选了哪个索引看 [[mysql-explain-index-fields|key]]，查询块的角色看 [[mysql-explain-select-type|select_type]]。

| 常见值 | 含义 |
|---|---|
| `system` | 表只有一行，是 const 的特殊情况 |
| `const` | 常量等值匹配主键或唯一索引的全部键列，至多一行 |
| `eq_ref` | JOIN 中按前面每行、用主键或 UNIQUE NOT NULL 索引全部键列查找，至多一行 |
| `ref` | 非唯一索引或索引前缀做等值查找，可能多行 |
| `range` | 用索引扫描一个或多个范围，如 BETWEEN、部分 IN |
| `index` | 全索引扫描，仍可能读很多条目 |
| `ALL` | 全表扫描 |

常见顺序 `system → const → eq_ref → ref → range → index → ALL` 只用来理解从点查到大范围扫描的差异，**不是绝对的耗时排名**：扫 20 行的小表可能比大量随机回表更便宜，而 `ALL + rows=2000000` 值得看看能不能缩小访问范围。

其他值还有 `index_merge`（合并多个索引扫描）、`ref_or_null`（等值后再查 NULL）、`fulltext`（全文检索），不必背全；重点是结合 [[mysql-explain-rows-filtered|rows / filtered]] 和 [[mysql-explain-extra|Extra]] 判断总体成本。
