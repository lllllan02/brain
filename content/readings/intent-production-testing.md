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
updated_at: "2026-10-13T22:09:24+08:00"
---

**生产对话测试需要同时检查单句分类、参数收集和跨轮路径，单个意图识别成功不能代表任务完成。** 本文节选维护方的测试资料，核对日期为 2026-10-13；Rasa 博文属于旧版工具说明，不照搬其安装及命令，未运行云端测试平台。

## Lex 怎样定位失败？

Test Workbench 分开显示整体、会话、意图、槽位与逐轮详情。意图匹配错、要求补错槽位、槽位值错误是不同故障；部分路径错误还会跳过后续轮次，查看成功率时需要理解哪些轮次实际执行了。

建测试集前先核对意图与槽位名称是否与 Bot 一致，再使用有效的会话日志。参数答案可采用原始值或解析值，例如相对日期与绝对日期；预期格式必须统一，否则模型正确解析也可能被测试判错。

## Dialogflow 怎样阻止版本回归？

Test cases 保存可重复执行的对话检查。Continuous tests 将选定测试集绑定到环境，验证环境内的流程版本；continuous deployment 可以在部署流程版本前运行验证。核对时该持续测试功能仍标为 Preview，不能据此承诺所有环境的产品可用性。

可借鉴的是「变更前后跑相同关键会话」与「发布前设检查条件」。这里没有证明测试通过后就不会发生线上错误，业务接口、权限和真实流量仍有独立风险。

## Rasa 为什么先检查数据？

自动测试指南先验证数据冲突，再评估 NLU 和对话。相同句子被标成两个意图、同样会话历史对应矛盾回复，会让模型目标不一致。分类报告、混淆矩阵和预测分数分布分别帮助定位哪类错、错到哪里、低分是否真的对应更多错误。

这些资料合起来给出一个排查顺序：数据与标注是否有效 → 单句预测是否正确 → 参数是否正确 → 会话路径是否正确 → 发布后是否退化。不同平台的报告字段并不相同，不能直接合并成一个可比准确率。
