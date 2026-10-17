---
learning_status: organized
parent: agent-context
title: "上下文按需加载"
aliases: ["Just-in-Time Context", "上下文外置", "外部存储与按需加载"]
category: "Agent"
tags: ["上下文管理", "按需加载"]
created_at: "2026-10-09"
updated_at: "2026-10-17T20:41:58+08:00"
reading_suggestions:
  - agent-loading
  - history-storage
  - context-budget
  - deepagents-context-offloading-summary
learning_status_changed_at: "2026-10-17T20:48:08.137+08:00"
---

**上下文按需加载（Just-in-Time Context）是将任务资料保留在模型窗口外，需要时再读取相关部分的机制。** 长日志、文档和旧历史无须每轮完整带入，但上下文中要保留能找到它们的入口。这里聚焦资料获取，其他加载对象属于更广的 [[agent-loading|Agent 按需加载]]。

## 资料入口与已读内容怎样配合？

完整原文由程序保存在文件或数据库中。模型可见的上下文中保留资料元数据：用途说明帮助判断要读什么，文件路径或带资料源的记录 ID 指向原文；已读范围、分页游标等信息帮助确定下一次从哪里取。[[anthropic-context-engineering-summary|Anthropic 的动态检索思路]]利用目录、名称等线索逐步定位材料。

工具取回片段后，应让模型同时看到**「本次内容」及其「来源与范围」**，避免内容失去出处、下次又从头搜索。[[deepagents-context-offloading-summary|Deep Agents]]用预览与文件路径承接外置结果，并提供搜索和分段读取；可按工具约定组织这些信息，不要求统一的元数据格式。

![[assets/context-loading-retrieval.png|当前上下文同时保留资料元数据与本次取回的原文；下次根据路径和已读范围继续读取窗口外的同一份文件]]

需要补读时，模型从上下文中的元数据取得位置，再调用工具读取相关范围；可以继续读后文，也可以重新搜索其他片段。路径或 ID 必须出现在模型可见的入口中，仅保存在程序内部不足以让模型主动发起回查。[[manus-context-engineering-summary|Manus 的可恢复思路]]强调省略原文时仍留下读取入口。

[[context-compaction|压缩]]可以用摘要替代旧历史，但应保留仍需回查的资料入口；有[[history-storage|已保存的原文与定位信息]]，才能按需补回细节。已读范围只记录取过什么，不保证片段经过后续压缩后仍在窗口中。

## 使用边界

核心目标、必要约束应直接提供；已知必需且较小的资料也可直接加载，避免反复查找。路径须可访问，要求原样回查时还需固定版本或快照，文件变化后旧行号可能失效。

元数据与返回片段都占用[[context-budget|上下文预算]]，检索也可能遗漏信息、增加等待。应检查能否凭入口找回所需证据并继续任务，以及总耗时与成本是否合算。
