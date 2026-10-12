---
title: "MySQL 官方文档导读：提交协调与日志持久化"
category: "MySQL"
parent: mysql-transaction-commit
type: "article"
tags: ["MySQL", "事务", "持久化", "binlog"]
created_at: "2026-10-12T21:32:22+08:00"
updated_at: "2026-10-12T21:32:22+08:00"
source:
  - "https://dev.mysql.com/doc/refman/8.4/en/binary-log.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/innodb-parameters.html#sysvar_innodb_flush_log_at_trx_commit"
  - "https://dev.mysql.com/doc/refman/8.4/en/replication-options-binary-log.html#sysvar_sync_binlog"
  - "https://dev.mysql.com/doc/dev/mysql-server/8.4.11/group__Binary__Log.html"
---

本篇节选 MySQL 8.4 手册与 8.4.11 开发文档中普通 InnoDB 事务的内部提交、组提交与恢复判定。范围不包含应用显式 XA、半同步复制和所有错误分支。

## 准备、写日志与提交的关系

[Binary Log](https://dev.mysql.com/doc/refman/8.4/en/binary-log.html)给出故障动机：若 Binlog 已经同步，但 InnoDB 尚未提交，异常退出后单独回滚引擎会让复制日志与本机数据不一致。8.4 的 InnoDB 两阶段提交支持始终开启，通过准备状态保留后续完成提交的可能。

[MYSQL_BIN_LOG::ordered_commit](https://dev.mysql.com/doc/dev/mysql-server/8.4.11/group__Binary__Log.html)说明，进入组提交前已调用引擎 prepare，但此调用可暂缓持久化；不能把「调用 prepare 返回」直接视为「准备日志已经安全落盘」。后续主要阶段为：

| 阶段 | 开发文档列出的关键工作 |
| --- | --- |
| FLUSH | 调用 `ha_flush_logs` 处理引擎日志；为队列中事务生成 GTID，将各会话缓存写入 Binlog |
| SYNC | 按 `sync_binlog` 决定是否同步 Binlog |
| COMMIT | 调用引擎提交，完成组内事务的后续处理 |

开发文档还列出副本应用线程的顺序协调阶段；这里节选普通提交主线。不同事务可以共享阶段与同步操作，这解释了为什么两阶段协议不等于每笔事务单独执行两次刷盘。引擎同步到什么程度仍受下面的参数控制。

## 持久化参数改变什么

[innodb_flush_log_at_trx_commit](https://dev.mysql.com/doc/refman/8.4/en/innodb-parameters.html#sysvar_innodb_flush_log_at_trx_commit)区分日志写入和同步：

| 值 | 提交时的行为与故障窗口 |
| --- | --- |
| 1（默认） | 每次提交确保所需 Redo 写入并刷新到持久存储 |
| 2 | 提交时写入日志文件，刷新由周期任务完成；系统崩溃或掉电可能丢失尚未刷新的日志 |
| 0 | 日志写入与刷新主要由周期任务完成；进程异常退出也可能丢失仍在日志缓冲中的内容 |

周期默认约一秒，可由 `innodb_flush_log_at_timeout` 调整；调度和其他内部操作会改变实际刷新时刻，所以「最多丢一秒」不是严格上界。

[sync_binlog](https://dev.mysql.com/doc/refman/8.4/en/replication-options-binary-log.html#sysvar_sync_binlog)控制 Binlog 同步频率：1 在事务提交前同步；0 交给操作系统刷新；大于 1 时每累计 N 个提交组同步一次。后两者可能让引擎已提交的事务缺少持久化 Binlog。手册建议两项参数均为 1，并明确存储设备和文件系统必须真实执行同步请求；参数不能补偿虚假的落盘确认。

## 恢复怎样解决准备事务

Binary Log 手册说明，恢复会扫描最新 Binlog，收集有效事务的 XID（事务标识）并确定有效末尾，再通知 InnoDB 完成已经写入 Binlog 的准备事务，处理无效尾部。对普通内部准备事务，完整有效的 Binlog 提交记录使恢复可以完成提交；缺少它则回滚。不能仅因文件中出现了几条行事件就判定已提交。

这些内容支持[[mysql-instance-recovery|崩溃窗口的状态判断]]，不表示用 Binlog 直接重建本机数据页，也不把外部协调者管理的显式 XA 准备事务归入同一规则。本篇核对了文档，未做故障注入。
