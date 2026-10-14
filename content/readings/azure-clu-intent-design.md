---
title: "Azure CLU：类别设计、None 意图与评估口径"
category: "Agent"
tags: ["Agent", "意图识别"]
source:
  - "https://learn.microsoft.com/en-us/azure/ai-services/language-service/conversational-language-understanding/concepts/best-practices"
  - "https://learn.microsoft.com/en-us/azure/ai-services/language-service/conversational-language-understanding/concepts/evaluation-metrics"
read: false
created_at: "2026-10-13T22:09:24+08:00"
updated_at: "2026-10-13T22:09:24+08:00"
---

**Azure CLU 将类别设计与模型评估放在同一条迭代路径上：先明确动作和参数，再用错误分布修正边界。** 本文节选两份官方资料，核对日期为 2026-10-13，未调用 Azure 服务。

## 怎样设计类别？

Best practices 用取消不同订阅的例子说明：可以把取消定义为意图，把产品作为实体，这样增加产品时不必复制整套动作类别。文档也允许其他组织方式，要求设计保持一致；并不存在脱离业务的唯一标签表。

标注应一致且完整，测试数据也需要实体标注，否则指标不能反映实际提取质量。判断模型是否改善，要查看具体类别和混淆，不能只看总体得分。

## None 与阈值怎样影响结果？

None 既可通过样本学习，也可由最高分低于 `confidenceThreshold` 触发。把容易误命中的域外表达标成 None，能够提供更具体的负例；阈值应依据当前项目的预测观察确定。

文档特别注明：**「测试集模型评估不应用 None 分数阈值。」** 因此控制台分类指标与部署后应用阈值的路由行为要分别验证，不能改完阈值就引用原模型报告宣称回退已改善。

评估资料分别计算意图和实体的 precision、recall、F1。它们回答分类或提取问题，不直接衡量退款是否正确执行，也不提供可跨产品复用的最佳阈值。
