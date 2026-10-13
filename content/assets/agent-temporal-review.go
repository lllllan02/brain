// SDK integration example; not compiled or integration-tested.
// Requires a host application, Temporal service, and an idempotent Publish Activity.
package review

import (
	"context"
	"time"

	"go.temporal.io/sdk/activity"
	"go.temporal.io/sdk/client"
	"go.temporal.io/sdk/worker"
	"go.temporal.io/sdk/workflow"
)

type Proposal struct {
	RequestID, OperationID, Target, Body string
}
type Decision struct {
	RequestID string
	Approved  bool
}

// 由 Worker 执行；p 是已经冻结、带稳定操作 ID 的工作流输入。
func Review(ctx workflow.Context, p Proposal) (string, error) {
	ch := workflow.GetSignalChannel(ctx, "review")
	var d Decision
	for {
		ch.Receive(ctx, &d)
		if d.RequestID == p.RequestID {
			break
		}
	}
	if !d.Approved {
		return "rejected", nil
	}
	ctx = workflow.WithActivityOptions(ctx, workflow.ActivityOptions{
		StartToCloseTimeout:    time.Minute,
		ScheduleToCloseTimeout: 5 * time.Minute,
	})
	var receipt string
	err := workflow.ExecuteActivity(ctx, "Publish", p).Get(ctx, &receipt)
	return receipt, err
}

// 由宿主启动；publish 是调用方注入的幂等业务实现，接收 p.OperationID。
func Serve(c client.Client, publish func(context.Context, Proposal) (string, error)) error {
	w := worker.New(c, "review-queue", worker.Options{})
	w.RegisterWorkflow(Review)
	w.RegisterActivityWithOptions(publish, activity.RegisterOptions{Name: "Publish"})
	return w.Run(worker.InterruptCh())
}

// 由已完成身份和审批资格校验的应用入口调用。
func Submit(ctx context.Context, c client.Client, workflowID, runID string, d Decision) error {
	return c.SignalWorkflow(ctx, workflowID, runID, "review", d)
}
