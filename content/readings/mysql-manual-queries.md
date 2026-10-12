---
title: "MySQL 官方手册导读：查询与索引"
category: "MySQL"
parent: mysql-overview
type: "article"
tags: ["MySQL", "索引", "执行计划", "SQL优化"]
created_at: "2026-10-12T14:03:16+08:00"
updated_at: "2026-10-12T14:03:16+08:00"
source:
  - "https://dev.mysql.com/doc/refman/8.4/en/tutorial.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/innodb-introduction.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/innodb-index-types.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/multiple-column-indexes.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/explain.html"
---

MySQL 8.4 手册把「写出查询」「理解数据组织」「观察执行计划」分在不同章节。本篇节选这条阅读路径，帮助理解索引为什么影响查询成本，不是整本手册摘要，也不提供面试题频率统计。

## 从 SQL 操作到 InnoDB

[Tutorial](https://dev.mysql.com/doc/refman/8.4/en/tutorial.html)通过创建和使用一个简单数据库，组织连接、建表、载入数据、筛选、排序、NULL、计数与多表查询；常见查询示例还包括分组最大值、外键和自增列。它适合定位 SQL 基础，复杂类型与优化规则需要转到专门章节。

[InnoDB 简介](https://dev.mysql.com/doc/refman/8.4/en/innodb-introduction.html)说明它是 8.4 默认存储引擎，提供事务、回滚、崩溃恢复、行级锁和一致性读。SQL 查询最终需要访问它管理的记录；[Buffer Pool](https://dev.mysql.com/doc/refman/8.4/en/innodb-buffer-pool.html)按页缓存表和索引数据，常用页可直接从内存访问。因此，分析一次查询既要看访问哪些记录，也要考虑页面是否已在缓存中。

## 索引怎样找到记录

[索引物理结构](https://dev.mysql.com/doc/refman/8.4/en/innodb-physical-structure.html)按树和页解释常规索引，记录位于叶子页。手册在这里使用 B-tree 名称；面试中常讨论的 B+ 树重点在于内部节点导航、叶子保存记录及有序访问，不应把树高直接当作实际磁盘读取次数。

[聚簇与二级索引](https://dev.mysql.com/doc/refman/8.4/en/innodb-index-types.html)进一步区分：聚簇索引保存行数据；定义主键时使用主键，否则依次选择合适的非空唯一索引或生成隐藏聚簇索引。二级索引记录包含索引列和主键值，需要其他行数据时，再按主键查聚簇索引。这解释了回表的额外访问，以及宽主键为什么增加二级索引空间。

[联合索引](https://dev.mysql.com/doc/refman/8.4/en/multiple-column-indexes.html)用姓名索引说明列顺序的意义：索引按组合键排序，可以利用完整组合或最左前缀定位。将它类比为 `(user_id, created_at)`，可理解先固定用户、再找时间范围的访问方式；这是用于学习的类比例子，未运行测试。最左前缀描述定位能力，不能单凭缺少前导列就断言索引在任何执行方式下都毫无作用。

## 怎样知道优化器实际选了什么

[EXPLAIN](https://dev.mysql.com/doc/refman/8.4/en/explain.html)提供优化器的执行计划，支持表格、JSON 和 TREE 等表示。它帮助检查表访问顺序和索引选择；有候选索引不代表优化器一定采用，统计信息也会影响选择。

普通 EXPLAIN 展示计划与估算；`EXPLAIN ANALYZE` 会实际运行受支持的语句，再给出实际行数、循环次数和耗时，便于比较预期与现实。阅读重点是「访问多少数据、重复执行多少次、时间花在哪里」，不能只根据某个标记给整条 SQL 判定快慢。使用 ANALYZE 时要意识到它会执行语句；本导读没有运行 SQL，也不把文档示例当作本地性能结论。
