---
title: "分布式锁"
category: "分布式系统"
updated_at: "2026-10-08"
tags: ["分布式锁", "Redis", "etcd", "ZooKeeper"]
aliases: ["Fencing Token", "Redlock"]
---

**分布式锁协调多个执行者对同一资源的访问。** 选型先看锁保护什么、能不能和事务合并，以及失去锁后旧执行者继续运行会有什么后果——关键数据仍要靠唯一约束、状态条件或资源端版本校验兜底。

| 方案 | 工作方式 | 主要边界 |
|---|---|---|
| 数据库行锁 | 事务中锁住待修改记录 | 连接与锁持续占用，适合保护同库数据 |
| 唯一键锁记录 | 靠唯一插入竞争资格 | 要处理释放、过期和旧持有者 |
| Advisory Lock | 用数据库提供的命名锁 | 连接级或事务级生命周期依产品而异 |
| Redis | `SET key owner NX PX ttl` | 延迟较低；租约过期、复制切换可能破坏互斥 |
| ZooKeeper | 临时顺序节点，最小编号持锁 | Session 到期后释放；断线不等于立即过期 |
| etcd | 原子竞争 + Lease + Revision + Watch | 依赖多数派与客户端正确处理租约失效 |
| Consul | Session + KV acquire/release | 要理解会话失效、锁延迟与一致性配置 |

如果只是为了同一订单串行处理，也可以评估按 Key 的队列分区或数据库条件更新，减少跨系统持锁。

**加锁、续期、释放分别保证什么**：

- Redis 获取锁必须把「不存在才创建」和 TTL 放进同一条原子命令；owner 用本次加锁的唯一值，续期和释放都要原子核对 owner，防止旧任务删掉新持有者的锁。看门狗只缓解正常长任务到期，消除不了网络中断和进程暂停。
- [[zookeeper|ZooKeeper]] 让等待者监听前驱节点，避免全体同时惊醒；收到变化仍要重新检查资格。
- [[etcd|etcd]] 的普通 Put 绑 Lease 只是写入可过期键，**并不构成互斥锁**，要用事务竞争或官方 concurrency.Mutex。
- [[consul|Consul]] 的 Session 也要配合 acquire 的原子结果。

**为什么租约过期还会并发写**：A 持锁后长暂停、租约过期；B 拿到新锁并写入；A 恢复后仍可能继续把旧操作发给数据库——锁服务撤不回 A 已经或将要发出的请求。**Fencing** 为每次持锁资格分配单调递增 token，由资源端记住已接受的最高值、拒绝更旧的 token；资源端不检查 token，fencing 就没有效果。

Redlock 用多个独立 Redis 节点降低单点影响，但依赖时间与故障假设，不能据此宣称任意暂停或分区下业务都正确。严格场景要资源端校验、幂等和事务约束一起成立。

参考：[Redis 分布式锁](https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/)、[etcd 并发 API](https://etcd.io/docs/v3.6/dev-guide/api_concurrency_reference_v3/)，以及 [Martin Kleppmann 对锁正确性的分析](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html)（其对 Redlock 的评价应连同故障模型一起读）。
