---
title: "Canal 如何订阅 MySQL binlog 并确认消费？"
category: "数据同步"
updated_at: "2026-10-07"
tags: ["Canal", "MySQL", "binlog"]
---

Canal 模拟 MySQL 副本协议读取 binlog，再把变更解析成下游可消费的事件。它提供增量订阅能力，业务如何应用、去重和核对数据仍由消费链路负责。

一个 Canal Instance 对应一组源端订阅配置，客户端通常通过 destination 选择实例。内部解析、过滤、缓冲与位点管理共同完成从 binlog 到客户端的传递；源端权限、日志格式与保留周期必须满足所用版本要求。

客户端可以先取一批但不自动确认，完成下游处理后再 ack。处理成功、ack 前崩溃会导致重复，因此下游写入必须幂等。rollback 让消费进度回退以便重取，不会回滚已经提交到业务数据库的修改。

同一批中包含多个表或多行变化时，需要保留操作类型和主键，并理解事务边界。更新与删除不能只依赖 after 中的展示字段；目标系统还需要正确的键与版本规则。

高可用部署可借助协调服务管理活动实例与位点，避免同一订阅被无约束地并行推进。即使切换正常，重放也可能产生重复；GTID 等源标识也不能随意当作跨库统一业务顺序。

Canal 的增量订阅不能自动补齐全部历史存量。初次构建下游仍需要 [[cdc|快照与增量衔接]]，并在日志丢失或数据偏差时设计重建路径。

机制见 [Canal Introduction](https://github.com/alibaba/canal/wiki/Introduction)，确认接口见 [Client Example](https://github.com/alibaba/canal/wiki/ClientExample)。
