---
title: "MySQL 官方手册导读：派生表、条件下推与临时结果"
category: "MySQL"
parent: mysql-query-optimization
type: "article"
tags: ["MySQL", "SQL优化"]
created_at: "2026-10-12T22:02:26+08:00"
updated_at: "2026-10-13T12:48:15+08:00"
source:
  - "https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/derived-table-optimization.html"
  - "https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/derived-condition-pushdown-optimization.html"
  - "https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/internal-temporary-tables.html"
---

**「这三节 MySQL 8.4 手册说明：子查询的书写层次不等于执行边界；需要保留中间结果时，仍应尽量减少构建量，并比较复用收益与临时存储成本。」** 本导读聚焦非递归 SELECT 的派生表与 CTE，以及相关临时表行为，不展开临时表全部参数与存储格式。

## 合并与物化改变了什么

[派生表优化](https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/derived-table-optimization.html)将 FROM 子查询、视图引用和公共表表达式（Common Table Expression，CTE）的处理分为两条路径：**「合并到外层查询块」**，或把结果物化成内部临时表。

简单的 `SELECT * FROM (SELECT * FROM t1) AS d` 可以合并为直接访问 t1，避免建立中间结果，也使条件和连接可以共同优化。含聚合、DISTINCT、GROUP BY、HAVING、LIMIT 等结构时则不能按该方式合并；这也是分页子查询能够保留分页边界的依据。

**「物化不一定立即发生」**：如果先访问的另一张表已经没有匹配行，就可能完全跳过中间结果的构建。需要构建时，优化器还可能给临时结果增加索引，换取后续查找收益。CTE 若采用物化，同一条查询中的多次引用复用一次构建结果，并可能为不同引用创建不同索引；「CTE 总是物化」和「引用几次就计算几次」都不成立。

## 不能合并时，条件还能提前吗

[派生条件下推](https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/derived-condition-pushdown-optimization.html)继续处理聚合导致的边界。手册的例子先按 i、j 分组计算 SUM(k)，外层再判断 i > 10 与 sum > 100：

- i 是分组键，条件可以下推为聚合前的 WHERE，减少进入分组的原始行。
- sum 是聚合结果，条件下推为 HAVING，只在聚合完成后排除组，不能因此免掉计算这些组的输入。

这说明「提前过滤」还需分清提前到哪一步。优化默认开启，但含 LIMIT 的派生表、条件本身含子查询、处于外连接内侧，以及被多次引用的物化 CTE 等有相应限制。含窗口函数的情况也不能直接沿用普通分组的规则。

LIMIT 的限制有语义原因：先取全局前二十条再过滤，与先过滤再取前二十条，可能返回不同记录。这是根据 SQL 语义作出的解释，不能为了减少输入就随意跨越边界。实际计划已经完成下推时，手动挪动条件未必产生新增收益。

## 临时表是成本，也是复用手段

[内部临时表](https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/internal-temporary-tables.html)列举了派生结果、CTE、子查询物化、部分去重和聚合等使用场景。临时表可以在内存中，也可以在磁盘上；默认 TempTable 引擎达到单表 tmp_table_size 限制时可转换为 InnoDB 磁盘临时表，全局内存预算另受其他设置限制。

因此应**「先检查进入临时结果的行数、列宽与必要性」**，再评估参数。只留下需要的列、让合法过滤发生得更早，可以减少待保存的数据；若结果能被多次复用，保存它仍可能比重复计算便宜，不能把消除所有临时表作为目标。

EXPLAIN 的 Using temporary 并不覆盖所有派生表或物化临时表；监测计数也有对内存映射文件的统计边界。判断[[mysql-intermediate-results|中间结果优化]]是否有效时，要同时查看计划中的物化节点、输入输出与临时存储情况。本导读未运行数据库实验。
