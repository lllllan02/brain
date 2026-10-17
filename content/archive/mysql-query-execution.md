---
learning_status: pending
title: "MySQL 的 SQL 执行流程"
category: "MySQL"
parent: mysql-overview#执行流程与存储
tags: ["MySQL", "执行计划", "存储引擎"]
created_at: "2026-10-12T19:05:16+08:00"
updated_at: "2026-10-12T19:05:16+08:00"
reading_suggestions:
  - mysql-index-structure
  - mysql-buffer-pool-lifecycle
  - mysql-index-condition-pushdown
  - mysql-manual-recovery
---

**SQL 执行流程是 MySQL 将 SQL 文本转换成执行计划，再访问数据并返回结果的处理过程。** Server 层负责理解语句与组织执行，InnoDB 负责索引、记录、事务可见性和底层页访问。以下以 MySQL 8.4 的普通文本查询为例。

## 一条查询怎样经过服务端

假设 `orders` 是 InnoDB 表，`id` 为主键，应用执行：

```sql
SELECT amount FROM orders WHERE id = 42;
```

主线是「建立或复用连接 → 解析与准备 → 优化 → 执行并返回」。连接可承载多条请求，不必每条 SQL 都重新建立。

| 阶段 | 处理什么 |
| --- | --- |
| 连接与请求 | 新连接先认证；连接建立后，服务端接收 SQL，语句仍需通过相应权限检查。 |
| 解析与准备 | 将文本解析为语法结构，解析表和列的引用，检查语句能否在当前表结构下执行。 |
| 优化 | 根据条件、索引和统计估算选择访问方式。本例可用主键定位，复杂查询还需决定连接顺序等。 |
| 执行与返回 | 执行器按计划调用引擎取数，完成所需计算，将结果通过连接返回；出错则返回错误信息。 |

阶段分工依据[[mysql-manual-queries#SQL 从文本到执行计划|官方手册与 8.4 源码]]。它是理解流程的概括，权限、表打开和锁检查并非只发生在某个孤立步骤。

## 执行器怎样取得一行

在本例采用主键访问时，执行器请求 InnoDB 查找 `id = 42`。InnoDB 沿[[mysql-index-structure|聚簇索引的树与页]]定位记录，按当前事务的可见性规则取得适用版本，再把行数据交回 Server 层；最终返回 `amount`，无匹配记录时结果为空。

页面已在[[mysql-buffer-pool-lifecycle|缓冲池]]时可从内存访问；缺失时需要加载。因此「调用引擎取行」不等于「每取一行就读一次磁盘」。如果改查二级索引，取数还可能包含回表；如果查询带排序或聚合，执行阶段也可能先处理中间结果。

Server 与引擎并非一次性交接所有工作。执行器可能反复调用引擎，部分条件还可通过[[mysql-index-condition-pushdown|索引条件下推]]交由引擎提前判断。

## 更新在何处不同

把语句改为 `UPDATE orders SET amount = amount + 1 WHERE id = 42`，仍需解析、优化与定位，但随后还要加锁、修改记录并维护相关索引，产生恢复所需的信息。是否提交由事务边界决定；提交与数据页写回分开，日志协调和故障恢复归入[[mysql-manual-recovery|日志与可靠性]]。

上述 SQL 是流程示例，未运行数据库实验，也不代表所有语句共用完全相同的内部调用顺序。
