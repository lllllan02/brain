---
title: "Redis 官方文档：租约锁与限流原子操作"
category: "Redis"
tags: ["Redis", "分布式锁", "限流", "Lua"]
source:
  - "https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/"
  - "https://redis.io/docs/latest/commands/incr/"
  - "https://redis.io/docs/latest/develop/use-cases/rate-limiter/"
created_at: "2026-10-13T11:03:37+08:00"
updated_at: "2026-10-13T12:48:15+08:00"
---

本导读选取同一 Redis 状态内的条件更新，并区分它与外部业务正确性的关系。

## 锁的租约与所有者

[Distributed Locks](https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/)先讨论单实例：用 NX 与过期参数一起设置随机所有者 token，**「释放时比较 token 后删除」**，避免旧持有者误删新锁。新文档使用 Redis 8.4 起的 DELEX 示例，也保留旧版本 Lua 做法。

租约给出了持锁有效窗口。若任务执行超出窗口，原执行者未必停止；释放比较不能解决它继续写外部资源的问题。文档介绍的 Redlock 假定多个独立主节点，尝试在限定耗时内获得多数锁，并从剩余有效期判断成功，还依赖时钟漂移等条件；它不等同于向一个主从复制组加锁。

本文仅保留这些假设与操作边界，未将 Redlock 认定为任意外部资源的完整正确性方案。外部资源如何拒绝过期执行者仍是单独问题。

## 从计数器到限流器

[INCR 的限流示例](https://redis.io/docs/latest/commands/incr/)指出**「分离计数与过期设置会留下失败窗口」**：计数已增加，但客户端退出导致过期未设。把需要配合的步骤放进短脚本可以消除这一交错；窗口计数器依然具有窗口边界突发的业务特征。

[Rate limiter](https://redis.io/docs/latest/develop/use-cases/rate-limiter/)说明 Hash、ZSet 与 String 可承载不同限流状态，Lua 将读、判断、更新放到一起，避免并发使用同一份令牌。性能宣传不能替代测量，服务不可用时的放行或拒绝也需要由应用策略决定。

当前用例页对 Hash 字段过期使用了 Redis 8 的场景描述；命令参考将 HEXPIRE 的引入版本标为 7.4.0，版本判断应以命令参考为准。
