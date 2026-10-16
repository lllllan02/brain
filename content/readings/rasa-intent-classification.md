---
title: "Rasa 与 scikit-learn：意图分类的样本、特征与预测"
category: "Agent"
tags: ["Agent", "意图识别"]
source:
  - "https://legacy-docs-oss.rasa.com/docs/rasa/nlu-training-data/"
  - "https://legacy-docs-oss.rasa.com/docs/rasa/components/"
  - "https://scikit-learn.org/stable/modules/feature_extraction.html"
  - "https://scikit-learn.org/stable/modules/linear_model.html#logistic-regression"
  - "https://scikit-learn.org/stable/modules/generated/sklearn.feature_extraction.text.TfidfVectorizer.html"
  - "https://scikit-learn.org/stable/modules/generated/sklearn.linear_model.LogisticRegression.html"
read: false
created_at: "2026-10-13T17:38:22+08:00"
updated_at: "2026-10-14T13:59:35+08:00"
---

**文本分类把用户的一句话转换成预设类别：先把文字变成可计算的表示，再由模型计算各类分数。** 训练时用正确标签调整模型，预测时复用训练结果。

本篇依据已核对的 Rasa Open Source 3.x 旧版 NLU 文档与 scikit-learn 官方资料，说明样本、文字表示和分类的分工；不作为当前 Rasa 安装指南。

## 三部分怎样配合？

带标签的表达 → 提取文字特征 → 训练分类模型；新表达则沿用相同特征转换，由已训练的模型预测。

[NLU Training Data](https://legacy-docs-oss.rasa.com/docs/rasa/nlu-training-data/#training-examples) 按意图组织例句。意图回答整句话要做什么，实体标注指出订单号等信息位于哪里；两种任务需要不同的标注。实体抽取后的同义词映射只负责统一写法，不能代替抽取。

## 文字怎样变成可计算的表示？

[文本特征提取](https://scikit-learn.org/stable/modules/feature_extraction.html#text-feature-extraction) 用词袋说明：词表中的每个词占固定一列，每句话填入各词的次数。这样得到的一行数字称为向量，多数位置为零时可采用稀疏存储。

训练建立词表，预测复用它，未收录的词会被忽略。词袋不保留词序，词相同但顺序不同的句子可能得到相同表示；加入相邻词或字符片段能保留局部顺序，仍不表示完整句法。

TF-IDF 在计数基础上降低大量文本中都出现的词的影响。它改变的是输入表示，还没有决定类别。

## 分类模型怎样使用这些数字？

[逻辑回归](https://scikit-learn.org/stable/modules/linear_model.html#logistic-regression) 为各类学习一组权重，将输入数值加权求和并加上偏置，得到类别分数。多分类形式再将分数转成总和为 1 的概率。训练根据正确标签调整权重，并约束权重避免过度拟合；预测复用参数，不重新学习。

[Rasa Components](https://legacy-docs-oss.rasa.com/docs/rasa/components/#intent-classifiers) 展示了不同选择：关键词分类器做精确字符串匹配；逻辑回归分类器接收文本特征，返回首选意图和候选排名；DIET 则共享 Transformer 网络处理意图与实体，学习让文本表示接近正确标签，实体由另一路输出预测。DIET 自身不提供预训练语言模型，但可使用外部预训练表示。

正则表达式也有不同职责：`RegexFeaturizer` 只提供命中线索，`RegexEntityExtractor` 抽取实体；**「正则提供特征」不等于直接决定意图。**

## 怎样对应到可调用的接口？

2026-10-13 核对的 scikit-learn 接口中，`TfidfVectorizer(analyzer="char", ngram_range=(2, 4))` 使用连续 2～4 个字符作为特征，适合演示不依赖空格分词的中文转换。`fit` 学习词表与特征权重，`transform` 复用这些状态。

`LogisticRegression.fit(X, y)` 用数字表示与标签训练模型；`predict_proba(X)` 返回各类概率，列顺序由 `classes_` 给出。文本转换状态、模型与标签顺序需要对应保存。

这些资料解释实现机制，不证明它在订单业务上的效果；中文样本、类别边界与上线表现仍需实际评测。
