---
title: "Azure CLU：类别设计、None 意图与评估口径"
category: "Agent"
tags: ["Agent", "意图识别"]
source:
  - "https://learn.microsoft.com/en-us/azure/ai-services/language-service/conversational-language-understanding/concepts/best-practices"
  - "https://learn.microsoft.com/en-us/azure/ai-services/language-service/conversational-language-understanding/concepts/evaluation-metrics"
read: true
created_at: "2026-10-13T22:09:24+08:00"
updated_at: "2026-10-14T13:59:35+08:00"
---

**Azure CLU 把类别设计、模型评估和结果接受条件分开处理。** 先定义用户要做什么，再检查模型是否分对，最后判断当前分数是否足以进入业务。

本篇节选官方最佳实践与评估资料，依据 2026-10-13 核对内容，未调用 Azure 服务。

## 类别与参数怎样区分？

原文用取消不同订阅的例子说明：取消是意图，订阅对象是参数。新增对象时可以复用类别，避免类别无限膨胀。具体划分仍依业务定义，不存在统一标签表。

标注要一致且完整；需要评估参数抽取时，测试数据也要包含参数答案。修改类别或数据后，应查看哪类改善、哪类互相混淆，不能只看总分。

## 不支持或不确定的表达怎样处理？

None 表示不接受为正常业务意图。可以用样本教模型识别这类表达，也可以在最高分低于 `confidenceThreshold` 时触发；后者是分数阈值，需通过项目数据确定。

两种做法解决的问题不同：负例提供具体的能力边界，阈值规定结果接受条件。把容易误命中的域外表达标成 None，有助于提供前一种信息，但效果仍需验证。

## 为什么评估报告与线上结果可能不同？

文档说明测试集模型评估不应用 None 分数阈值。因此，控制台分类指标与部署后的回退结果要分别检查，调高阈值不能直接证明原模型报告中的表现改善。

评估分别统计意图与实体的查准率、查全率和 F1，它们衡量分类与抽取，不直接衡量退款等业务是否正确执行。资料也未给出可跨产品使用的最佳阈值。
