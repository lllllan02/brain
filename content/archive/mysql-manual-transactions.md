---
title: "MySQL 官方手册导读：事务与锁"
category: "MySQL"
parent: mysql-overview
type: "article"
tags: ["MySQL", "事务", "MVCC"]
created_at: "2026-10-12T14:03:16+08:00"
updated_at: "2026-10-13T12:48:15+08:00"
source:
  - "https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/innodb-consistent-read.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/innodb-multi-versioning.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/innodb-locking.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/innodb-deadlocks-handling.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/innodb-autocommit-commit-rollback.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/implicit-commit.html"
  - "https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/mysql-acid.html"
  - "https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/innodb-locking-reads.html"
  - "https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/innodb-locks-set.html"
  - "https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/innodb-error-handling.html"
  - "https://github.com/mysql/mysql-server/blob/8.4/storage/innobase/include/read0types.h"
  - "https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/commit.html"
reading_suggestions:
  - mysql-transaction-boundaries
  - mysql-mvcc
  - mysql-locks-and-deadlocks
---

MySQL 8.4 的 InnoDB 文档从事务边界、读取可见性和冲突协调解释事务与并发。本篇节选边界、快照、历史版本、基本锁范围及失败处理，辅以 8.4 分支的 ReadView 实现，不穷举加锁规则、参数调优和提交恢复流程。

## 事务开始、结束与失败边界

[自动提交、提交与回滚](https://dev.mysql.com/doc/refman/8.4/en/innodb-autocommit-commit-rollback.html)说明，InnoDB 的操作都发生在事务中。新连接默认自动提交；显式 START TRANSACTION 可把多条语句放进同一事务，COMMIT 或 ROLLBACK 结束它。关闭自动提交后，提交或回滚当前事务会进入下一事务；提交、整体回滚都会释放该事务的 InnoDB 锁。

这决定多步业务的失败范围：自动提交下，先前成功的语句已经提交，后续失败不能撤销它们。显式事务也不是遇到任何错误都自动整笔回滚；[错误处理](https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/innodb-error-handling.html)区分了语句回滚与事务回滚，应用须按错误类型处理。

[隐式提交清单](https://dev.mysql.com/doc/refman/8.4/en/implicit-commit.html)列出 ALTER TABLE 等许多 DDL，以及再次开始事务等操作：它们会结束当前事务，不能用嵌套 BEGIN 保护一段子操作。CREATE/DROP TEMPORARY TABLE 是特殊边界：虽不隐式提交，操作本身也不能用用户 ROLLBACK 撤销。这里不能简化成「所有 DDL 都提交」或「不隐式提交就可回滚」。

[ACID 模型](https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/mysql-acid.html)将事务控制、隔离规则、恢复与持久性配置联系起来，特别强调持久性还依赖刷盘参数、操作系统和硬件。它不等于自动验证全部业务规则；[[mysql-transaction-boundaries|事务边界与 ACID]]据此区分数据库能力与应用责任。

## 隔离级别怎样影响读取

[隔离级别](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html)列出读未提交、读已提交（RC）、可重复读（RR）和可串行化，InnoDB 默认 RR。基础阅读先抓住 RC 与 RR 普通查询的差异。

[一致性非锁定读](https://dev.mysql.com/doc/refman/8.4/en/innodb-consistent-read.html)明确：**「RC 的每次一致性读使用新快照」**；**「RR 通常沿用本事务首次一致性读建立的快照」**，但仍能看到本事务自己的修改。不能直接把这个规则套给 UPDATE 或 `SELECT ... FOR UPDATE`。

文档的双会话示例中，A 在 RR 事务内首次查询看不到记录；B 插入并提交后，A 再次普通查询仍看不到，A 提交并开始后续查询才看到。例子说明的是快照建立时间与事务边界的关系，不表示 RR 中所有语句永远只能访问同一批行。

同页还给出反例：普通 SELECT 看不到别的事务后来提交的行，UPDATE 却能修改它们，修改后本事务可以读到自身修改。因此，快照不能机械理解成事务期间所有语句共享的一份冻结表。普通 START TRANSACTION 不立即固定 RR 快照；[事务控制语法](https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/commit.html)说明，RR 下 `START TRANSACTION WITH CONSISTENT SNAPSHOT` 可在开始时建立一致快照，其他隔离级别会忽略该修饰并产生警告。

## 历史版本从哪里来

[多版本机制](https://dev.mysql.com/doc/refman/8.4/en/innodb-multi-versioning.html)说明，InnoDB 保存撤销信息，一方面用于回滚，另一方面用于重建旧版本。记录中的事务标识与回滚指针关联修改事务和 Undo 记录；读取时按可见性规则选取适用版本。这就是多版本并发控制（MVCC）减少读写冲突的基础。

旧信息不能全部在提交时删除：插入 Undo 只需支持回滚，而更新 Undo 还可能被已有快照读取，需要等到不再有事务需要它。因而长时间保留读事务可能延长历史版本保留时间。这里应先理解版本为什么存在、为什么不能立即回收，不必先背内部字段长度。

8.4 分支的 [ReadView::changes_visible](https://github.com/mysql/mysql-server/blob/8.4/storage/innobase/include/read0types.h)给出实际判断：本事务或低于低水位的事务版本可见；达到高水位的不可见；中间区间再检查版本事务 ID 是否属于视图建立时的活跃读写事务集合。字段 `m_up_limit_id` 是低水位，`m_low_limit_id` 是高水位，名称容易误读。旧视图保留原集合，所以一个当时活跃的事务后来提交，也不会使其版本突然对旧视图可见；[[mysql-mvcc|MVCC 卡片]]用余额变化解释这条规则。

## 有了旧版本，为什么仍需要锁

[InnoDB 锁](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking.html)区分共享锁与排他锁，也区分记录锁、间隙锁和临键锁（Next-Key Lock）。记录锁作用于索引记录；间隙锁约束向间隙插入；临键锁结合记录及其前方间隙。历史读取与阻止并发修改解决不同问题，MVCC 不会取消所有等待。

分析锁范围时，需要一起给出隔离级别、索引、搜索条件和记录是否存在。例如 RR 中通过唯一索引唯一条件找到记录，可以只锁该记录；范围访问可能还需要保护间隙。不能用「WHERE 只写了一个值」推断只会锁一行，也不能把 RR 简化成对所有语句都相同的幻读结论。

[锁定读](https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/innodb-locking-reads.html)用计数器说明先读后改的困难：两个事务普通读取同一值，可能作出重复分配；先用 FOR UPDATE 保护读取和后续修改，能让冲突操作等待。FOR SHARE 允许并发持有共享锁，但双方随后升级为写锁可能死锁；锁定读应置于明确的事务边界内。

[语句加锁说明](https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/innodb-locks-set.html)强调，锁定读、UPDATE、DELETE 一般按扫描到的索引记录加锁；最终 WHERE 排除某行，不代表执行期间从未锁过它。二级索引排他访问还会锁对应聚簇记录。具体释放时机和间隙保护受隔离级别影响：RC 通常释放不匹配行的记录锁，搜索与扫描通常不用间隙锁，但重复键和外键检查有例外。少扫描记录既减少取数工作，也可能缩小冲突面。

## 死锁与超时怎样处理

[死锁处理](https://dev.mysql.com/doc/refman/8.4/en/innodb-deadlocks-handling.html)要求应用准备重新执行被死锁回滚的事务，并建议缩短事务、统一访问顺序和使用合适索引。SHOW ENGINE INNODB STATUS 提供最近一次死锁信息；排查当前等待可结合 [ACID 章节](https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/mysql-acid.html)指向的 Performance Schema data_locks、data_lock_waits，找到谁持有什么、谁正在等待。

[错误处理](https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/innodb-error-handling.html)明确区分：**「死锁回滚整个被选中的事务」**；**「锁等待超时默认只回滚当前语句」**，启用 innodb_rollback_on_timeout 后才整体回滚。单条语句回滚也不等于释放全部事务锁。应用的重试范围必须与回滚范围一致，[[mysql-locks-and-deadlocks|加锁与死锁卡片]]据此说明等待环与失败后的处理。

本篇示例来自文档与源码分析，未执行并发实验；具体 SQL 的完整锁集合仍需带版本、隔离级别、索引、数据与执行计划验证。
