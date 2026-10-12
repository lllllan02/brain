---
title: "Binlog（二进制日志）"
category: "MySQL"
created_at: "2026-10-09"
updated_at: "2026-10-09"
tags: ["MySQL", "binlog"]
aliases: ["Binary Log", "MySQL Binlog", "二进制日志"]
---

**Binlog 是 [[mysql|MySQL]] Server 层记录数据和表结构变更事件的二进制日志，主要用于复制与数据恢复。** 副本读取并应用这些事件来同步数据；恢复备份后，也可以重放后续日志，将数据推进到指定时间点。[[cdc|CDC]] 工具还能读取这些变更，同步到其他系统。

常见记录格式有三种：

- **Statement**：记录造成变更的 SQL 语句。
- **Row**：记录数据行的变更信息，表结构变更仍以语句等事件记录。
- **Mixed**：根据语句情况选择 Statement 或 Row 方式。

与 [[mysql-redo-log|Redo Log]] 相比，Binlog 属于 Server 层，面向复制和恢复；Redo 属于 InnoDB，面向事务持久性和数据页崩溃恢复。开启 Binlog 时，它也会参与[[mysql-crash-recovery|崩溃恢复中的事务提交判定]]。

误操作后还可在日志信息充分时生成[[binlog-recovery|补偿 SQL]]，这与恢复备份后正向重放日志是不同的恢复方式。

参考：[MySQL Binary Log](https://dev.mysql.com/doc/refman/8.4/en/binary-log.html)、[日志格式](https://dev.mysql.com/doc/refman/8.4/en/binary-log-formats.html)。
