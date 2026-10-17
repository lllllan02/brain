---
title: "Redis 官方文档：Sentinel 与 Cluster"
category: "Redis"
tags: ["Redis", "Sentinel", "Cluster", "故障切换"]
source:
  - "https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/"
  - "https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/"
created_at: "2026-10-13T11:03:37+08:00"
updated_at: "2026-10-13T12:48:15+08:00"
---

这两份官方说明分别讨论非分片部署的自动故障接替和带槽分片的集群。以下节选故障判断、客户端行为与写入安全，不覆盖完整配置手册。

## Sentinel 的判定与授权

[Sentinel 配置说明](https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/#configuring-sentinel)将 quorum 用于判定主节点不可达，而**「故障转移执行者还需获得 Sentinel 多数授权」**。原文用 5 个 Sentinel、quorum 为 2 说明区别：2 个可以同意故障，至少 3 个可达才具备多数授权条件。

文档同时要求把 Sentinel 分散到独立故障域，并使用支持 Sentinel 的客户端。切换不仅是提升副本，还包括其他副本重配和客户端发现。异步复制下，回复过的写入仍可能在切换后丢失；多部署几个监控进程不会改变这一数据传播窗口。

## 槽路由与迁移

[Cluster Specification](https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/)把 **「key 到固定槽的映射与槽到节点的映射分开」**。迁移改变后者，多 key 操作通常要求同槽，hash tag 用于主动共置；使用它时也会集中负载。

客户端缓存槽表并直连目标。规范区分两种重定向：MOVED 表示应调整槽路由，ASK 只要求本次请求临时发给另一节点，并先发 ASKING。迁移期间同槽数据可能分散在两端，多 key 操作也可能暂时不可用，所以「同槽」不是迁移过程中的无条件成功保证。

集群使用异步复制和故障接替，优先保留可扩展性与一定的可用性。其规范明确承认已确认写入的丢失窗口，不提供通用跨槽事务或任意网络分区下的强一致可用性。部署参数、槽覆盖和副本分布要结合具体故障验证。
