// 工具执行调度：Go 风格教学伪代码，不能直接编译运行，未做运行验证。
// 输入：完整、已校验且必要依赖已确认的调用计划；模型或固定流程提供结果引用。
// 空 Deps 不构成独立性证明；无法确认的调用须先保留原顺序并声明串行依赖。
// Init 拒绝重复 ID、未知工具、不存在的前置、依赖环及未包含在依赖中的结果引用。
// 示例：A 读配置，B 搜索资料，C 使用 A 的结果计算；并发上限 2。
// 所有辅助函数均为自拟接口。两个 Run 函数分别从空运行集合、新结果表开始。
//
// 范围：演示正常完成与明确失败；不实现审批等待、超时、取消和持久恢复。
// RecordOne 只接收已确认底层执行结束的事件；不能把超时信号当成此类事件。
// 调度循环独占修改状态，Worker 只发送完成事件；任务内冲突由 running 判断。
// 跨任务共享容量、锁和限流需由外层提供，此处只使用任务内并发上限。

// 应用自定义的调度输入；这些字段不是某个模型 SDK 的内置接口。
// Args 的 Path、Query、Config 为本例字段；生产接入可用各工具自己的参数结构。
type Args struct {
    Path, Query string
    Config any
}
type Task struct {
    ID, Tool string
    Args Args
    Deps []string
}
type ResultRef struct { CallID string }
type ToolSpec struct {
    Execute func(Args) (any, error)
    Resources func(Args) Access
}

func Example() {
    tasks := []Task{
        {ID: "A", Tool: "read_file", Args: Args{Path: "/work/config.json"}},
        {ID: "B", Tool: "search", Args: Args{Query: "相关资料"}},
        {ID: "C", Tool: "compute", Deps: []string{"A"},
            Args: Args{Config: ResultRef{CallID: "A"}}},
    }
    report := RunWhenReady(tasks) // 也可改为 RunBatches(tasks)
    ReturnToolResultsByID(report) // 由调用方交回模型，不按完成顺序配对
}

// 两种循环共用初始化。ValidatePlan 执行文件开头列出的结构校验。
func Init(tasks []Task, maxConcurrent int) {
    ValidatePlan(tasks)
    limit = maxConcurrent
    pending = TasksByID(tasks) // 扫描时仍按原始到达顺序取快照
    running = map[string]Running{}
    results = map[string]Outcome{}
    done = make(chan Event, len(tasks))
}

// ToolSpec 除 Resources 回调外，还绑定 Execute(args) -> (value, error)。
// read_file 的接入示例见下方；search/compute 的 Execute 由业务代码提供。
// 本例约定 Execute 返回表示底层操作已经结束；网络超时不能直接套用此约定。
func Worker(id, tool string, args Args, done chan<- Event) {
    outcome := Outcome{State: Failed}
    defer func() {
        if p := recover(); p != nil { outcome = FailedOutcome(p) }
        done <- Event{ID: id, Outcome: outcome}
    }()
    value, err := Registry[tool].Execute(args)
    if err != nil { outcome = FailedOutcome(err); return }
    outcome = Outcome{State: Succeeded, Value: value}
}

// 开发者登记工具时提供资源规则；不采用模型自报的读写集合。
// CanonicalFileKey 必须归一指向同一文件的不同名称；无法可靠识别则返回错误。
func FileResources(path string, write bool) Access {
    key, err := CanonicalFileKey(path) // 返回如 file:/work/config.json 的统一键
    if err != nil { return Access{AllowConcurrent: false, Incomplete: true} }
    if write { return Access{W: Set(key), AllowConcurrent: true} }
    return Access{R: Set(key), AllowConcurrent: true}
}

// 注册阶段绑定回调；执行入口仍由原工具实现提供。
Registry["read_file"].Execute = func(args Args) (any, error) {
    return os.ReadFile(args.Path) // 实际读取；os 为 Go 标准库
}
Registry["read_file"].Resources = func(args Args) Access {
    return FileResources(args.Path, false)
}
Registry["write_file"].Resources = func(args Args) Access {
    return FileResources(args.Path, true)
}
// 示例 B 仅查询，不使用共享会话；C 只使用输入参数，无共享状态。
Registry["search"].Resources = func(args Args) Access {
    return Access{R: Set("service:search"), AllowConcurrent: true}
}
Registry["compute"].Resources = func(args Args) Access {
    return Access{AllowConcurrent: true} // 已确认无共享状态，才声明空集合
}
// 其他工具也需登记可信规则；规则缺失时按 Incomplete=true 保守独占。

func DeclaredAccessOrExclusive(spec ToolSpec, args Args) Access {
    if spec.Resources == nil { return Access{AllowConcurrent: false, Incomplete: true} }
    return spec.Resources(args)
}

func Conflict(t, r Access) bool {
    if !t.AllowConcurrent || !r.AllowConcurrent { return true }
    return Intersects(t.W, Union(r.R, r.W)) ||
           Intersects(r.W, Union(t.R, t.W))
}

// 共用筛选与启动逻辑：没有可用空位或存在冲突时，跳过候选，继续尝试其他调用。
func FillSlots() {
    PropagateBlockedToFixpoint() // 将前置失败或被阻断的调用移出 pending
    for _, t := range SnapshotInArrivalOrder(pending) {
        if AnyDepFailedOrBlocked(t) { MarkBlockedAndRemove(t); continue }
        if !AllDepsSucceeded(t) { continue }
        args, err := ResolveResultRefs(t.Args, results)
        if err != nil { MarkFailedAndRemove(t, err); continue }
        if err := CheckArgsAndPermission(t.Tool, args); err != nil {
            MarkFailedAndRemove(t, err)
            continue
        }
        use := DeclaredAccessOrExclusive(Registry[t.Tool], args) // 使用已登记规则，缺失则独占
        if use.Incomplete { use.AllowConcurrent = false }
        if len(running) >= limit { continue }
        conflict := false
        for _, r := range running {
            if Conflict(use, r.Access) { conflict = true; break }
        }
        if conflict { continue }
        // 检查、登记和占用在同一循环内连续完成；Worker 不修改调度状态。
        running[t.ID] = Running{Task: t, Args: args, Access: use}
        delete(pending, t.ID)
        go Worker(t.ID, t.Tool, args, done) // 成功和失败都必须发送完成事件
    }
    PropagateBlockedToFixpoint() // 本轮新拒绝也须向依赖分支传播
}

func RecordOne() {
    e := <-done // 任一调用完成即可返回；e 包含调用 ID、成功/失败与结果
    results[e.ID] = e.Outcome
    delete(running, e.ID) // 本例确认执行结束，移除即释放任务内资源与名额
}

// 分批：一次 FillSlots 选出本批；本批全部结束前，不再派发。
func RunBatches(tasks []Task) Report {
    Init(tasks, 2)
    for len(pending) > 0 {
        FillSlots()
        if len(running) == 0 {
            // pending 为空则结束；否则报告等待原因或无法推进，不能忙等。
            return ReportOrSuspend(pending, results)
        }
        for len(running) > 0 {
            RecordOne()
        }
        // A、B 的完成事件都已收齐，才会进入下一轮并启动 C。
    }
    return ReportByCallID(results)
}

// 就绪：收到一个完成事件就返回顶部，再次尝试补位。
func RunWhenReady(tasks []Task) Report {
    Init(tasks, 2)
    for len(pending) > 0 || len(running) > 0 {
        FillSlots()
        if len(running) == 0 { return ReportOrSuspend(pending, results) }
        RecordOne()
        // A 成功后，下一轮解析 C 的参数并启动；无需等 B。
    }
    return ReportByCallID(results)
}
