---
learning_status: pending
title: "人工审批怎样绑定动作并处理回复"
parent: agent-human-in-the-loop
category: "Agent"
tags: ["Agent", "人工介入", "权限"]
created_at: "2026-10-13T11:07:38+08:00"
updated_at: "2026-10-13T11:07:38+08:00"
reading_suggestions:
  - sandbox-execution
  - agent-resume-practice
  - openai-guardrails-summary
---

人批准了草稿 v1，不代表也批准后来生成的 v2。**审批需要绑定具体提案；回复校验通过后，程序才能把原任务变为可执行。** 以下是自建服务的协议设计，适用于需要保存并恢复的审核流程。

## 为什么一个 approve 布尔值不够？

同一个人可能同时审核多份草稿，也可能在旧页面里点击同意。服务端至少需要知道回复属于哪个任务、哪次请求、哪个版本；完整草稿或不可变引用留在服务端。

```json
{
  "task_id": "task-42",
  "request_id": "review-7",
  "revision": 3,
  "status": "pending",
  "action": {"tool": "publish", "target": "guide", "draft_version": "v1"},
  "allowed_decisions": ["approve", "reject", "edit"],
  "reviewer_role": "editor",
  "expires_at": "2026-10-14T12:00:00+08:00"
}
```

界面展示真实目标、正文和影响，客户端提交标识、所见版本、决定及必要修改。审核人身份来自认证会话，不能信任请求体自报的姓名；知道审批 ID 也不代表有资格批准。[[openai-guardrails-summary|SDK 审批状态的可信边界]]同样要求完整运行状态留在可信服务端。

## 校验后，为什么还要原子更新？

假设两个请求都读到 `pending`，随后分别提交批准与拒绝。只在读取时检查状态，两边都可能认为自己成功。需要在写入时再次检查状态与版本，竞争一次有效迁移。

以下为 PostgreSQL 风格示意。调用前已完成身份、范围、决定类型和业务参数校验；事务中还需写入决定记录与任务状态。

```sql
UPDATE approvals
SET status = 'approved', revision = revision + 1
WHERE request_id = :request_id
  AND status = 'pending'
  AND revision = :observed_revision
  AND expires_at > CURRENT_TIMESTAMP
RETURNING task_id;
```

只有返回一行才推进任务；其余写入必须与这次迁移同事务提交。零行表示条件已不满足，要区分过期、旧版本或已处理。重复的同一请求可返回原决定，相冲突的决定应拒绝；超时处理也竞争同一个待处理状态。

批准记录只证明决定已生效，尚不证明工具已执行。[[agent-resume-practice|Go 审批示例]]用独立的 `decide` 和 `run` 命令展示这一区别；它的文件版本检查仅适用于单写入者，不能替代数据库并发控制。

## 决定怎样改变后续执行？

- 批准：执行器对冻结动作重查当前权限和资源条件，再在[[sandbox-execution|执行环境的边界]]内执行，保存实际回执。
- 编辑：校验新内容，生成新版本；按政策重新审批，或明确记录审核人已批准这份修改后的内容。
- 拒绝：不执行原动作，把拒绝与理由交回模型，按允许的流程结束、澄清或重新规划，不能换工具绕过。
- 补充信息：将人的答案写入对应字段，继续决策，不伪造一次外部工具成功。

未回复继续等待，超时或取消按政策终止、通知或升级处理。若远端操作已开始，取消审批记录不能撤销效果，必须核对结果及是否可补偿。审计时应能分别看到提案版本、人的决定、执行尝试与最终回执。
