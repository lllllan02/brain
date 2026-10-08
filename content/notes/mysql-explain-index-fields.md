---
title: "MySQL EXPLAIN 索引相关字段"
category: "MySQL"
updated_at: "2026-10-08"
tags: ["MySQL", "执行计划", "索引", "联合索引", "SQL优化"]
aliases: ["EXPLAIN possible_keys/key/key_len"]
---

**`possible_keys / key / key_len` 是 EXPLAIN 里回答「有哪些候选索引、选了哪个、用了多长键」的三个字段**，要连查询条件和索引定义一起看。

- **possible_keys**：可能的候选索引；候选不代表一定用，也不代表按当前连接顺序都能用。
- **key**：计划实际选中的索引。`key=NULL` 表示这一步没用索引；候选存在却没选时，看访问比例、回表成本和统计信息。
- **key_len**：使用的索引键长度（字节）。结合类型、字符集、可空性和索引定义，能推测联合索引用到了哪些列；它不是字段个数，也不是越大越好。

例：联合索引 `idx_ab(a,b)`（a、b 都是 `INT NOT NULL`），按 `a=1` 的 key_len 常见为 4，按 `a=1 AND b=2` 常见为 8（可空或变长列会变）。

**用于定位的列，和索引能起的全部作用不同**：后续列还可能用于条件下推、覆盖或排序，不能只凭 key_len 说它们没用。另外 `possible_keys=NULL` 也可能有非空 key（如覆盖全索引扫描）；key 非空只说明选了索引，仍要看 [[mysql-explain-type|type]] 和读多少行。
