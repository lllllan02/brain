---
title: "Lex、Dialogflow 与 Rasa：对话测试和发布检查"
category: "Agent"
tags: ["Agent", "意图识别"]
source:
  - "https://docs.aws.amazon.com/lexv2/latest/dg/test-results-details-test-set.html"
  - "https://docs.aws.amazon.com/lexv2/latest/dg/tips-create-test-set.html"
  - "https://docs.cloud.google.com/dialogflow/cx/docs/concept/test-case"
  - "https://docs.cloud.google.com/dialogflow/cx/docs/concept/continuous-tests"
  - "https://rasa.com/blog/rasa-automated-tests"
read: false
created_at: "2026-10-13T22:09:24+08:00"
updated_at: "2026-10-14T13:59:35+08:00"
---

**对话测试需要沿一次任务检查：数据标注、意图分类、参数收集、跨轮路径和发布后的行为。** 单句分类正确不能证明整个任务完成。

本篇节选 2026-10-13 核对的 Lex、Dialogflow 与 Rasa 官方资料；Rasa 博文涉及旧工具，不照搬其命令，未运行云端平台。

## 整体怎样检查？

准备有参考答案的对话 → 回放各轮 → 找出首个出错环节 → 修正并比较版本 → 发布前再次验证

先确认意图名、参数名和答案格式与系统一致，再检查输出。相对日期的原话与转换后的绝对日期含义不同，测试必须约定采用哪一种，避免正确解析被判错。

## Lex 怎样定位失败？

Test Workbench 分开显示整体、会话、意图、槽位和逐轮详情。槽位就是需要收集的参数；意图选错、询问了错误字段和字段值错误是不同故障。

部分路径错误会使后续轮次被跳过，阅读成功率时要核对哪些轮次真正执行了。有效会话日志提供测试素材，但还需检查它们是否符合当前 Bot 的类别与字段定义。

## Dialogflow 怎样检查版本回归？

Test cases 保存可重复执行的对话。Continuous tests 将选定测试集绑定环境，验证环境中的流程版本；continuous deployment 可在部署前运行验证。核对时持续测试功能标为 Preview，不能将当时文档视为所有环境的可用性承诺。

可借鉴的是变更前后运行相同关键会话，并设置发布检查条件。测试通过仍不能覆盖全部接口、权限与真实流量风险。

## Rasa 为什么先检查数据？

自动测试指南先检查数据冲突，再评估语言理解和对话。同一句被标成两个意图、同样历史对应矛盾回复，都会让目标不一致。

分类报告说明哪类表现差，混淆矩阵显示它被错分到哪里，分数分布帮助检查低分是否对应更多错误。三类信息结合，才能决定修标注、分类还是回退策略；不同平台的报告口径不能直接合并成一个准确率。
