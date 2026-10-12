---
title: "Langfuse：从生产轨迹建立数据集与实验"
category: "Agent"
tags: ["Agent", "Trace", "评测", "错例回流"]
created_at: "2026-10-12T23:28:23+08:00"
updated_at: "2026-10-12T23:28:23+08:00"
source:
  - "https://langfuse.com/docs/evaluation/experiments/datasets"
  - "https://langfuse.com/docs/evaluation/experiments/experiments-via-sdk"
---

**Langfuse 将生产轨迹转为带预期结果的数据集项，再通过任务函数和评分器比较应用版本。** 这里节选数据流与执行边界，依据 2026-10-12 在线文档，未运行实验。

## 从哪条记录生成用例？

[Datasets 文档](https://langfuse.com/docs/evaluation/experiments/datasets) 给出的流程是选择表现不符合预期的生产 Trace，由专家补充预期输出，然后让新版本处理相同输入。可以从某个 observation 加入数据集，或通过 SDK 创建数据项，并用 `source_trace_id`、`source_observation_id` 保留来源。

选取哪一层决定测试范围：取根输入可测试整个任务，取模型步骤的输入则适合局部测试。平台支持字段映射，但映射后仍要检查输入是否包含被测函数所需内容；来源链接不会自动变成数据库或工具环境快照。

## 实验怎样产生新结果？

[SDK 实验文档](https://langfuse.com/docs/evaluation/experiments/experiments-via-sdk) 将输入数据、`task` 和 evaluators 分开。任务函数执行应用，评分器检查结果，实验级评分器可汇总表现。每次任务执行还会产生新 Trace，便于从分数回到具体过程；并发度与版本元数据可以配置。

SDK 可使用平台托管数据或进程内的本地数据。「本地数据」描述输入来自哪里，并不表示实验数据不发送到配置的 Langfuse 实例。

## 这个流程没有自动完成什么？

平台组织用例、执行与比较；正确答案、有效评分规则、工具状态与可重复环境仍需应用提供。失败输出不能直接作为 expected output；比较新旧版本时，也要固定数据集与评分条件，否则分数变化可能来自测试本身。后者是使用该数据模型时的工程约束，不是 SDK 自动保证的能力。
