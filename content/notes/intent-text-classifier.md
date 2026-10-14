---
title: "用文本分类器实现意图识别"
aliases: ["监督学习意图分类", "Intent Classification"]
parent: agent-intent
category: "Agent"
tags: ["Agent", "意图识别"]
learning_status: pending
created_at: "2026-10-13T17:38:22+08:00"
updated_at: "2026-10-13T22:19:58+08:00"
reading_suggestions:
  - rasa-nlu-data-practice
  - rasa-intent-classification
  - azure-clu-intent-design
  - intent-evaluation
---

**文本分类器通过带标签的样本学习文字与任务类别的关系，再对新消息预测类别。** 在意图识别中，输入「订单 A 能退吗」，期望输出 `refund_eligibility`；标签由开发者定义，模型学习怎样区分不同表达。

意图分类这个任务也能用规则或 LLM 完成；本文专门说明监督学习路线：样本 → 文本特征 → 逻辑回归 → 候选分数。例子为自拟订单场景，使用成熟的 Python scikit-learn 实现训练，避免手写优化器。

## 先设计类别，再从真实请求准备样本

假设客服支持三类任务，标签和例句可以这样定义：

| 标签 | 含义 | 已标注的用户表达 |
| --- | --- | --- |
| `refund_eligibility` | 查询退款资格 | 「订单 A 能退吗」「这单是否符合退款条件」 |
| `refund_submit` | 提出退款申请 | 「我要退订单 A」「请帮我申请退款」 |
| `track_order` | 查询物流 | 「订单 A 到哪了」「帮我查配送进度」 |

标签是业务约定，不是模型自行发现的标准答案。若全部标成 `refund`，模型即使分对，也无法告诉程序该查询还是申请。上表中的 A 则是对象值，换成 B 不应新增一个意图标签。

**「训练样本」就是文字与正确标签的配对。** 收集样本时要覆盖不同说法和相邻类别的区别；「不退款，只查资格」不能因为出现「退款」就标成申请。只有上下文才能判断的表达，不宜强行当作单句分类的明确样本。

训练样本优先来自脱敏后的客服请求、测试用户输入和人工纠错。先写每类的定义、正例、容易混淆的反例；标注分歧先解决定义，不把同一句话随机分到两类。[[rasa-nlu-data-practice|Rasa 的数据实践]]强调真实表达和数据版本，[[dialogflow-intent-design|Dialogflow 的设计指南]]则提醒 no-match 不总能靠追加样本解决。

冷启动时可以人工编写少量样本验证流程，也可让 LLM 提议不同表达后人工审查；这些都是候选训练数据，不能同时当独立测试集。只替换订单号得到的一批句子应归在同一数据分组，避免相同模板跨入训练与测试造成虚高表现。

[[rasa-intent-classification|Rasa 与 scikit-learn 的分类资料]]解释具体的特征和算法接口。

固定句式可以直接用 [[intent-rules|规则识别]]；说法增多后，分类器能根据共享特征处理未逐条列出的表达，但是否分对仍需测试。

## 样本怎么变成模型能够计算的东西？

分类器通常接收数字。先以词袋（Bag of Words）为例：分词后建立固定词表，再统计每个词出现几次。假设只展示 `[订单, 能, 退, 申请]` 四个维度：

- 「订单 A 能退吗」转换为 `[1, 1, 1, 0]`。
- 「申请退订单 A」转换为 `[1, 0, 1, 1]`。

这里为了演示省略了其他词。向量的每一格都有固定含义，分类器可以学会「能」与查询相关、「申请」与申请操作相关。真实中文处理需选择分词器，或改用连续字符片段；不能直接把按空格切词的英文示例当成中文方案。

词袋只计数，会丢失顺序；增加相邻词组合可以保留局部表达。另一条路线是用预训练编码器生成稠密向量，让整句话由一组数表示，再训练分类器。**「向量」只是文本表示，最终仍需规则或模型把它映射到标签。**

**待展开：** 编码器怎样把句子变成稠密向量，以及固定编码器、微调编码器和用向量相似度匹配意图分别怎样做。本篇展开的是词袋加分类器路线，尚未解释这些向量方案的具体过程。

## 训练和收到消息时分别做什么？

以多分类逻辑回归（Logistic Regression）为例，每个标签都有一组权重。对一条向量，把各维数值乘以该标签对应的权重后求和，再加偏置，得到类别分数；softmax 将各类别分数变成总和为 1 的模型概率。

训练时已经知道正确标签，算法比较预测与答案，调整权重，减少预测误差。例如把「订单 A 能退吗」错分成申请，训练目标就会推动这条输入的查询得分相对提高；优化器根据误差计算各个权重的调整方向。重复处理许多样本后，得到能区分类别的权重，而不是由人逐句指定分数。

训练完成后保存词表和权重。推理（Inference）时没有答案，只用保存的词表转换新句子、用固定权重算分，不因收到一句消息就重训。新句子只要能由这些特征表示，就能进入同样的计算；这不保证未见说法一定分对。

词表、特征权重（如 TF-IDF 的 IDF）与分类器参数要一起保存，否则同一列可能代表不同含义。训练集用于学习，验证集用于选择配置，独立测试集用于检查未见表达；不能用训练例句的正确率证明模型已能处理真实请求。

## 最小训练与预测代码

安装 Python 3.11+ 和 scikit-learn：`python -m pip install scikit-learn`。将下列代码保存为 `intent_classifier.py`，运行 `python intent_classifier.py`。

这里用字符 2～4 元组：例如「能退吗」提供「能退」「退吗」「能退吗」等局部特征，无需先安装中文分词器。TF-IDF 根据训练文本的频率给这些片段加权；`Pipeline` 把向量化与分类器串在一起，使训练和预测采用同一转换。接口依据见 [[rasa-intent-classification#怎样对应到可调用的接口？|scikit-learn 接口说明]]。

```python
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline

samples = {
    "refund_eligibility": [
        "订单能退吗", "帮我查退款资格", "是否符合退款条件",
        "我想知道能不能退款", "只查能否退款不要提交",
    ],
    "refund_submit": [
        "帮我申请退款", "我要退订单", "请提交退款申请",
        "决定退货请办理退款", "替我发起退款",
    ],
    "track_order": [
        "订单到哪了", "帮我查物流", "查看配送进度",
        "包裹什么时候送到", "快递现在在哪里",
    ],
}
texts = [text for group in samples.values() for text in group]
labels = [label for label, group in samples.items() for _ in group]
model = make_pipeline(
    TfidfVectorizer(analyzer="char", ngram_range=(2, 4)),
    LogisticRegression(max_iter=1000, random_state=0),
)
model.fit(texts, labels)  # 离线训练；线上进程应加载训练产物。

# 仅演示检查方法，三条自拟样本不是业务测试集。
cases = [
    ("订单A能退吗", "refund_eligibility"),
    ("请帮我申请退款", "refund_submit"),
    ("查一下物流", "track_order"),
]
for text, expected in cases:
    probabilities = model.predict_proba([text])[0]
    ranking = sorted(zip(model.classes_, probabilities),
                     key=lambda item: item[1], reverse=True)
    top, score = ranking[0]
    # 教学阈值，未通过验证集选择，不可直接用于业务。
    decision = top if score >= 0.60 and score - ranking[1][1] >= 0.15 else "fallback"
    print(text, "expected=", expected, "top=", top,
          "score=", round(float(score), 3), "decision=", decision)

# 域外请求仍会得到已知类别概率，观察它而非假设必然回退。
print("域外样例：", model.predict_proba(["帮我订机票"])[0])
```

`fit` 只在训练阶段学习词表、IDF 和分类权重；`predict_proba` 复用它们，并按 `classes_` 顺序输出概率。代码为方便演示在一个进程里执行两个阶段，真实服务不应每次请求都调用 `fit`。

观察输出时要区分「最高分标签」与「最终决策」：标签可能选对，但分数未达到示意阈值，仍返回 `fallback`。阈值越高通常拒绝越多，需要在有代表性的验证集上权衡误路由和回退。概率也不是已校准的正确率，更不能保证域外请求的分数一定低；域外与含混请求应单独测试。

本地验证环境为 Python 3.14.2、scikit-learn 1.9.1。三条样例最高分标签均与期望一致，分数依次约为 0.437、0.512、0.401，按示意阈值均回退；这些结果不足以证明对真实请求的识别能力。域外样例也产生了三个已知类别的概率。这里只验证训练和推理流程，未测得业务准确率。

## 从脚本到服务，训练产物怎样交付？

线上加载的是「文本预处理、词表与 IDF、分类器权重、标签顺序、阈值配置」这一整组产物；再记录数据版本、依赖版本和业务标签版本。不要只替换权重而保留旧词表，也不要在请求处理器里重新 `fit`。上面的脚本故意只在内存里演示，尚未实现持久化与服务加载。

发布前对同一批留出请求比较旧模型和新模型。若 `refund_eligibility` 总被判为 `refund_submit`，先查两类的定义、样本分布和否定表达，再比较特征或模型；增加参数量不能修复互相矛盾的标签。[[azure-clu-intent-design|Azure CLU 的 None 机制]]还提醒，域外类别和分数阈值是两种不同手段，需按[[intent-evaluation|实际路由决策]]一起测试。

## 得到类别后，程序能直接退款吗？

分类结果可以包含首选标签及其他候选的得分；即使首选是 `refund_submit`，它也只表示对表达的预测。**「标签正确」不等于对象齐全、订单可退或操作获准。** 对象 A 需要提取和校验，退款资格需要查询业务系统，再由程序决定下一步。

此外，预设类别可能根本不包含用户的请求；[[clinc-intent-oos|CLINC 的研究]]专门检验这种域外情况。「它能退吗」还依赖上一轮提到的对象，这已经需要结合上下文维护状态，超出了这里的单句分类流程。
