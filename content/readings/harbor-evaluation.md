---
title: "Harbor：把 Agent 任务封装成环境与验收程序"
category: "Agent"
tags: ["Agent", "评测"]
created_at: "2026-10-13T10:53:04+08:00"
updated_at: "2026-10-13T12:48:15+08:00"
source: ["https://docs.harborframework.com/tasks/overview", "https://www.harborframework.com/", "https://hub.harborframework.com/"]
---

Harbor 将**「任务描述、运行环境和验收脚本封装在一起」**，用同一任务包运行不同 Agent。本文节选 2026-10-13 的官方任务格式与项目入口；未安装框架或运行 Terminal-Bench。

## 一个任务包包含什么？

[任务格式](https://docs.harborframework.com/tasks/overview) 中，`instruction.md` 描述目标，`task.toml` 配置任务，`environment/` 定义环境，`solution/` 保存参考解，`tests/` 保存验收逻辑。一次 trial 是某个 Agent 在该任务上的一次尝试。

验收脚本生成 reward 文件，可输出单值或多维结果。由独立脚本检查完成情况，能避免只相信 Agent 的完成声明；但脚本是否覆盖业务要求仍需另行审核。

## 框架和 Benchmark 是什么关系？

[Harbor](https://www.harborframework.com/) 是运行与组织任务的框架；[Hub](https://hub.harborframework.com/) 提供可运行的数据集，其中包含 Terminal-Bench 系列。框架支持运行某数据集，不意味着不同修订的数据、预算和 Agent 配置可直接比较。

多步任务可在共享环境上设置分阶段指令、解法和验收，用于观察长任务的连续推进。阶段分数能定位进展，但最终产物还需统一检查；把任务拆成步骤也可能改变模型获得的提示，因此需要记录协议。后一句是使用该格式时的实验设计判断。

迁移到自己的任务时，可复用这种**「指令＋环境＋参考解＋验收」**分工，避免只维护一张问题表。任务包仍需固定依赖与版本，不能仅凭容器存在就认定可复现。
