---
title: "Graphiti：随时间变化的事实图"
parent: agent-memory-storage
category: "Agent"
tags: ["Agent", "记忆", "检索"]
created_at: "2026-10-12T23:24:47+08:00"
updated_at: "2026-10-12T23:24:47+08:00"
source:
  - "https://github.com/getzep/graphiti"
  - "https://github.com/getzep/graphiti/blob/main/graphiti_core/edges.py"
---

**Graphiti 将输入组织为带来源与时间的实体关系图，重点解决“关系发生变化后，怎样同时查询当前事实与历史事实”。** 本文依据 2026-10-12 项目 README；源码仅核对图分区等数据结构，未固定提交、未运行图数据库。

[项目说明](https://github.com/getzep/graphiti#what-is-a-context-graph) 中，episode 保留输入证据，entity 表达人物、组织等对象，fact／relationship 表达对象之间的关系。事实有有效时间窗口，变化时让旧事实失效而保留历史；查询组合语义、关键词和图关系。

用一个假设例子理解：员工从团队 A 调到团队 B，直接覆盖团队字段能回答“现在在哪”，却难以回答“上个月在哪”。保留关系及其有效区间后，两类问题可以采用不同时间条件。系统收到消息的时间和事实发生的时间也可能不同。

**这种表示适合时间变化与实体关系本身就是查询条件的业务。** 它也带来实体消歧、关系抽取、时间解释和图存储维护的工作；语言模型生成了关系，不代表关系必然正确。简单固定偏好未必需要图。

Graphiti 是开源框架，Zep 是包含周边治理能力的托管产品。README 中的延迟与效果描述属于项目方陈述，本次没有同条件复测，也不据此给它与其他记忆产品排性能名次。
