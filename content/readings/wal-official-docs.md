---
title: "WAL 官方文档导读：持久化顺序、提交与恢复"
category: "数据存储"
tags: ["数据库", "持久化"]
created_at: "2026-10-12T19:55:54+08:00"
updated_at: "2026-10-13T12:48:15+08:00"
source:
  - "https://www.postgresql.org/docs/16/wal-intro.html"
  - "https://www.postgresql.org/docs/16/wal-async-commit.html"
  - "https://www.postgresql.org/docs/16/wal-configuration.html"
  - "https://www.sqlite.org/wal.html"
  - "https://www.sqlite.org/fileformat2.html#wal_file_format"
  - "https://dev.mysql.com/doc/dev/mysql-server/8.4.11/PAGE_INNODB_REDO_LOG.html"
---

本篇节选 PostgreSQL 16、SQLite WAL 官方说明及 MySQL 8.4.11 开发文档中，与[[wal|预写日志]]的持久化顺序、提交和恢复直接相关的机制。不覆盖复制配置、完整日志格式或 SQLite 并发限制。

## 为何提交可以先于数据页写回

[PostgreSQL WAL 介绍](https://www.postgresql.org/docs/16/wal-intro.html)规定：**「数据文件中的修改只能在描述这些修改的 WAL 记录持久化之后写入」**。数据文件保存表与索引，日志保存恢复所需的修改信息，两者承担不同职责。

这使事务**「提交不必刷新全部修改过的数据页」**。崩溃后，尚未落实到数据文件的修改可以依据日志重做。收益来自写入组织方式：日志顺序追加，而事务可能触及分散的数据页；多个并发小事务还可以共用一次日志同步。WAL 减少的是提交所需的同步与分散写入成本，并没有取消后续数据页写入。手册特别指出，这对修改不同数据位置的多个小事务很有价值。

## 修改日志与提交记录能否一起刷盘

[PostgreSQL WAL Configuration](https://www.postgresql.org/docs/16/wal-configuration.html)区分记录插入与日志刷新：`XLogInsertRecord` 把记录放入共享内存中的 WAL 缓冲区，`XLogFlush` 则保证所需日志范围持久化，通常在提交时调用。缓冲区中的记录可以被批量写出，同步还可以覆盖多个事务的提交记录。

由此可知，修改记录与随后生成的提交记录可以由一次同步一起持久化；修改日志也可能在事务提交之前就已经持久化。刷盘批次与逻辑记录的职责是两个维度，不能因同批刷盘就把「描述修改」与「判定提交」合为一个概念。

结合下节同步提交先持久化、再返回成功的顺序，还可以推导出一个故障窗口：持久化已完成，但成功响应尚未送达时，事务结果可保留，客户端却可能不知道是否成功。这是对文档顺序的故障推演，并非恢复实验结果。

## 异步提交改变了什么

[PostgreSQL 异步提交说明](https://www.postgresql.org/docs/16/wal-async-commit.html)将「逻辑完成」与「日志持久化后确认」分开：通常同步提交等待事务 WAL 持久化后返回；异步提交可以提前返回，以换取更短的等待时间。

代价是**「返回成功到日志持久化之间存在丢失窗口」**。崩溃后，数据库只能依赖已经持久化的日志恢复，最近的事务可能消失。该模式仍维持恢复一致性所需的写入顺序；它与关闭 `fsync` 不同，后者取消关键同步可能在系统崩溃后造成数据损坏。因而「采用 WAL」不能独自推出「所有已确认事务都不会丢」。

## SQLite 如何让主文件暂时保持旧值

[SQLite How WAL Works](https://www.sqlite.org/wal.html#how_wal_works)从回滚日志作比较：回滚日志先保存旧内容，再修改数据库文件；WAL 则保留主文件内容，将修改追加到单独的 WAL 文件，通过提交标记表示事务完成。

按[文件格式](https://www.sqlite.org/fileformat2.html#wal_file_format)，WAL 由头部和一系列 frame 组成，每个 frame 带一个数据库页面及相关头信息。因此日志不一定只保存很小的字段差量。

读取时，读者先确定自己的提交边界，在该范围内优先寻找 WAL 中的页面版本，找不到才读主文件。检查点把 WAL 的内容转入主文件；若继续转入会影响仍在读取旧快照的读者，就要停在安全位置。主文件暂时没更新，并不意味着已提交数据不可读。

这里的提交标记解决逻辑事务边界，断电持久性还依赖同步配置，**「不能把追加记录直接等同于可靠落盘」**。

## InnoDB 如何落实日志先行

[InnoDB Redo 开发文档](https://dev.mysql.com/doc/dev/mysql-server/8.4.11/PAGE_INNODB_REDO_LOG.html)区分内存日志缓冲、写入日志文件与刷新到持久存储。脏页写回前，要保证覆盖该页修改的 Redo 已经刷新；崩溃后，Redo 用来补回尚未写入数据页的修改。

日志位置用 LSN（Log Sequence Number，日志序列号）描述，页所需日志的进度与日志已持久化进度配合，落实先后约束。数据页写回、检查点推进和旧日志空间复用相互关联；恢复还需处理未提交事务，相关职责已整理在[[mysql-manual-recovery#Redo 怎样参与本机恢复|MySQL 恢复导读]]。本篇只核对文档，未执行崩溃恢复实验。
