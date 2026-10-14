---
title: "Amazon Lex V2：候选意图、回退与会话恢复"
category: "Agent"
tags: ["Agent", "意图识别"]
source:
  - "https://docs.aws.amazon.com/lexv2/latest/dg/using-intent-confidence-scores.html"
  - "https://docs.aws.amazon.com/lexv2/latest/dg/built-in-intent-fallback.html"
read: false
created_at: "2026-10-13T22:09:24+08:00"
updated_at: "2026-10-13T22:09:24+08:00"
---

**Lex V2 返回候选意图供应用判断；回退是有独立处理路径的对话事件。** 本文节选官方开发指南，核对日期为 2026-10-13，未运行 AWS 服务。

## 分数可以怎样用？

`interpretations` 包含首选及最多四个备选，应用可结合领域知识比较候选。原文强调分数是相对值，不应当成绝对正确率，服务改进也可能改变分值。`AMAZON.FallbackIntent` 没有公开的置信度分数，不能给它补一个零再参与普通排序。

阈值按语言配置；所有业务候选低于阈值时可能进入 fallback，fallback 自身也可能胜过其他候选。识别是否接受因此不能简化为「分数最大就执行」。应用可以通过 Lambda 对话 hook 或会话管理 API 调整当前意图，但调整后的业务动作仍需应用实现。

## 回退以后做什么？

Fallback 文档覆盖不匹配、含混输入、噪声，以及填槽或确认失败后的回退。最终行为与提示的重试次数配置有关。Lambda 可以根据累计回退次数采取不同动作，例如重新询问、转交人工或结束对话；这个计数需要通过会话属性等方式保留。

可迁移的做法是将失败原因、重试计数和待补字段显式保存，避免每轮重新问同一句。转人工还需要实际接入通道；配置一个 fallback 标签不会自动产生人工服务。
