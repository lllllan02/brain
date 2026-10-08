---
title: "etcd"
category: "分布式系统"
updated_at: "2026-10-08"
tags: ["etcd", "Raft", "MVCC"]
aliases: ["etcd 事务", "etcd Watch"]
---

**etcd 是面向少量关键协调数据的分布式 KV 存储，提供事务条件比较、版本化读取、Watch 和 Lease。** 它适合注册、配置和选主，不适合充当大体量业务数据的通用存储。

- etcd 通过 [[raft|Raft]] 复制已提交的写入，多数投票节点不可用时不能继续正常提交。默认 KV 读取提供线性一致性；选 serializable 读取可以降低协调成本，但可能读到旧值。线性一致性也不意味着跨外部系统的操作自动原子化。
- **revision**：一次修改 key 空间的事务对应一个全局 revision，同一事务内多个 key 的修改共享它；每个 key 自己还有 version 等元数据。revision 用来衔接快照和增量，别和单个 key 的修改次数混淆。
- **Watch**：客户端可以先在版本 R 读快照，再从 R+1 开始 Watch；断线后从已处理的位置恢复，所需历史被压缩时重新读快照。**Watch 通知不是永不丢历史的消息队列**，消费者必须维护恢复逻辑。
- **Lease**：给一组 key 绑存活期，续约停止且租约到期后关联 key 被删除。把同一个 key 无条件 Put 并绑 Lease，**并不等于获得互斥锁**；[[distributed-locks|锁]] 还需要事务或并发库协议，外部写入要防范旧持有者。

版本与事务接口见 [etcd API](https://etcd.io/docs/v3.6/learning/api/)，读取和 Watch 的边界见 [API guarantees](https://etcd.io/docs/v3.6/learning/api_guarantees/)。
