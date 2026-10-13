---
title: "LangSmith：离线实验、线上评测与人工反馈"
category: "Agent"
tags: ["Agent", "评测"]
created_at: "2026-10-13T10:53:04+08:00"
updated_at: "2026-10-13T12:48:15+08:00"
source: ["https://docs.langchain.com/langsmith/evaluation-concepts", "https://docs.langchain.com/langsmith/evaluation-types"]
---

LangSmith **「用数据集组织离线实验」**，**「以生产 Trace 承接线上评分和人工反馈」**。本文节选 2026-10-13 官方概念与评测类型文档，未运行 SDK，也不比较商业套餐。

## 为什么离线与线上需要不同输入？

[评测概念](https://docs.langchain.com/langsmith/evaluation-concepts) 将样本输入、可选参考输出与实际运行结果分开。数据集上的实验可比较不同版本，评分器读取样本及运行证据，给出可追溯的反馈。参考输出可帮助判断正确性，但不是所有质量维度都需要唯一标准答案。

[评测类型](https://docs.langchain.com/langsmith/evaluation-types) 区分离线回归、成对比较与线上评测。线上通常没有预先标注的正确输出，适合检测异常、观察质量趋势和发现边界案例；这些结果可以成为离线数据集的候选。

## 不同评分器承担什么？

代码评分器检查结构和明确规则；模型裁判处理语义质量；成对评测比较两个输出；汇总评分器在实验级计算整体指标。人工评审用于判断分歧和校准自动评分。

产品能够把输入、执行记录和评分关联起来，但**「不会自动使参考答案正确」**。把线上差评转为测试时，应补齐预期结果和环境；线上自动评分与业务完成情况之间的对应关系，也需人工或真实业务结果验证。这些是应用该工作流时的边界，不能把监控分数直接当作用户成功率。
