---
learning_status: pending
title: "MySQL 事务边界与 ACID"
category: "MySQL"
parent: mysql-overview#事务与并发
type: "concept"
tags: ["MySQL", "事务"]
created_at: "2026-10-12T21:32:30+08:00"
updated_at: "2026-10-12T21:32:30+08:00"
---

**事务边界是同一连接中一组操作开始、提交或回滚的位置，决定哪些修改一起生效。** MySQL 8.4 的 InnoDB 支持[[transaction|事务的 ACID 特性]]，但应用仍需正确划定操作范围、检查业务条件并处理失败。

## 多条语句怎样成为一个整体

新连接默认开启自动提交（Autocommit）：未显式开启事务时，每条成功的普通 DML 语句各自提交。例如转账中的扣款已提交，入账却失败，后续回滚无法撤销先前的扣款。

显式事务把相关操作放在同一个边界内：

```sql
START TRANSACTION;
-- 在同一连接内执行扣款、入账，并检查条件与执行结果。
COMMIT;
```

示例中的 `COMMIT` 只用于全部检查通过的路径；任一步失败或余额不足，应用应执行 `ROLLBACK` 并停止后续操作。更新影响零行不一定是 SQL 错误，必须按业务要求检查。`COMMIT` 确认修改，`ROLLBACK` 撤销当前事务中可回滚的修改，两者都会释放事务持有的 InnoDB 锁。

`SET autocommit = 0` 则改变会话模式：每次提交或回滚后进入下一事务。连接池复用连接时需要管理这项会话状态；一次操作的明确边界通常更适合用 `START TRANSACTION` 表达。

## ACID 的保证落在哪里

| 特性 | InnoDB 中的作用与边界 |
| --- | --- |
| 原子性（Atomicity） | Undo 保存撤销信息，支持取消未提交修改；**「单条语句失败不一定回滚整个事务」**，应用不能忽略错误后继续提交。 |
| 一致性（Consistency） | 数据应满足完整性约束；数据库执行已声明的主键、唯一、外键等约束，余额不能透支、转账两端金额相等仍需业务逻辑与并发控制配合。 |
| 隔离性（Isolation） | [[mysql-isolation-levels\|隔离级别]]规定并发读取和加锁规则；放进同一事务不代表其他事务不能交错执行。 |
| 持久性（Durability） | Redo 等机制支撑提交后的恢复；保证依赖日志刷盘配置与存储设备行为，提交不要求所有脏页立即写回。日志职责见[[mysql-manual-recovery\|恢复导读]]。 |

按[[mysql-manual-transactions#事务开始、结束与失败边界|官方事务边界说明]]，`ALTER TABLE` 等许多 DDL 会隐式提交，不能混入业务事务后期待统一回滚；再次执行 `START TRANSACTION` 也不会形成嵌套事务。以上回滚保证以 InnoDB 等事务型表为前提，外部接口调用与非事务型表的写入不随本地事务自动撤销。
