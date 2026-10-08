---
title: "InnoDB 聚簇索引"
category: "MySQL"
updated_at: "2026-10-08"
tags: ["聚簇索引", "主键", "二级索引"]
aliases: ["聚簇索引", "Clustered Index", "聚簇键"]
---

**聚簇索引是 InnoDB 按聚簇键组织的 [[mysql-index-structure|B+ 树]]，它的叶子直接保存整行记录。** 聚簇键按固定优先级挑：

1. 有主键就用主键。
2. 否则用**首个所有列都声明 NOT NULL 的唯一索引**（这里的 NOT NULL 是定义约束，不是碰巧当前没空值）。
3. 再没有，才由 InnoDB 生成内部聚簇键。

除聚簇索引外的都是**二级索引（secondary index）**：叶子保存「索引键 + 聚簇键」，定位到候选后通常要用聚簇键**回表**取整行。每张表只有一套聚簇组织、二级索引可以有多个；**主键越宽，每个二级索引都要重复保存它，成本越高**。聚簇叶子通常含整行，但长可变列可能用溢出页，不能假定所有字节都内联。

来源：[InnoDB 索引说明](https://dev.mysql.com/doc/refman/8.4/en/innodb-index-types.html)。
