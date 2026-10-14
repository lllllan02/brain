---
title: "LangGraph：结构化分类如何接入条件路由"
category: "Agent"
tags: ["Agent", "意图识别"]
source:
  - "https://docs.langchain.com/oss/python/langgraph/workflows-agents"
read: false
created_at: "2026-10-13T22:09:24+08:00"
updated_at: "2026-10-13T22:09:24+08:00"
---

**LangGraph 的 Routing 示例把模型分类结果写入状态，再由程序选择固定分支。** 本文只节选官方 Workflows and agents 中的 Routing 部分，核对日期为 2026-10-13；未部署其完整示例。

示例用 `Route.step` 限制允许的类别，通过 `with_structured_output` 获得类型化结果。路由节点返回 `decision`；条件函数读取它，再通过 `add_conditional_edges` 映射到不同任务节点。模型负责选择标签，程序负责定义可到达的节点及执行顺序。

这能把不同任务交给专门流程，不要求模型在每次分类时自行生成整套执行计划。但原例的诗、故事、笑话分类没有完整业务回退、超时和权限校验，不能原样当退款服务使用。

可迁移到客服的部分是有限类别、显式状态和固定分支映射。分支很少时普通 `switch` 就能表达同样的路由职责；是否引入图框架，应取决于是否需要状态持久化、多步编排和调试能力。最后这一点是应用设计判断，不是框架性能结论。
