---
title: "SGD：用能力描述组织意图、参数与对话状态"
category: "Agent"
tags: ["Agent", "意图识别", "状态管理"]
created_at: "2026-10-13T17:27:45+08:00"
updated_at: "2026-10-13T17:38:42+08:00"
source: "[The Schema-Guided Dialogue Dataset](https://github.com/google-research-datasets/dstc8-schema-guided-dialogue)"
read: false
---

**「任务类型、参数和当前对话状态需要分别表示。」** Google 的 Schema-Guided Dialogue（SGD）数据集提供了这种结构。本导读聚焦官方 README 的 Schema Representation 与 Dialogue Representation，不总结全部基准实验。

## 如何描述系统能做什么？

服务的 schema 列出意图（Intent）及槽位（Slot，即参数），并提供自然语言描述。意图还区分必填、可选和结果槽位，以及是否属于交易操作。这样，识别任务类型后仍可判断执行所需信息是否齐全。

## 如何表示一轮对话？

每轮按服务组织为 frame；用户轮的 state 包括当前意图 `active_intent`、用户询问的字段 `requested_slots` 和已知值 `slot_values`。系统动作区分请求补充、确认和报告结果，服务调用另行记录方法与参数。

**当前句子提到了什么，与对话至今知道什么，是两份表示。** `frame.slots` 用字符起止位置标出当前句中的非枚举槽位；`frame.state` 表达此时的对话状态。前者能定位原话，后者可保留此前已提供、这一轮没有重说的值。非枚举槽位在 `slot_values` 中的字符串列表表示同一值的不同说法，例如「下午六点」与「18:00」，不能当成多个独立任务对象。

用户动作还区分提供信息、询问、肯定、否定及接受或拒绝系统提出的意图。因此识别到一个订单号之类的片段，只完成了内容定位；还要判断用户是在提供、纠正还是否定它。README 定义了这些标注及服务调用结构，没有给出适用于所有业务的状态合并算法。

**「用户询问的字段」与「系统缺失的必填参数」含义不同。** 后者需要结合意图定义和已知值判断，不能直接照搬 `requested_slots`。

## 这种结构怎样接受检验？

评估集包含未见服务或领域；SGD-X 还用语义相近、措辞不同的 schema 测试描述变化的影响。这提示能力描述本身也会影响理解。

该数据集服务于任务型对话，不是通用 Agent 的完整目标或权限模型；字段可供设计参考，不能直接当成执行授权。仓库在 2026-04-19 归档，仍可作为静态资料读取。
