## Q7
操作被沙箱拒绝后，系统如何识别并发起审批？批准后是扩大特定目录或网络权限、重新创建沙箱，还是直接在沙箱外重试？授权作用于单次命令还是整个会话？沙箱不可用时，是拒绝执行还是降级运行？
### Answer
**简答**：沙箱拒绝通过两条途径识别——执行器上报的 `sandbox_denied` 标志，或 `is_likely_sandbox_denied` 对退出码+输出文本的启发式判断，统一转成 `SandboxErr::Denied`。`ToolOrchestrator::run` 捕获后按策略决定重试方式：批准后**重新创建一次新尝试**（`SandboxAttempt`），通常是 `SandboxType::None`（沙箱外重试），但在 `unsandboxed_allowed == false` 时重选沙箱或以 `EscalatedSandboxWithRestrictions` 扩大文件系统权限。授权经 `ApprovalStore` 缓存作用于**重复的同类命令**而非整条会话；沙箱后端不可用（如 MXC 缺失、Windows 后端无法执行策略）则**fail closed 拒绝运行**，不会静默降级 codex:394-473 codex:390-395 。

---

## 1. 拒绝如何被识别

- **执行器上报**：`state_rx.borrow().sandbox_denied`，远程 exec-server 可直接标记。
- **启发式**：`is_likely_sandbox_denied(sandbox_type, &exec_output)` 结合退出码与输出文本判断；命中时 `record_filesystem_sandbox_violation` 记遥测，并返回 `UnifiedExecError::sandbox_denied` / `CodexErr::Sandbox(SandboxErr::Denied{output, network_policy_decision})` codex:304-338 codex:828-836 codex:42-52 。
- 网络拒绝可携带 `network_policy_decision`（代理返回的被拒绝 host），转成 `network_approval_context` 供审批提示使用 codex:412-428 。

## 2. 审批与重试决策（`ToolOrchestrator::run` 第二段）

首次尝试在选定沙箱下运行；`Err(SandboxErr::Denied)` 后依次检查 codex:386-473 ：

| 检查 | 结果 |
|---|---|
| `tool.escalate_on_failure()` 为假 | 直接返回拒绝错误 |
| `!wants_no_sandbox_approval(approval_policy)`（`Never`/`OnRequest` 下不许无沙箱重试） | 拒绝（`OnRequest` + 网络决策上下文例外，可转为网络审批提示） |
| `!unsandboxed_allowed`（文件系统策略要求受限且无网络上下文） | 拒绝 |

通过后构造 `retry_reason`（网络场景为 `"Network access to {host} is blocked by policy."`，否则固定文案 `"command failed; retry without sandbox?"`） codex:474-482 codex:622-626 。

**审批发起**：`session.request_approval(action, approval_ctx)`，携带 `GuardianReviewContext`、`retry_reason`、可选 `network_approval_context`；可路由到 Guardian 子代理或用户提示。若 `should_bypass_approval`（缓存命中/`already_approved`）且非 `strict_auto_review`、无网络上下文，则跳过提示直接重试——即"no re-prompt thanks to caching" codex:484-515 codex:8-18 。

## 3. 批准后的重试形态

重试是一次**新的 `SandboxAttempt`**（重新 transform + spawn），有三种形态 codex:517-557 ：

- **沙箱外重试**：`unsandboxed_allowed` 为真 → `retry_sandbox = SandboxType::None`，`sandbox_exe` 置空——直接无沙箱 spawn。
- **重建沙箱**：`unsandboxed_allowed` 为假但策略要求沙箱 → `select_initial` 重选平台沙箱再跑一次（仍受限）。
- **扩大权限**：`SandboxOverride::EscalatedSandboxWithRestrictions` 时用 `baseline.for_approved_command(&policy_context)` 生成 `escalated_profile` 写入 `exec_server_permissions`——即针对已批准命令扩大文件系统写权限（非任意目录授权） codex:236-263 。

## 4. 授权作用域

- 单次命令层面：每个 `SandboxAttempt` 是一次新 spawn，批准只作用于该次重试。
- 会话内复用：`ApprovalStore` 按序列化 key 缓存批准（含 `prefix_rule` 前缀规则，`allow_prefix_rules` 控制），相同命令后续调用走 `should_bypass_approval`/`already_approved` 不再提示——即**批准的缓存效力可延续到会话内重复命令**，但不是全局放宽沙箱。

## 5. 沙箱不可用：fail closed

- transform 阶段出错直接返回 `SandboxTransformError`（MXC 不可用、缺 `sandbox_exe`、网络代理缺失等），不降级 codex:390-419 。
- Windows 后端无法执行 deny-read/受限读策略时报错"refusing to run unsandboxed" codex:87-92 。
- 唯一例外是**策略允许且经审批**的 `SandboxType::None` 重试——这是显式降级而非静默回退。

## Notes

- `ensure_native_sandbox` 在首次尝试前校验 override 与所选沙箱一致，进一步防止静默脱沙箱 codex:341-353 。
- `ApprovalStore`/`should_bypass_approval` 的实现细节（`approvals.rs`/`sandboxing.rs`）不在本次索引片段中；如需确认缓存 key 的粒度可开 Devin 会话查看。
- `strict_auto_review` 下无沙箱重试必须重新过 Guardian 评审 codex:484-488 。

Wiki pages you might want to explore:
- [Unified Exec Process Management (openai/codex)](/wiki/openai/codex#5.3)
- [Tool Orchestration and Approval (openai/codex)](/wiki/openai/codex#5.5)
### Citations
**File:** codex-rs/core/src/tools/orchestrator.rs (L236-263)
```rust
        let (escalated_profile, writable_root_metadata) = if sandbox_override
            == SandboxOverride::EscalatedSandboxWithRestrictions
        {
            let context = environment.sandbox_context(/*additional_permissions*/ None);
            let policy_context = context.policy_context();
            let baseline = permission_profile.file_system_sandbox_policy();
            let file_system = baseline.for_approved_command(&policy_context);
            let writable_root_metadata = file_system_root(&policy_context).is_some_and(|root| {
                file_system.can_write_path(&root, &policy_context)
                    && PROTECTED_METADATA_PATH_NAMES.iter().any(|name| {
                        root.join_descendant(name)
                            .is_ok_and(|path| file_system.can_write_path(&path, &policy_context))
                    })
            });
            let escalated_profile = (file_system != baseline
                && file_system
                    != baseline.materialize_project_roots_with_path_uris(workspace_roots))
            .then(|| {
                PermissionProfile::from_runtime_permissions_with_enforcement(
                    permission_profile.enforcement(),
                    &file_system,
                    permission_profile.network_sandbox_policy(),
                )
            });
            (escalated_profile, writable_root_metadata)
        } else {
            (None, false)
        };
```
**File:** codex-rs/core/src/tools/orchestrator.rs (L341-353)
```rust
        let initial_sandbox = if sandbox_requested && !executor_managed_process_sandbox {
            sandbox_manager.select_initial(
                initial_permissions,
                sandbox_preference,
                windows_sandbox_type,
                managed_network_active,
            )
        } else {
            SandboxType::None
        };
        if !executor_managed_process_sandbox {
            ensure_native_sandbox(sandbox_override, initial_sandbox)?;
        }
```
**File:** codex-rs/core/src/tools/orchestrator.rs (L386-473)
```rust
        match first_result {
            Ok(out) => {
                // We have a successful initial result
                Ok(OrchestratorRunResult {
                    output: out,
                    deferred_network_approval: first_deferred_network_approval,
                })
            }
            Err(ToolError::Codex(err)) => {
                let CodexErrorDetails::Sandbox(SandboxErr::Denied {
                    output,
                    network_policy_decision,
                }) = err.details()
                else {
                    let err = ToolError::Codex(err);
                    if let Some(outcome) = sandbox_outcome_from_tool_error(&err) {
                        otel.sandbox_outcome(
                            &otel_tn,
                            otel_ci,
                            outcome,
                            initial_duration,
                            /*escalated_duration*/ None,
                        );
                    }
                    return Err(err);
                };
                let network_approval_context = if managed_network_active {
                    network_policy_decision
                        .as_ref()
                        .and_then(network_approval_context_from_payload)
                } else {
                    None
                };
                if network_policy_decision.is_some() && network_approval_context.is_none() {
                    otel.sandbox_outcome(
                        &otel_tn,
                        otel_ci,
                        "denied",
                        initial_duration,
                        /*escalated_duration*/ None,
                    );
                    return Err(ToolError::Codex(err));
                }
                if !tool.escalate_on_failure() {
                    otel.sandbox_outcome(
                        &otel_tn,
                        otel_ci,
                        "denied",
                        initial_duration,
                        /*escalated_duration*/ None,
                    );
                    return Err(ToolError::Codex(err));
                }
                // Under `Never` or `OnRequest`, do not retry without sandbox;
                // surface a concise sandbox denial that preserves the
                // original output.
                if !tool.wants_no_sandbox_approval(approval_policy) {
                    let allow_on_request_network_prompt =
                        matches!(approval_policy, AskForApproval::OnRequest)
                            && network_approval_context.is_some()
                            && matches!(
                                default_exec_approval_requirement(
                                    approval_policy,
                                    &file_system_sandbox_policy
                                ),
                                ExecApprovalRequirement::NeedsApproval { .. }
                            );
                    if !allow_on_request_network_prompt {
                        otel.sandbox_outcome(
                            &otel_tn,
                            otel_ci,
                            "denied",
                            initial_duration,
                            /*escalated_duration*/ None,
                        );
                        return Err(ToolError::Codex(err));
                    }
                }
                if !unsandboxed_allowed && network_approval_context.is_none() {
                    otel.sandbox_outcome(
                        &otel_tn,
                        otel_ci,
                        "denied",
                        initial_duration,
                        /*escalated_duration*/ None,
                    );
                    return Err(ToolError::Codex(err));
                }
```
**File:** codex-rs/core/src/tools/orchestrator.rs (L474-482)
```rust
                let retry_reason =
                    if let Some(network_approval_context) = network_approval_context.as_ref() {
                        format!(
                            "Network access to \"{}\" is blocked by policy.",
                            network_approval_context.host
                        )
                    } else {
                        build_denial_reason_from_output(output.as_ref())
                    };
```
**File:** codex-rs/core/src/tools/orchestrator.rs (L484-515)
```rust
                // Strict auto-review approval covers the sandboxed attempt only;
                // retrying without the sandbox requires a fresh guardian review.
                let bypass_retry_approval = !strict_auto_review
                    && tool.should_bypass_approval(approval_policy, already_approved)
                    && network_approval_context.is_none();
                if !bypass_retry_approval {
                    let approval_reason = match &requirement {
                        ExecApprovalRequirement::NeedsApproval { reason, .. } => reason.clone(),
                        ExecApprovalRequirement::Skip { .. }
                        | ExecApprovalRequirement::Forbidden { .. } => None,
                    };
                    let action = tool
                        .approval_action(req, &tool_ctx.call_id)
                        .map_err(|err| {
                            ToolError::Rejected(format!("could not prepare approval action: {err}"))
                        })?;
                    let approval_ctx = ApprovalContext {
                        review_context: GuardianReviewContext::from(&tool_ctx.step_context),
                        cancellation_token: Some(tool_ctx.cancellation_token.clone()),
                        call_id: tool_ctx.call_id.clone(),
                        tool_name: tool_ctx.tool_name.clone(),
                        strict_auto_review,
                        approval_reason,
                        retry_reason: Some(retry_reason),
                        network_approval_context: network_approval_context.clone(),
                    };

                    tool_ctx
                        .session
                        .request_approval(action, approval_ctx)
                        .await?;
                }
```
**File:** codex-rs/core/src/tools/orchestrator.rs (L517-557)
```rust
                let retry_sandbox_requested = !unsandboxed_allowed
                    && sandbox_manager.should_sandbox(
                        initial_permissions,
                        sandbox_preference,
                        managed_network_active,
                    );
                let retry_sandbox = if retry_sandbox_requested && !executor_managed_process_sandbox
                {
                    sandbox_manager.select_initial(
                        initial_permissions,
                        sandbox_preference,
                        windows_sandbox_type,
                        managed_network_active,
                    )
                } else {
                    SandboxType::None
                };
                let retry_sandbox_exe = if unsandboxed_allowed {
                    None
                } else {
                    codex_sandbox_exe
                };
                let retry_attempt = SandboxAttempt {
                    sandbox_override,
                    sandbox: retry_sandbox,
                    sandbox_requested: retry_sandbox_requested,
                    permissions: initial_permissions,
                    exec_server_permissions: escalated_profile
                        .as_ref()
                        .unwrap_or(permission_profile),
                    enforce_managed_network: managed_network_active,
                    manager: &sandbox_manager,
                    sandbox_cwd: &sandbox_policy_cwd,
                    workspace_roots,
                    sandbox_exe: retry_sandbox_exe,
                    use_legacy_landlock: sandbox_config.use_legacy_landlock,
                    windows_sandbox_type,
                    windows_sandbox_level: sandbox_config.windows_sandbox_level,
                    network_denial_cancellation_token: None,
                    network_proxy: None,
                };
```
**File:** codex-rs/core/src/tools/orchestrator.rs (L622-626)
```rust
fn build_denial_reason_from_output(_output: &ExecToolCallOutput) -> String {
    // Keep approval reason terse and stable for UX/tests, but accept the
    // output so we can evolve heuristics later without touching call sites.
    "command failed; retry without sandbox?".to_string()
}
```
**File:** codex-rs/sandboxing/src/manager.rs (L390-419)
```rust
            SandboxType::WindowsMxc => {
                if !codex_mxc_sandbox::is_available() {
                    return Err(SandboxTransformError::WindowsMxcPreparation(
                        "native MXC is unavailable on this executor".to_string(),
                    ));
                }
                if enforce_managed_network && command.managed_network.is_none() {
                    let network = network.ok_or_else(|| {
                        SandboxTransformError::WindowsMxcPreparation(
                            "managed networking requires an executor-local proxy".to_string(),
                        )
                    })?;
                    let prepared = network
                        .prepare_for_optional_environment(
                            std::mem::take(&mut command.env),
                            environment_id,
                        )
                        .map_err(|err| {
                            SandboxTransformError::EnvironmentNetworkProxy(err.to_string())
                        })?;
                    command.env = prepared.env;
                    command.managed_network = Some(prepared.sandbox_context);
                }
                let managed_network = command.managed_network.filter(|_| enforce_managed_network);
                let pending = pending_sandboxed_request?;
                let exe = sandbox_exe.ok_or_else(|| {
                    SandboxTransformError::WindowsMxcPreparation(
                        "missing Codex executable path".to_string(),
                    )
                })?;
```
**File:** codex-rs/core/src/unified_exec/process.rs (L304-338)
```rust
    pub(super) async fn check_for_sandbox_denial_with_text(
        &self,
        text: &str,
    ) -> Result<(), UnifiedExecError> {
        let executor_reported_denial = self.state_rx.borrow().sandbox_denied;
        let sandbox_type = self.sandbox_type().unwrap_or(SandboxType::None);
        if !self.has_exited() || (!executor_reported_denial && sandbox_type == SandboxType::None) {
            return Ok(());
        }

        let exit_code = self.exit_code().unwrap_or(-1);
        let exec_output = ExecToolCallOutput {
            exit_code,
            stderr: StreamOutput::new(text.to_string()),
            aggregated_output: StreamOutput::new(text.to_string()),
            ..Default::default()
        };
        let likely_sandbox_denial = is_likely_sandbox_denied(sandbox_type, &exec_output);
        if likely_sandbox_denial {
            record_filesystem_sandbox_violation(sandbox_type, &exec_output);
        }
        if executor_reported_denial || likely_sandbox_denial {
            let snippet = formatted_truncate_text(
                text,
                TruncationPolicy::Tokens(UNIFIED_EXEC_OUTPUT_MAX_TOKENS),
            );
            let message = if snippet.is_empty() {
                format!("Process exited with code {exit_code}")
            } else {
                snippet
            };
            return Err(UnifiedExecError::sandbox_denied(message, exec_output));
        }
        Ok(())
    }
```
**File:** codex-rs/core/src/exec.rs (L828-836)
```rust
            if is_likely_sandbox_denied(sandbox_type, &exec_output) {
                if capture_policy != ExecCapturePolicy::SensitiveFullBuffer {
                    record_filesystem_sandbox_violation(sandbox_type, &exec_output);
                }
                return Err(CodexErr::Sandbox(SandboxErr::Denied {
                    output: Box::new(exec_output),
                    network_policy_decision: None,
                }));
            }
```
**File:** codex-rs/protocol/src/error.rs (L42-52)
```rust
#[derive(Error, Debug)]
pub enum SandboxErr {
    /// Error from sandbox execution
    #[error(
        "sandbox denied exec error, exit code: {}, stdout: {}, stderr: {}",
        .output.exit_code, .output.stdout.text, .output.stderr.text
    )]
    Denied {
        output: Box<ExecToolCallOutput>,
        network_policy_decision: Option<NetworkPolicyDecisionPayload>,
    },
```
**File:** codex-rs/core/src/unified_exec/mod.rs (L8-18)
```rust
//! - Spawns the PTY from a sandbox-transformed `ExecRequest`; on sandbox denial,
//!   retries without sandbox when policy allows (no re‑prompt thanks to caching).
//! - Uses the shared `is_likely_sandbox_denied` heuristic to keep denial messages
//!   consistent with other exec paths.
//!
//! Flow at a glance (open process)
//! 1) Build a small request `{ command, cwd }`.
//! 2) Orchestrator: approval (bypass/cache/prompt) → select sandbox → run.
//! 3) Runtime: transform `SandboxTransformRequest` -> `ExecRequest` -> spawn PTY.
//! 4) If denial, orchestrator retries with `SandboxType::None`.
//! 5) Process handle is returned with streaming output + metadata.
```
