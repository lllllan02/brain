---
title: "MySQL 官方手册导读：备份坐标与时间点恢复"
category: "MySQL"
parent: mysql-point-in-time-recovery
type: "article"
tags: ["MySQL", "binlog", "数据恢复"]
created_at: "2026-10-12T21:32:22+08:00"
updated_at: "2026-10-12T21:32:22+08:00"
source:
  - "https://dev.mysql.com/doc/refman/8.4/en/point-in-time-recovery.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/point-in-time-recovery-binlog.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/point-in-time-recovery-positions.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/mysqldump.html"
---

本篇节选 MySQL 8.4 手册的备份起点、日志回放、停止位置与逻辑备份一致性条件，用于理解恢复材料怎样衔接，不覆盖各物理备份工具的操作步骤。

## 从完整备份继续应用变化

[时间点恢复](https://dev.mysql.com/doc/refman/8.4/en/point-in-time-recovery.html)以恢复完整备份为起点，应用其后的 Binlog。[Binlog 回放说明](https://dev.mysql.com/doc/refman/8.4/en/point-in-time-recovery-binlog.html)使用 `mysqlbinlog` 将二进制事件转换为可执行输出，再交给 mysql 客户端应用。

需要跨多个日志文件时，手册要求按顺序在单个连接中应用；事件之间可能依赖会话状态，不能把每个文件随意分开执行。日志必须从备份记录的位置衔接，单有文件名或大致备份时间不足以判断应该从哪里继续。

加密 Binlog 不能直接按普通本地文件方式读取；手册说明可通过 `--read-from-remote-server` 从能够解密的服务器读取。因此离线保存日志时也要验证读取所需的密钥、服务或解密工具，而非只检查文件是否存在。

## 怎样选择停止边界

[按事件位置恢复](https://dev.mysql.com/doc/refman/8.4/en/point-in-time-recovery-positions.html)用误删 `pets.cats` 的例子演示：先查看日志，确定备份起点和错误事件之前的终点，再用 `--start-position`、`--stop-position` 应用所需区间。例子到停止位置之前结束，从而不执行误删。

手册明确建议日期时间选项用于寻找位置，实际恢复使用位置选项；仅按时间选择回放区间可能漏掉事件。对于由多事件组成的事务，还要核对完整事务边界，不能在行变更的中间截断。

由此得到的应用边界是：PITR 重建所选时点的状态；若要修复少量记录并保留之后的正常写入，需要另行比较恢复状态与当前状态。它不会自动替用户完成选择性合并。

## 备份一致性与验证边界

[mysqldump](https://dev.mysql.com/doc/refman/8.4/en/mysqldump.html)的 `--single-transaction` 用事务快照取得 InnoDB 的一致数据；它不能使 MyISAM、MEMORY 表也获得同样保证。备份期间并发的 ALTER、CREATE、DROP、RENAME、TRUNCATE 等 DDL 可能让结果失效。

`--source-data=2` 将备份对应的 Binlog 文件名和位置以注释写入输出；与 `--single-transaction` 配合时，开头仍会短暂取得全局读锁，用于协调坐标与备份状态。因此不能把「事务快照备份」概括为全过程绝不加锁，也不能用备份结束时另查的坐标替代它。

这些选项提供备份状态和恢复起点的依据，实际恢复仍需检查权限、GTID、所需数据库对象、日志连续性和目标环境。导读中的方法未在本项目执行；可恢复程度与耗时需以隔离环境中的完整演练确认。
