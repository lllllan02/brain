---
learning_status: pending
title: "MySQL 日志分工"
category: "MySQL"
parent: mysql-overview#日志与可靠性
type: "concept"
tags: ["MySQL", "事务", "持久化", "binlog"]
created_at: "2026-10-12T21:32:22+08:00"
updated_at: "2026-10-12T21:32:22+08:00"
---

MySQL 8.4 的 InnoDB 修改数据时，既要在异常退出后恢复修改，也要能撤销事务、读取历史版本和向其他实例传播变化。**Redo、Undo、Binlog 分别保存这些用途需要的信息，共同参与一次写入。**

**Redo Log（重做日志）是 InnoDB 记录数据修改所需重做信息的日志。** 修改先进入缓冲池，日志持久化后，即使数据页还未写回，异常重启也能补回修改；[[wal|WAL]] 规定对应 Redo 先于数据页持久化。Redo 随检查点推进回收旧空间，不是永久保存全部历史的档案。

**Undo Log（撤销日志）是 InnoDB 保存撤销记录的集合。** 它描述怎样撤销对记录的修改，用于事务回滚，也用于一致性读重建旧版本。提交后仍被快照需要的更新 Undo 必须保留；[[mysql-manual-transactions#历史版本从哪里来|历史版本的保留条件]]解释了长事务为何阻碍清理。Undo 也不能任意恢复已经被清理的历史数据。

**Binlog（Binary Log，二进制日志）是 MySQL Server 层记录数据与表结构变更事件的日志。** 它供复制、[[cdc|变更数据捕获]]和备份后的增量回放使用。ROW 格式记录行变更，STATEMENT 格式记录语句，MIXED 按情况选择；Binlog 不等同于所有 SQL 的执行记录，也不替代 InnoDB 的页恢复日志。

例如把一行的 `balance` 从 100 改为 80：Redo 支持恢复这次修改，Undo 提供撤销或重建旧值所需的信息，Binlog 提供向其他实例应用变化的事件。这是职责示意，日志实际编码并非三条对应 SQL；日志内容和边界依据[[mysql-manual-recovery#三类日志记录的对象|官方导读]]。

**「有修改日志」不等于「事务已提交」。** 开启 Binlog 后，[[mysql-transaction-commit|提交过程]]还要协调 InnoDB 的事务状态与 Binlog；恢复时才能判断哪些修改保留、哪些撤销。
