---
title: "工具调度的最小实现"
parent: tool-scheduling
category: "Agent"
tags: ["Agent", "工具调用"]
created_at: "2026-10-10"
updated_at: "2026-10-10T21:10:22+08:00"
---

**最小实现由工具约束、调用计划和调度循环组成：模型表达依赖，程序计算资源冲突并决定启动时机。** 以下为教学伪代码，未运行；字段是应用自己的约定，不是模型 API 的标准字段。

## 定义与计划分开保存

[[tool-registry|工具注册中心]]保存开发者定义的约束，模型不能覆盖：

```text
ToolSpec(name, allow_concurrent, resources(args), execute)
Task(id, tool, args, depends_on)

read_file:  allow_concurrent=true,  resources(path)={read:[path]}
write_file: allow_concurrent=false, resources(path)={write:[path]}
```

这里 `false` 表示当前任务内独占。`resources` 由程序对实际参数计算，规范化路径等资源标识；读取也可能与其他调用的写入冲突。

示例计划：

```text
A: read_file("a.txt"), depends_on=[]
B: read_file("b.txt"), depends_on=[]
C: write_file("out.txt", combine($A, $B)), depends_on=[A, B]
D: read_file("out.txt"), depends_on=[C]
```

`$A`、`$B` 表示结果引用，`combine` 表示应用预设的合并操作。A、B 可并发，C 等待二者，D 等待 C，无需额外声明并发组。计划校验应拒绝重复 ID、未知工具、无效引用和依赖环，并确保结果引用已包含在依赖中。

## 派发前怎样检查

依赖成功 → 解析结果参数 → 校验参数与权限 → 计算读写集合 → 检查并占用 → 执行。

对候选调用 t 和任一运行中调用 r，保守的并发条件是：

```text
can_overlap(t, r) =
    t.tool.allow_concurrent AND r.tool.allow_concurrent
    AND t.W 与 (r.R ∪ r.W) 不相交
    AND r.W 与 (t.R ∪ t.W) 不相交
```

因此独占调用要等其他调用结束；它运行期间也阻止其他调用启动。资源集合不完整时，这个检查不能保证安全。

## 调度循环

```text
validate_plan(tasks)
while 存在等待或运行任务:
    if 取消或整体期限已到:
        停止派发，请求取消，记录未完成状态；退出
    阻断前置失败、结果未知或已被阻断的任务
    for t in 前置全部成功的等待任务:
        解析参数、校验权限、计算资源；失败则记录并跳过
        if 并发额度足够 and 与所有运行任务 can_overlap:
            原子登记运行状态并占用资源
            异步执行 t，期限不超过整体剩余时间
    if 没有运行任务:
        记录剩余任务无法推进的原因；退出
    等待完成事件、取消或整体期限
    若收到完成事件:
        按调用 ID 记录成功、失败或结果未知
        确认实际执行结束后释放资源
按模型接口要求回传本批调用结果
```

示例仅调度已获批准或无需审批的调用，派发前仍校验权限；待审批不当作执行失败，审批等待与恢复由[[tool-permissions|审批流程]]处理。本例采用单一调度循环、有限并发和「失败阻断依赖分支，独立分支继续」策略；限流定时唤醒、动态重规划和持久恢复未展开。执行器负责本地或 MCP 路由，并将异常转成完成事件。

超时但底层仍可能写入时，不能直接释放冲突资源；状态未知应先核查。重试也不能简单地把所有失败改回等待。对照 [[llmcompiler-summary|LLMCompiler]]可继续看依赖派发与流式规划；本例假设计划已完整生成。
