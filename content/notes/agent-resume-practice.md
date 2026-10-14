---
learning_status: pending
title: "用 Go 实现可恢复的人工审批"
parent: agent-checkpoint-recovery
category: "Agent"
tags: ["Agent", "Checkpoint", "人工介入", "Go"]
created_at: "2026-10-13T10:59:51+08:00"
updated_at: "2026-10-13T11:07:38+08:00"
type: practice
reading_suggestions:
  - agent-approval-protocol
  - agent-resume-failure
---

**把「等待」「批准」「执行」分别保存，人工审批就能跨进程继续。** 本例固定一份待发布草稿，不接模型和真实服务，只观察决定如何变成下一次运行的输入。

## 三个进程怎样接力？

程序位于 `content/assets/agent-resume-demo.go`，仅依赖 Go 标准库。它用 `checkpoint.json` 保存任务，`effects.json` 模拟发布服务的操作记录。每条命令都从磁盘重新读取，不依赖上一条命令的内存。

在 Horizon 根目录运行：

```sh
resume_demo_dir=$(mktemp -d)
go build -o "$resume_demo_dir/demo" content/assets/agent-resume-demo.go

# 生成冻结草稿与 approval-1，保存 waiting、revision 1 后退出。
"$resume_demo_dir/demo" -dir "$resume_demo_dir" -action init
"$resume_demo_dir/demo" -dir "$resume_demo_dir" -action show

# 审核原草稿后，保存批准结果与 ready，再退出。
"$resume_demo_dir/demo" -dir "$resume_demo_dir" -action decide \
  -request approval-1 -version 1 -decision approve

# 新进程读取 ready，模拟发布并保存 done。
"$resume_demo_dir/demo" -dir "$resume_demo_dir" -action run
```

第一次输出包含正文、目标和期限。批准前执行 `run` 会失败；批准后，任务仍是 `ready`，尚未发布。最后一次运行输出 `effect_created=true` 和 `done`，实际效果仅是向本地 `effects.json` 写入一条记录。

## 程序凭什么接受这个回复？

`main` 调用 `run()`，后者读取检查点，核对等待状态、审批 ID、版本、期限和决定类型。以下是 `run()` 的状态迁移节选；`c` 来自磁盘，`decision` 来自 CLI，`save` 递增版本并写入完整检查点：

```go
// agent-resume-demo.go，run() 的 case "decide"。
// 前面已校验状态、ID、版本、期限和决定类型。
c.Decision = *decision
next := "rejected"
if *decision == "approve" {
    next = "ready"
}
if err := save(next); err != nil {
    return err
}
// 后面输出保存后的状态，然后进程退出。
```

再次提交原 `revision 1` 会失败；改为 `reject` 则进入拒绝状态，不允许执行。示例冻结提案，不支持编辑；真实服务的身份、改稿与并发处理由[[agent-approval-protocol|审批协议]]补齐。

`init` 默认给予一小时准入期限，可用 `-ttl 10m` 调整。程序在接收批准和首次进入 `executing` 时检查期限；已经开始的操作可以继续核对结果。若业务要求超期后绝不新执行，还需让执行端检查期限。

## 哪些结果已验证？

2026-10-13 在 Go 1.25.6、macOS arm64 下编译并通过 12 项独立进程检查，覆盖等待与拒绝、错误 ID 与旧版本、重复回复、过期、损坏记录，以及副作用发生后的恢复。[[agent-resume-failure|故障实验]]可复现最后一种情况：本地仍在执行中，模拟服务已经完成。

此实现只支持**「单写入者、顺序运行」**。临时文件、`Sync` 和重命名用于避免普通退出截断旧文件；未同步目录，也未做断电验证。查版本再写文件不具备并发事务保证，CLI 也没有用户认证；损坏 JSON 或未知 schema 会报错，不会重置任务。
