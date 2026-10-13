---
title: "Redis 官方文档：消息保留、确认与接管"
category: "Redis"
tags: ["Redis", "消息队列", "幂等"]
source:
  - "https://redis.io/docs/latest/develop/pubsub/"
  - "https://redis.io/docs/latest/develop/data-types/streams/"
  - "https://redis.io/docs/latest/develop/use-cases/streaming/"
created_at: "2026-10-13T11:03:37+08:00"
updated_at: "2026-10-13T11:03:37+08:00"
---

本导读围绕断线与消费者失败后的处理，Stream 部分采用 7.2 可用的 XREADGROUP、XACK、XPENDING 和 XAUTOCLAIM 语义；不将 `latest` 中新增的确认或删除选项套入旧版本。

## 通知与可保留记录

[Pub/Sub](https://redis.io/docs/latest/develop/pubsub/)说明消息采用至多一次投递：订阅者断线或无法处理时，消息不会因此保留并稍后重发。它适合允许丢失的实时通知，可靠待办需要另一种保留与恢复机制。

[Streams](https://redis.io/docs/latest/develop/data-types/streams/)提供带 ID 的追加记录。消费组跟踪消息交给谁以及是否确认，同一 Stream 可有多个独立组。XACK 清理该组的待确认引用，不等于删除正文；裁剪与其他组的进度需要单独管理。新文档还列出 8.2 以后的删除控制，读取时应留意版本。

## 接管解决什么，不能解决什么

[Streaming 用例](https://redis.io/docs/latest/develop/use-cases/streaming/)将「消费 → 完成工作 → 确认」串起来，并用 XCLAIM/XAUTOCLAIM 重新分配空闲过久的待处理消息。应用需要执行这一恢复逻辑，并决定重试次数与失败隔离；领取过消息不等于业务已经提交。

由这个顺序可以推导：业务完成而确认丢失时，恢复会带来重复机会；提前确认则可能失去未完成任务。文档机制不能替外部数据库提交，两者之间需要业务 ID、幂等处理和恢复记录。本文没有执行消费者崩溃实验。
