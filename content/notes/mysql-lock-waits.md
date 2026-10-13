---
learning_status: pending
title: "MySQL 锁等待排查"
aliases: ["MySQL 阻塞事务排查", "Lock Wait Diagnosis"]
category: "MySQL"
parent: mysql-slow-query
type: "practice"
tags: ["MySQL", "事务", "性能排查"]
created_at: "2026-10-12T22:06:03+08:00"
updated_at: "2026-10-12T22:06:03+08:00"
---

**锁等待排查是在请求者、阻塞事务和被锁对象之间建立依赖，找到锁为何迟迟未释放的过程。** 等待中的 SQL 是受影响者；处理它的索引或超时，未必能解除阻塞源。以下以 MySQL 8.4、InnoDB 为范围。

## 数据锁：从等待者找到持锁事务

当前数据锁等待可先查 sys 视图：

```sql
SELECT wait_started, wait_age_secs,
       locked_table_schema, locked_table_name, locked_index,
       waiting_pid, waiting_query,
       blocking_pid, blocking_trx_started, blocking_query
FROM sys.innodb_lock_waits
ORDER BY wait_age_secs DESC;
```

一行给出一个请求者与阻塞者的关系。多个请求可能被同一个事务阻塞，阻塞者也可能在等待另一个事务，应继续核对依赖，不能把第一行当作最终原因。需要看锁模式与具体索引对象时，按锁 ID 关联 Performance Schema 的 `data_lock_waits` 与 `data_locks`。

假设 A 更新订单后没有提交，随后等待外部接口；B 更新同一订单便被阻塞。此时 A 可能已无正在运行的 SQL，`blocking_query` 为 NULL，却仍持有事务锁。应检查 A 的事务开始时间、应用调用链和尚未结束的事务，不能用当前 SQL 为空排除 A。视图字段和空闲连接的行为由[[mysql-performance-diagnostics#锁与 I/O 应分别观察|官方阻塞说明]]支持。

## 元数据锁：另查对象级依赖

DDL 或普通表访问涉及元数据锁时，使用另一组观察入口：

```sql
SELECT object_schema, object_name,
       waiting_pid, waiting_query, waiting_lock_type,
       blocking_pid, blocking_lock_type
FROM sys.schema_table_lock_waits;
```

这里描述元数据锁，不能套用记录锁、间隙锁的解释。长事务与 DDL 的先后关系应结合采样时刻检查；等待表描述当前状态，阻塞解除后记录可能已经消失。数据锁依赖和元数据锁依赖也不能直接合成同一种锁计数。

## 处理应落到事务生命周期

查清原因后，减少事务内无关操作、及时提交或回滚；需要多行保护时统一访问顺序。确由扫描范围过大扩大冲突时，再用合适索引减少扫描与加锁范围。锁范围、死锁和等待超时的回滚差异由[[mysql-locks-and-deadlocks|InnoDB 加锁与死锁]]解释。

若需终止阻塞者，应先保留事务与依赖证据，并由事务所属业务决定处置；终止当前语句不等于结束事务，回滚也可能持续占用资源。等待超时后原事务默认可能仍存活，不能直接重试而留下旧事务。本文是诊断步骤与假设场景，未执行双会话实验或终止连接。
