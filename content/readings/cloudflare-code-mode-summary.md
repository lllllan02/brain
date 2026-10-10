---
title: "Cloudflare Code Mode：用代码组织多步工具调用"
parent: tool-scheduling-readings
category: "Agent"
tags: ["Agent", "工具调用"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
source: "[Cloudflare Code Mode 官方文档](https://developers.cloudflare.com/agents/tools/codemode/)"
---

**Cloudflare Code Mode 将工具暴露为带类型的方法，让模型用代码完成多步调用和数据处理，再返回需要的结果。**

普通调用经常是「模型选工具 → 读取结果 → 再选工具」。当任务包含大量查询、循环和筛选时，中间数据会反复进入模型上下文。Code Mode 把这些控制流程留在执行环境，减少为每一步重新调用模型的需要。

## 代码与工具如何配合

模型获得代码执行能力及可调用方法，生成代码后由运行时执行。代码可以把前一步结果交给下一步、批量查询、按条件分支，再汇总输出。根据接入方式，工具类型可以预先提供，也可以先发现能力再获取细节。

这与 [[anthropic-advanced-tool-use-summary|Anthropic 程序化调用]]思路相近，但接口与运行环境不同。代码能表达并行，不等于所有调用自动并行；外部工具请求仍然实际发生。

多步依赖、批量处理和大结果筛选更能体现收益；少量固定工具的小查询通常可直接调用。截至 2026-10-10，文档将其标为实验性功能，接口可能变化；未运行示例。
