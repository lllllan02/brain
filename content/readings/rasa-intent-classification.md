---
title: "Rasa 与 scikit-learn：意图分类的样本、特征与预测"
category: "Agent"
tags: ["Agent", "意图识别"]
source:
  - "https://legacy-docs-oss.rasa.com/docs/rasa/nlu-training-data/"
  - "https://legacy-docs-oss.rasa.com/docs/rasa/components/"
  - "https://scikit-learn.org/stable/modules/feature_extraction.html"
  - "https://scikit-learn.org/stable/modules/linear_model.html#logistic-regression"
read: false
created_at: "2026-10-13T17:38:22+08:00"
updated_at: "2026-10-13T17:38:22+08:00"
---

**意图分类需要把「输入文字」转换成「类别判断」：开发者定义标签和样本，特征组件把文本变成数字，分类器据此输出候选。** 本篇节选 Rasa Open Source 3.x 旧版文档的 NLU 部分，并用 scikit-learn 官方文档解释数字表示与线性分类；不覆盖 Rasa 的完整对话策略，也不是当前产品安装教程。

## 样本先说明要学会什么

[NLU Training Data](https://legacy-docs-oss.rasa.com/docs/rasa/nlu-training-data/#training-examples) 将用户表达按 intent 分组。标签描述用户要完成的目标；实体则是句子内部的结构化信息。要学习实体，需要相应标注，或采用适合其字符格式的规则提取。

两者的数据职责不同：整句属于哪个意图，与句中哪一段是账号、时间等字段，是不同的监督信息。同义词映射发生在实体提取之后，不能代替识别实体。正则也有两种用法：`RegexFeaturizer` 给模型增加命中特征；`RegexEntityExtractor` 按字符模式提取实体。**「正则作为特征」不等于正则一命中就决定意图。**

## 文本怎样变成数字

scikit-learn 的 [Text feature extraction](https://scikit-learn.org/stable/modules/feature_extraction.html#text-feature-extraction) 先说明：一般分类器接收固定维度的数字，原始文本需先向量化。词袋（Bag of Words）给词表中的每个词一列，每条文本一行，填入出现次数；多数值为零，可以稀疏存储。

训练时 `fit_transform` 建立词表并转换数据，预测时 `transform` 复用词表。新文本里不在词表中的词会被忽略。官方例子中，词相同但语序不同的陈述句与疑问句得到相同向量；加入连续两个词的组合（bigram）可以保留部分局部顺序。字符组合能缓解拼写差异，但这些表示仍不保留完整句法。

TF-IDF 在计数之上调整权重，降低许多文档都含有的常见词的影响；它负责表示文本，并不会独自决定类别。

## 分类器怎样利用这些数字

[逻辑回归文档](https://scikit-learn.org/stable/modules/linear_model.html#logistic-regression) 将其定义为分类用的线性模型。训练根据已有标签优化权重，让正确类别得到更高的预测概率，同时以正则项约束权重。多分类形式给各类别计算线性分数，再通过 softmax 转成总和为 1 的概率。预测复用学到的参数，不重新学习每条新消息。

Rasa 的 [Components](https://legacy-docs-oss.rasa.com/docs/rasa/components/#intent-classifiers) 展示了不同实现：

- `KeywordIntentClassifier` 以训练例句作为完整关键词做精确字符串匹配，文档限定其适合小项目或起步用途。
- `LogisticRegressionClassifier` 使用稀疏特征，也可使用提供的稠密特征，返回 `intent` 与 `intent_ranking`。
- `DIETClassifier` 共享 Transformer 做意图分类和实体识别，将句子和意图标签放到同一向量空间，通过训练拉近正确标签、拉远负样本；实体由另一标注层预测。它可使用外部预训练表示，但自身不提供预训练语言模型。

这些组件说明「固定标签分类」可以采用不同算法，并不限于关键词匹配。文档的接口与架构解释不能证明某个模型在中文退款业务上的效果；标签设计、样本覆盖和测试仍需面向实际业务完成。
