---
learning_status: pending
title: "EXPLAIN 附加信息"
category: "MySQL"
parent: mysql-explain-reading
updated_at: "2026-10-12T22:13:41+08:00"
tags: ["MySQL", "执行计划", "SQL优化"]
aliases: ["EXPLAIN Extra", "MySQL EXPLAIN Extra"]
---

**`Extra` 补充说明表访问之外的处理、所用优化策略和特殊结果。** 同一行可以同时出现多个标记；以下按 MySQL 8.4 解释，依据[[mysql-manual-queries#EXPLAIN 的字段与常见标记|官方输出与临时表说明]]。

## 过滤、索引与排序

| 值 | 含义 |
| --- | --- |
| `Using where` | 用条件限制传给下一张表或客户端的行；不表示没有使用索引 |
| `Using index` | 所需列可由索引直接提供，即[[mysql-covering-index\|覆盖访问]]；不保证扫描量小 |
| `Using index condition` | 使用[[mysql-index-condition-pushdown\|索引条件下推]]，先检查索引条目，再决定是否读取完整行 |
| `Using index for group-by` | 利用索引完成 GROUP BY 或 DISTINCT，并且每组只需读取少量索引条目 |
| `Using index for skip scan` | 使用跳跃扫描访问方式 |
| `Backward index scan` | 反向扫描索引；用于 InnoDB |
| `Using MRR` | 使用多范围读（Multi-Range Read），组织候选行的读取以减少随机访问 |
| `Using filesort` | 需要额外排序，未直接以访问顺序满足排序要求；不表示一定写磁盘 |
| `Using temporary` | 需要内部临时表保存中间结果；不表示一定使用磁盘临时表 |
| `Using union(...)` | 用并集算法合并索引扫描结果 |
| `Using sort_union(...)` | 先排序再用并集算法合并索引扫描结果 |
| `Using intersect(...)` | 用交集算法合并索引扫描结果 |

Using index 与 Using index condition 分别表示覆盖访问和取行前过滤，含义不同。派生表或物化子查询的临时表不一定显示 Using temporary，缺少该标记不能排除所有内部临时表。

## 连接与子查询

| 值 | 含义 |
| --- | --- |
| `Using join buffer (Batched Key Access)` | 使用连接缓冲区执行批量键访问连接 |
| `Using join buffer (hash join)` | 使用哈希连接 |
| `Distinct` | 为当前行组合找到首个匹配后，停止查找更多匹配 |
| `FirstMatch(tbl_name)` | 对指定表使用半连接 FirstMatch 策略，找到所需匹配后提前结束搜索 |
| `LooseScan(m..n)` | 使用半连接 LooseScan 策略；m、n 是所用索引键部分的编号 |
| `Start temporary` / `End temporary` | 标记半连接 Duplicate Weedout 策略使用临时表去重的范围 |
| `Not exists` | 使用找到匹配后即可停止的反匹配处理，也可表示 NOT IN 或 NOT EXISTS 已被改写成反连接 |
| `Full scan on NULL key` | 子查询无法采用索引查找时，使用全扫描回退策略 |
| `Range checked for each record (index map: N)` | 先取得前面表的列值，再为每个行组合检查能否采用 range 或 index_merge；N 是候选索引的位图 |
| `Rematerialize (X,...)` | 当前表读到新行时，触发 X 等横向派生表重新物化 |
| `Recursive` | 本行属于递归公共表表达式的递归 SELECT 部分 |

旧资料中的 `Using join buffer (Block Nested Loop)` 表示块嵌套循环连接；[8.4 连接算法说明](https://dev.mysql.com/doc/refman/8.4/en/bnl-bka-optimization.html)指出该算法已由哈希连接替代，不能把它作为当前版本的连接方式。

## 空结果、预先计算与计划状态

| 值 | 含义 |
| --- | --- |
| `Impossible WHERE` | WHERE 条件恒假，无法选出行 |
| `Impossible HAVING` | HAVING 条件恒假，无法选出行 |
| `Impossible WHERE noticed after reading const tables` | 读取 const、system 表后，确定 WHERE 条件恒假 |
| `const row not found` | 预期作为常量行读取的表为空 |
| `no matching row in const table` | 连接中的常量表为空，或没有满足唯一索引条件的行 |
| `unique row not found` | 没有行满足主键或唯一索引条件 |
| `No matching min/max row` | 没有行满足 MIN 或 MAX 查询的筛选条件 |
| `No matching rows after partition pruning` | UPDATE 或 DELETE 经分区裁剪后，没有需要处理的行 |
| `No tables used` | 不需要访问表，包括无 FROM、使用 FROM DUAL，或 INSERT、REPLACE 没有 SELECT 部分等情况 |
| `Select tables optimized away` | 所需结果可在优化阶段通过确定的少量读取取得，执行阶段不再需要读取表 |
| `Zero limit` | 存在 LIMIT 0，不返回任何行 |
| `Plan isn't ready yet` | EXPLAIN FOR CONNECTION 所观察的语句尚未完成计划生成 |

## 特定引擎或系统表标记

| 值 | 含义 |
| --- | --- |
| `Child of 'table' pushed join@1` | NDB 下推连接中的子表标记 |
| `Using where with pushed condition` | NDB 将条件下推到数据节点执行 |
| `Deleting all rows` | 存储引擎使用专门接口直接删除全部行；适用于支持该优化的引擎，如 MyISAM |
| `Scanned N databases` | 查询 INFORMATION_SCHEMA 时扫描数据库目录的范围；N 可为 0、1 或 all |
| `Skip_open_table` | 所需系统表信息已在数据字典中，无需打开表文件 |
| `Open_frm_only` | 查询表信息时只需读取数据字典 |
| `Open_full_table` | 查询表信息时需要读取数据字典和表文件 |
