---
title: "Binlog 数据恢复"
category: "MySQL"
updated_at: "2026-10-09"
tags: ["binlog", "数据恢复", "go-mysql"]
type: "practice"
aliases: ["binlog 回滚", "误删恢复"]
---

**[[mysql-binlog|Binlog]] 恢复先定位误操作涉及的事务与行变化，再生成候选补偿 SQL。** 能不能还原，取决于日志格式、行镜像、表结构历史和误操作之后的合法更新——**生成成功不等于可以直接执行**。

**生成逆向操作需要什么**：行日志里 INSERT 对应删除新增行，DELETE 对应插回旧行，UPDATE 要把相关字段恢复到旧值。**缺少旧行镜像时无法凭空重建原值**；DDL、表结构变更和特殊字段也要确认工具支持。事务范围与逆序处理不能用粗糙的时间过滤代替。

[my2sql](https://github.com/liuhr/my2sql) 提供正向 SQL、回滚 SQL 与统计模式：`-mode file` 选本地文件解析，`-work-type rollback` 选生成回滚 SQL，两者职责不同。文件模式不自动保证脱离数据库：要核对所用版本怎么取得列名、类型和历史表结构。也可参考 [bingo2sql](https://github.com/hanchuanchuan/bingo2sql)，不依据未经复现的性能数字排序。

**避免覆盖后续正确数据**：先保全日志与备份，在隔离恢复环境里确定受影响主键、事务顺序和目标状态，再审查生成 SQL 的条件、旧值、行数和约束。误操作之后已有合法更新时，直接逆向整段日志可能把那些更新也撤掉——要逐行比较当前状态，或用「备份 + 日志的时间点恢复」后提取所需数据。恢复后核对业务不变量与派生系统，[[cdc|CDC]] 链路可能继续传播变化。

**定制解析工具还要补什么**：[go-mysql](https://github.com/go-mysql-org/go-mysql) 的 replication 包能读复制流或解析本地日志，canal 包在其上组织增量同步；解析出事件后仍要自己处理表结构、事务边界、位点、字段类型和 SQL 转义，别把底层解析器当完整恢复方案——它的 canal 包也不等于 Alibaba 的 [[canal|Canal 服务]]。
