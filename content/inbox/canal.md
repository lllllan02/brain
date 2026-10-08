---
title: "Canal"
category: "数据同步"
updated_at: "2026-10-08"
tags: ["Canal", "MySQL", "binlog"]
aliases: ["Canal 使用", "binlog 订阅"]
---

**Canal 模拟 MySQL 副本协议读取 binlog，把变更解析成下游可消费的事件。** 它提供的是增量订阅能力；业务怎么应用、去重、核对数据，仍由消费链路负责。

- 一个 Canal Instance 对应一组源端订阅配置，客户端通常用 destination 选实例。源端的权限、日志格式和保留周期必须满足所用版本的要求。
- 客户端可以先取一批但不自动确认，下游处理完再 ack。**处理成功、ack 前崩溃会导致重复**，所以下游写入必须幂等。rollback 让消费进度回退以便重取，但不会回滚已经提交到业务库的修改。
- 同一批里可能包含多个表或多行变化，要保留操作类型和主键，并理解事务边界；更新和删除不能只依赖 after 里的展示字段。
- 高可用部署可以借助协调服务管理活动实例和位点，避免同一订阅被无约束地并行推进；即使切换正常，重放仍可能重复，GTID 等源标识也不能随意当跨库统一业务顺序。

**增量订阅不能自动补齐全部历史存量**：初次构建下游仍要做 [[cdc|快照与增量的衔接]]，并在日志丢失或数据偏差时设计重建路径。

机制见 [Canal Introduction](https://github.com/alibaba/canal/wiki/Introduction)，确认接口见 [Client Example](https://github.com/alibaba/canal/wiki/ClientExample)。
