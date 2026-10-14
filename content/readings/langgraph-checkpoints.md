---
title: "LangGraph：检查点怎样保存执行进度"
parent: agent-checkpoint-recovery
category: "Agent"
tags: ["Agent", "Checkpoint", "持久化"]
created_at: "2026-10-13T10:59:51+08:00"
updated_at: "2026-10-13T12:48:15+08:00"
source:
  - "https://docs.langchain.com/oss/python/langgraph/persistence"
  - "https://docs.langchain.com/oss/python/langgraph/checkpointers"
reading_suggestions:
  - agent-resume-failure
  - langgraph-time-travel
---

**「LangGraph 把执行进度保存为线程内的图状态，并用检查点恢复后续调度。」** 本文节选官方持久化文档中的保存对象、提交时机与故障恢复，按 2026-10-13 页面核对；未运行 Python SDK。

## 为什么保存消息还不够？

[Persistence](https://docs.langchain.com/oss/python/langgraph/persistence) 区分 Checkpointer 与 Store：前者保存单一线程的运行状态，后者保存跨线程复用的应用数据。用户偏好可放 Store；「这次运行还要执行哪个节点」属于 Checkpointer。示例里的内存实现随进程退出丢失，跨进程恢复需要数据库或文件后端。

## 什么算一个完整检查点？

[Checkpointers](https://docs.langchain.com/oss/python/langgraph/checkpointers) 中，`thread_id` 定位线程，`checkpoint_id` 定位其中一个快照。`StateSnapshot` 保存状态值 `values`、后续节点 `next`，以及任务的错误和中断信息。

**完整快照在「超级步（super-step）」边界形成**：同一轮被调度的节点可并行执行。若 A 成功、B 失败，A 已保存的节点输出可用于恢复，避免重新计算 A；这些 pending writes 与完整快照不是同一种记录。

## 保存时机为什么影响保证？

| 模式 | 持久化时机 | 代价与边界 |
| --- | --- | --- |
| `sync` | 下一步开始前完成写入 | 增加等待，保存边界清楚 |
| `async` | 保存与下一步并行 | 崩溃可能丢失尚未写完的进度 |
| `exit` | 成功、错误或人工中断退出时保存 | 中途进程崩溃时没有相应中间进度 |

因此，配置了存储后端后，还要核对提交时机。检查点也不与外部业务操作自动组成事务；[[agent-resume-failure|恢复时的重复执行]]用故障窗口解释这部分边界。

**「指定旧检查点继续会再次执行后续节点」**；主动回看历史与从最新失败处恢复的目的不同，[[langgraph-time-travel|重放与分叉导读]]保留前者的示例和边界。
