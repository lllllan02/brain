---
learning_status: pending
title: "MySQL 事务隔离级别"
category: "MySQL"
parent: mysql-overview#事务与并发
type: "concept"
created_at: "2026-10-09"
updated_at: "2026-10-12T21:32:30+08:00"
tags: ["MySQL", "事务"]
aliases: ["InnoDB 隔离级别", "Isolation Level"]
reading_suggestions:
  - mysql-mvcc
  - mysql-locks-and-deadlocks
  - mysql-manual-transactions
---

**事务隔离级别（Transaction Isolation Level）是一组规定并发事务读取与加锁行为的规则。** MySQL 8.4 的 InnoDB 默认使用可重复读（RR）；分析结果时，还要区分普通查询、锁定读和写操作。

## 并发读取可能遇到什么变化

- 脏读（Dirty Read）：读到其他事务尚未提交的修改；对方回滚后，这个值并未生效。
- 不可重复读（Nonrepeatable Read）：同一事务重复读取同一记录，因其他事务提交更新或删除而得到不同结果。
- 幻读（Phantom Read）：同一事务重复按相同条件查找，因其他事务的插入或删除，匹配的记录集合发生变化。

这些名称描述现象，具体能否发生取决于数据库实现和语句类型。

## 四个级别怎样约束读取

| 隔离级别 | 核心特点 |
| --- | --- |
| 读未提交（Read Uncommitted，RU） | 普通读取可能脏读，不提供一致快照。 |
| 读已提交（Read Committed，RC） | 每次一致性读建立新快照，排除其他事务的未提交修改；仍可能不可重复读或幻读。 |
| 可重复读（Repeatable Read，RR） | 同一事务的一致性读沿用首次一致性读建立的快照；只读场景中，其他事务后续提交不改变该快照的记录和范围结果。 |
| 可串行化（Serializable） | 强化约束，使执行效果可串行化；关闭自动提交时，普通 SELECT 隐式转换为 FOR SHARE，通常增加等待。 |

例如 A 在事务内普通查询余额为 100，B 将其改为 200 并提交；A 再次普通查询，RC 可读到 200，RR 仍读到 100。这里假设 A 没有修改该行，也没有结束事务。该差别来自[[mysql-mvcc|MVCC 读视图]]的建立与复用时机。

## 普通查询与锁定读为什么不能混为一谈

一致性非锁定读（Consistent Nonlocking Read，常称快照读）是 RC、RR 下普通 SELECT 的默认读取方式：按快照取版本，不为读取记录加行锁；仍可看到本事务自己的修改。RR 的快照通常在**「首次一致性读」**建立，普通 `START TRANSACTION` 本身不固定快照。

锁定读（Locking Read）如 `SELECT ... FOR UPDATE`、`FOR SHARE` 会读取可用于加锁的较新状态，发生冲突时可能等待。UPDATE、DELETE 也不能按旧快照理解：其他事务后来提交的记录，即使普通 SELECT 看不到，也可能被更新并随后对本事务可见。

因此 RR 中，快照读通过保留视图稳定结果；范围锁定读则依靠[[mysql-locks-and-deadlocks|记录与间隙保护]]限制并发插入。二者解决问题的路径不同，不能概括成「所有语句都只读同一快照」或「所有 SELECT 都加范围锁」。具体规则依据[[mysql-manual-transactions#隔离级别怎样影响读取|官方隔离说明]]。
