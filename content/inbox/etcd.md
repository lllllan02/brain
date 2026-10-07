---
title: "etcd 怎样保存与通知协调状态？"
category: "分布式系统"
updated_at: "2026-10-07"
tags: ["etcd", "Raft", "MVCC"]
---

etcd 是面向少量关键协调数据的分布式 KV 存储，提供事务条件比较、版本化读取、Watch 和 Lease。它适合注册、配置和选主，不适合作为大体量业务数据的通用存储。

etcd 通过 [[raft|Raft]] 复制已提交的写入，多数投票节点不可用时不能继续正常提交。默认 KV 读取提供 [[linearizability|线性一致性]]；选择 serializable 读取可以降低协调成本，但可能读到旧值。线性一致性并不意味着跨外部系统的操作也自动原子化。

一次修改 key 空间的事务对应一个全局 revision，同一事务内多个 key 的修改共享该 revision；每个 key 自己还有 version 等元数据。revision 用来衔接快照和增量，不能与单个 key 的修改次数混淆。

客户端可以先在版本 R 读取快照，再从 R+1 开始 Watch。断线后从已处理的位置恢复；如果所需历史已被压缩，应重新读取快照。Watch 通知不是永不丢历史的消息队列，消费者必须维护恢复逻辑。

Lease 给一组 key 绑定存活期，续约停止且租约到期后关联 key 会被删除。把同一个 key 无条件 Put 并绑定 Lease，并不等于获得互斥锁；[[distributed-locks|锁]] 还需要事务或并发库协议，外部写入需要防范旧持有者。

版本与事务接口见 [etcd API](https://etcd.io/docs/v3.6/learning/api/)，读取和 Watch 的边界见 [API guarantees](https://etcd.io/docs/v3.6/learning/api_guarantees/)。
