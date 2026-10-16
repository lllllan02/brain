---
title: "Dialogflow CX：类别、作用范围与参数收集"
category: "Agent"
tags: ["Agent", "意图识别"]
source:
  - "https://docs.cloud.google.com/dialogflow/cx/docs/concept/agent-design"
  - "https://docs.cloud.google.com/dialogflow/cx/docs/concept/intent"
  - "https://docs.cloud.google.com/dialogflow/cx/docs/concept/parameter"
read: false
created_at: "2026-10-13T22:09:24+08:00"
updated_at: "2026-10-14T13:59:35+08:00"
---

**Dialogflow CX 将理解请求、限制当前可走的流程、收集业务参数分开处理。** 意图说明用户想做什么，路由决定当前能进入什么流程，参数保存完成任务所需的信息。

本篇依据 2026-10-14 核对的官方设计、意图与参数文档，聚焦类别和多轮处理；未部署云端 Agent，不覆盖电话接入和完整产品配置。

## 整体怎样运行？

当前表达 → 在当前流程中匹配意图 → 收集缺少的参数 → 进入后续节点或调用业务服务

页面（Page）表示当前处理状态，流程（Flow）组织页面，路由（Route）按意图或条件选择下一步。需要动态数据时，webhook 将对话接到业务接口。例如退款流程应先补齐订单号，再查资格，不能仅凭识别到退款就直接执行。

## 类别怎样划分？

[意图文档](https://docs.cloud.google.com/dialogflow/cx/docs/concept/intent#training-phrases) 用训练表达说明每个意图，模型据此识别相近说法，无需逐句枚举。实体及参数标注则指出日期、订单号等信息。

类别应按用户目标区分：措辞不同但目标相同可放在一起，共有关键词却不代表目标相同。[设计指南](https://docs.cloud.google.com/dialogflow/cx/docs/concept/agent-design#intent-reuse) 允许复用通用肯定、否定意图，也允许按业务设置专用确认意图。

## 当前状态怎样限制匹配？

意图需关联到当前作用范围内的路由才参与匹配。候选分数达到阈值才命中，否则触发 no-match，即未匹配；取消意图也要接入相应状态才可用。[匹配与取消机制](https://docs.cloud.google.com/dialogflow/cx/docs/concept/intent#intent-matching)

因此「确认」可以在不同页面对应不同动作。可借鉴的设计是用当前任务限制可接受动作，而不是让所有意图随时生效。

## 没有匹配到，就增加样本吗？

先判断缺口：补充缺少的真实表达，清理本类偏离目标的例句，或删除其他类中造成混淆的例句。持续向一类追加样本可能造成不平衡。仅换标点、客套话或对象值，也不等于增加了有意义的表达覆盖。[训练数据设计](https://docs.cloud.google.com/dialogflow/cx/docs/concept/agent-design#handling-end-user-input)

官方数量建议因页面和复杂度而异：意图页给出至少 10–20 条，设计指南建议至少 20 条、大型 Agent 主要意图约 50 条。这些只是产品指导，不能保证效果。

默认负意图用例句表达「不属于任何正常意图」，影响整个意图库。为排除某一类添加的负例，也可能阻碍另一类；能力扩展后需复查。[默认负意图](https://docs.cloud.google.com/dialogflow/cx/docs/concept/intent#default-negative-intent)

## 参数怎样跨轮保存？

[参数机制](https://docs.cloud.google.com/dialogflow/cx/docs/concept/parameter) 区分三种职责：意图参数从当前表达抽取；表单参数声明要收集哪些字段；会话参数保存跨轮值。表单按顺序询问缺少的必填项，参数齐全后再继续，可选项不主动询问。

同名、同类型的会话值可以复用。例如此前提供过尺码，进入需要尺码与颜色的表单后，只需再问颜色；不应依赖一轮总能填齐多个字段。业务仍要判断旧值是否适用于当前任务，旧订单号不能自动视为本轮确认对象。

## 参数复用还受什么限制？

意图抽取可包含用户原文 `original` 与归一化值 `resolved`；会话参数只有复合值类型能保留两份表示，不能假定每个字段都有原文。`null` 表示未设置，空字符串表示已设置的字符串值。

流程参数与请求参数分别只在对应流程、请求中有效，跨轮保存应选择会话范围。[参数作用域](https://docs.cloud.google.com/dialogflow/cx/docs/concept/parameter#flow-scoped-parameters) 说明了这些边界；何时清理旧值、何时重新确认，仍需结合业务定义。
