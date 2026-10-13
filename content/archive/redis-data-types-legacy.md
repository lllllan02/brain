---
title: "Redis 数据类型（Data Types）"
category: "Redis"
updated_at: "2026-10-07"
tags: ["Redis", "数据结构"]
aliases: ["Redis 数据类型", "Redis data types"]
---

**Redis 的 value 有明确类型，选型要看要解决什么问题。** 常见类型与注意点：

| 类型 | 适用问题 | 需要注意 |
| --- | --- | --- |
| String | 缓存值、计数、带过期时间的标记 | 字符串内容由 SDS 管理；大值增加网络与内存成本 |
| Hash | 对象的多个字段 | 小对象紧凑编码与字典编码的成本不同 |
| List | 两端操作、简单队列 | 完整消息可靠性需额外协议 |
| Set | 去重、成员关系、集合运算 | 大集合操作可能占用执行时间 |
| Sorted Set | 排名、按分数查范围 | 排行榜还需解决事件去重与口径 |
| Stream | 追加事件、消费组 | 需设计确认、待处理恢复和保留策略 |

类型语义见 [Redis Data types](https://redis.io/docs/latest/develop/data-types/)。
