---
title: "SWE-bench：通过仓库测试验收代码修改"
category: "Agent"
tags: ["Agent", "评测"]
created_at: "2026-10-13T10:54:39+08:00"
updated_at: "2026-10-13T12:48:15+08:00"
source: ["https://www.swebench.com/SWE-bench/guides/evaluation/", "https://www.swebench.com/SWE-bench/reference/cli/"]
---

SWE-bench 将 Agent 生成的补丁**「应用到指定仓库状态」**，再执行测试判断问题是否解决。本文节选 2026-10-13 官方评测指南与 CLI 文档；未运行数据集或复核榜单。

## 为什么要固定仓库和环境？

[评测指南](https://www.swebench.com/SWE-bench/guides/evaluation/) 将补丁、任务标识和模型标识作为输入，在 Docker 环境中执行仓库测试。这样可以让不同解法接受同一验收，而无需与参考补丁逐字一致。

结果保留补丁、测试输出、运行日志和任务报告。报告区分已提交、完成评分、已解决、未解决与无法生成结果等状态；主程序没有崩溃，不等于问题修复成功。

## 怎样防止比较了旧结果？

指南提醒评测结果会按 run 与任务标识缓存。更换补丁时需要新的 run ID，避免直接复用旧报告。[CLI 文档](https://www.swebench.com/SWE-bench/reference/cli/) 也区分生成补丁、执行验收和对既有日志重新汇总。

迁移到自己的编码 Agent 时，应**「固定仓库 commit、依赖和验收测试」**，保存每次修改及错误类别。通过指定测试只证明测试覆盖的要求；隐藏测试不足、环境损坏或测试本身不公平，都可能影响结论。因此还需用人工审阅或补充测试检查测试未覆盖的约束。
