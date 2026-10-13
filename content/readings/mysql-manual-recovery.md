---
title: "MySQL 官方手册导读：日志、复制与恢复"
category: "MySQL"
parent: mysql-overview
type: "article"
tags: ["MySQL", "持久化", "binlog", "数据恢复"]
created_at: "2026-10-12T14:03:16+08:00"
updated_at: "2026-10-13T12:48:15+08:00"
source:
  - "https://dev.mysql.com/doc/refman/8.4/en/innodb-redo-log.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/innodb-undo-logs.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/innodb-multi-versioning.html"
  - "https://www.percona.com/blog/innodb-double-write/"
  - "https://dev.mysql.com/doc/refman/8.4/en/innodb-recovery.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/binary-log.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/replication.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/point-in-time-recovery.html"
---

MySQL 8.4 手册把实例崩溃恢复、复制和备份恢复分开介绍，因为三者解决的故障不同。本篇节选职责与基本过程，不包含恢复命令、参数调优或集群部署步骤。

## 三类日志记录的对象

[Redo Log](https://dev.mysql.com/doc/refman/8.4/en/innodb-redo-log.html)以重做记录编码数据修改，按日志序列号（Log Sequence Number，LSN）描述推进位置。

[Undo Logs](https://dev.mysql.com/doc/refman/8.4/en/innodb-undo-logs.html)将 Undo 定义为与读写事务关联的撤销记录集合，每条记录包含撤销聚簇索引记录最近修改所需的信息，也可供一致性读重建原数据。Undo 位于回滚段及其所属表空间；普通持久表的撤销信息需要支持崩溃后的回滚，用户临时表的 Undo 则无需 Redo 保护，因为重启后不恢复这些临时表。

[多版本机制](https://dev.mysql.com/doc/refman/8.4/en/innodb-multi-versioning.html)区分插入与更新 Undo：前者可在提交后释放，后者还需等到不再被任何已分配快照的一致性读需要。长事务可能使更新 Undo 持续保留；「事务已提交」不能直接推出「历史版本已回收」。

[Binary Log](https://dev.mysql.com/doc/refman/8.4/en/binary-log.html)保存 Server 层的变更事件，涵盖数据及表结构变化。行格式与语句格式描述变化的方式不同，面向复制与增量恢复；它与 InnoDB 的页重做、撤销记录互补。

## Redo 怎样参与本机恢复

[Redo Log](https://dev.mysql.com/doc/refman/8.4/en/innodb-redo-log.html)记录数据修改所需的重做信息。异常退出前，某些修改还没有完成数据文件写入，重启时可据此重做；日志随着修改追加，旧部分随检查点推进而回收。它面向当前实例的数据恢复，不是可任意回放全部历史的永久档案。

补充机制解释：Peter Zaitsev 的 [InnoDB Double Write](https://www.percona.com/blog/innodb-double-write/) 指出，Redo 中的页定位与操作信息需要内部一致的页作为应用基础。完整旧页可以重做，但部分写入造成的结构不一致不能等同于“只是少做了几项修改”；Redo 也不是每次修改后的整页备份。双写副本未完成时保留原页，目标页写坏时则用有效副本恢复。该文发表于 2006 年，这里只引用恢复前提与写入顺序，不沿用其旧版存储布局、容量或性能数字；当前双写文件和模式以 [[mysql-manual-buffer-pool#写回过程的完整性|MySQL 8.4 手册]]为准。

[InnoDB Recovery](https://dev.mysql.com/doc/refman/8.4/en/innodb-recovery.html)说明重启后的恢复还要处理未提交事务：**「应用必要的 Redo，并回滚应撤销的修改」**。因而「存在重做日志」本身不能证明事务已经提交。Undo 所提供的撤销与历史版本信息则用于回滚和一致性读，两类日志不能互相替代。

手册区分启动阶段与后台工作：Redo 在接受连接前应用，未完成事务的部分回滚可在接受连接后继续。此时业务请求可能等待恢复事务持有的锁，所以服务开始接受连接不等于全部恢复工作已结束。

日志先于对应数据页持久化的思路可用 [[wal|WAL]] 理解；它允许数据页写回与事务提交分离。能承诺多强的持久性，还取决于提交时的日志持久化策略和存储可靠性，不能把「数据还在内存」与「事务必然丢失」简单画等号。

## Binlog 为什么还需要单独存在

[Binary Log](https://dev.mysql.com/doc/refman/8.4/en/binary-log.html)记录数据和表结构的变更事件，用于把变化传给副本，也用于恢复备份之后的增量变化。它通常不记录不修改数据的 SELECT，不能把它当作所有查询的执行日志。

两类日志的职责不同：**「Redo 服务 InnoDB 的崩溃恢复，Binlog 服务复制与增量恢复」**。对开启 Binlog 的 InnoDB 事务，还需要协调两者的提交状态；[[mysql-manual-commit|提交协调导读]]按官方手册与开发文档解释准备状态、组提交、同步参数和恢复判定。

## 复制解决什么，为什么仍需要备份

[Replication](https://dev.mysql.com/doc/refman/8.4/en/replication.html)说明源实例可向一个或多个副本复制，默认异步。按[复制线程](https://dev.mysql.com/doc/refman/8.4/en/replication-threads.html)的分工，源端发送 Binlog，副本接收并写入中继日志，再由应用线程执行。传输与应用是不同阶段，因此「源端提交」不能直接推出「副本已可读到」。

由此可推导，读写分离需要处理写后读到旧值的情况；**「复制也可能继续传播误操作，不能代替历史恢复能力」**。这是依据复制方式得到的应用边界，不是手册提供的某项延迟保证。

## 备份与时间点恢复

[时间点恢复](https://dev.mysql.com/doc/refman/8.4/en/point-in-time-recovery.html)先恢复一个完整备份，再应用备份之后的 Binlog，将状态推进到目标时刻。它需要可用备份、衔接正确且保留完整的日志，以及明确的恢复边界。

备份坐标、日志回放与停止位置的条件由[[mysql-manual-backup|备份与时间点恢复导读]]展开；时间过滤帮助定位事件，执行恢复时还需核对事件位置与完整事务边界。

例如要恢复误删前的状态，目标是找到对应的历史状态；重启实例执行崩溃恢复不会自动撤销已经正常提交的错误删除。磁盘损坏也不能只依赖同一磁盘上的 Redo。基础学习应先区分故障类型、所需材料与恢复目标，再讨论具体工具；本导读没有执行恢复演练。
