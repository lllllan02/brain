---
learning_status: pending
title: "恢复时为什么可能重复执行"
parent: agent-checkpoint-recovery
category: "Agent"
tags: ["Agent", "Checkpoint", "幂等", "Go"]
created_at: "2026-10-13T11:07:38+08:00"
updated_at: "2026-10-13T11:07:38+08:00"
type: practice
reading_suggestions:
  - agent-resume-practice
  - idempotency
  - aws-idempotent-retries-summary
---

审批已经落盘，任务也保存了执行进度，仍可能重复发布。原因是**「远端操作成功」和「本地保存完成」发生在不同的提交点**；恢复不能只看本地是否标记成功。

## 同一个执行中状态，可能对应什么事实？

草稿发布的顺序是：`保存 executing → 发布服务完成写入 → 保存回执与 done`。

| 崩溃时点 | 检查点记录 | 实际情况与处理 |
| --- | --- | --- |
| 调用之前 | `executing` | 尚未发布，可使用原操作 ID 调用 |
| 发布成功、回执保存之前 | `executing` | 已经发布，需查询或幂等重试 |
| 完成保存之后 | `done` | 复用结果，继续后续步骤 |

前两行在本地看起来一样。更频繁地保存不能让远端效果和本地记录自动成为一个事务；必须让执行端帮助识别同一次操作。

## 用 Go 制造这个窗口

沿用[[agent-resume-practice|Go 审批示例]]的源码，下面命令可以独立运行。`-crash-after-effect` 在模拟服务写入后调用 `os.Exit(23)`，故意不保存任务回执。

```sh
failure_demo_dir=$(mktemp -d)
go build -o "$failure_demo_dir/demo" content/assets/agent-resume-demo.go
"$failure_demo_dir/demo" -dir "$failure_demo_dir" -action init
"$failure_demo_dir/demo" -dir "$failure_demo_dir" -action decide \
  -request approval-1 -version 1 -decision approve

# 预期退出码 23；接住它，使 set -e 脚本也能继续。
"$failure_demo_dir/demo" -dir "$failure_demo_dir" -action run \
  -crash-after-effect || test "$?" -eq 23

"$failure_demo_dir/demo" -dir "$failure_demo_dir" -action show
"$failure_demo_dir/demo" -dir "$failure_demo_dir" -action run
cat "$failure_demo_dir/effects.json"
```

故障运行输出 `effect_created=true`；随后查看任务，仍是 `executing`。恢复运行输出 `effect_created=false` 并写入 `done`，效果文件中仍只有一条记录。此路径已于 2026-10-13 在 Go 1.25.6、macOS arm64 验证；它没有调用真实发布接口。

## 为什么再次调用没有产生第二次效果？

程序在 `init` 时生成并保存 `operation_id`，恢复继续使用它。`run()` 调用源码中的 `publish(path, c)`；后者先读 `effects.json`，按操作 ID 查找记录：命中且参数相同就返回旧回执，参数不同则报错，未命中才追加效果。这模拟的是执行端支持的[[idempotency|幂等约定]]，不是客户端单方面加一个字段。

真实服务还需让去重记录与业务变更共同成立，并保留足够长的去重窗口。[[aws-idempotent-retries-summary|AWS 的幂等 API 设计]]说明了操作身份、参数核对与结果复用的分工。示例的查重和追加只适用于单写入者，不提供并发保证。

若远端不能去重，也不能查询结果，就应进入「结果未知、等待核对」，不能把未知当成失败后自动重试。回退检查点也不能撤销已发生的外部效果；需要撤销时，应单独设计补偿操作。
