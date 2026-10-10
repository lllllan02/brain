## Q2
请以 Agent 执行 python task.py 为例，从工具调用入口追踪到实际创建进程的位置。依次说明参数解析、权限判断、沙箱选择、限制配置、进程启动和结果回传，列出关键函数调用链。
### Answer
以 `exec_command` 工具执行 `python task.py` 为例，完整调用链为：

`ExecCommandHandler::handle_call` → `UnifiedExecProcessManager::open_session_with_sandbox` → `ToolOrchestrator::run`（审批 + 沙箱选择 + 重试）→ `UnifiedExecRuntime::run_attempt` → `SandboxManager::transform` → `open_session_with_prepared_exec_env` → `codex_sandboxing::spawn_process`（本地）或 exec-server `backend.start`（远程）→ `spawn_child_async` → `start_streaming_output` / `spawn_exit_watcher` 回传输出 codex:154-157 codex:1433-1438 codex:652-669 codex:1410-1424 codex:52-62 。

---

## 分阶段追踪

### 1. 参数解析（handler 入口）

`handle_call` 解构 `ToolInvocation`，从 `ToolPayload::Function` 取出 JSON 参数： codex:158-176 

- `parse_arguments::<ExecCommandEnvironmentArgs>` 解析 `environment_id`、`workdir` codex:185-190 
- `resolve_tool_environment` 选定 turn environment（本地或远程环境），cwd 由 `workdir` 拼接 `native_environment_cwd` 得到 `PathUri` codex:191-200 
- 若本地沙箱生效（`requires_host_native_cwd`），`cwd` 必须是主机原生路径约定；远程环境允许 URI 原生 cwd codex:206-230 
- 随后 `parse_arguments_with_base_path` / `parse_arguments` 得到 `ExecCommandArgs`（`cmd` = `"python task.py"`、`tty`、`sandbox_permissions`、`justification` 等） codex:231-241 
- `resolve_sandbox_permissions` 校验模型请求的沙箱权限与 justification codex:247-248 
- shell 解析：远程环境校验请求的 shell 与环境报告的类型一致，否则回退 `session.user_shell()` codex:261-284 

### 2. 权限判断（审批）

`open_session_with_sandbox` 中调用 `exec_policy.create_exec_approval_requirement_for_shell`，传入命令、`approval_policy`、`permission_profile`、`windows_sandbox_level`、`sandbox_permissions`、`prefix_rule`，得到 `ExecApprovalRequirement`（Skip / NeedsApproval / Forbidden） codex:1477-1502 。

随后 `ToolOrchestrator::run(&mut UnifiedExecRuntime, &req, &tool_ctx)` 统一处理审批缓存/用户提示/Guardian 审查、沙箱选择和拒绝重试——总流程在模块注释中写明：approval → select sandbox → run，拒绝时按策略以 `SandboxType::None` 重试 codex:1529-1532 codex:13-18 。

### 3. 沙箱选择与变换

- `SandboxManager::select_initial` 决定 `SandboxType`（Seatbelt / bwrap+Landlock / WindowsRestrictedToken / None），`effective_windows_sandbox_type` 参与决策 codex:206-215 
- `UnifiedExecRuntime::run_attempt` 中 `build_unified_exec_sandbox_command` 构造 `SandboxCommand{program, args, cwd, env}`；若基线权限含 deny-read 且本轮升级了文件系统权限，则附加 `with_filesystem_escalation` codex:626-644 
- 变换为宿主可执行请求：本地经 `SandboxManager::transform`，直接 spawn 时走 `transform_for_direct_spawn`（Windows 受限令牌需 `codex_home` 并包装 helper 命令行） codex:568-603 
- 远程执行器一侧在 exec-server 的 `process_sandbox.rs` 构建同样的 `SandboxDirectSpawnTransformRequest` 自行变换 codex:266-293 

### 4. 限制配置（env / 超时 / 网络）

- 环境变量：`create_env` + 注入 `CODEX_THREAD_ID`、tool call id、session env、apply-patch env、permission profile env，最后 `apply_unified_exec_env`/`strip_output_env` codex:1439-1460 
- 进程数上限 `MAX_UNIFIED_EXEC_PROCESSES = 64`，超出时按 `last_used` LRU 裁剪；yield 时间夹在 250ms–30s codex:47-64 
- 网络：`NetworkProxy` / `ManagedNetworkSandboxContext` 挂在请求上；`spawn_child_async` 中若网络沙箱未启用则注入 `CODEX_SANDBOX_NETWORK_DISABLED=1` codex:80-88 

### 5. 进程启动（实际 spawn 点）

`open_session_with_prepared_exec_env` 分两路： codex:1310-1320 

- **远程 / shell 快照**：`environment.get_exec_backend().start(params)` 经 exec-server 协议 spawn（exec-server 内最终走 `process_sandbox.rs` → `codex_utils_pty`） codex:1338-1354 codex:3-15 
- **本地**：`codex_sandboxing::spawn_process(SpawnRequest{command, cwd, env, sandbox, tty, ...})` 真正创建 PTY 子进程；Windows 受限令牌时附带 `WindowsSandboxSpawnRequest`（workspace_roots、level、proxy SID） codex:1396-1424 
- 底层 `spawn_child_async` 设置 `arg0`、`current_dir`、清理 env、`pre_exec` 中脱离 tty + Linux `set_parent_death_signal` + macOS 关闭继承 fd，最后 `cmd.kill_on_drop(true).spawn()` codex:94-137 
- app-server 的非交互 `command/exec` 路径类似：`build_exec_request` → `command_exec_manager.start` codex:317-342 

### 6. 结果回传

- spawn 后 `UnifiedExecProcess::from_spawned` / `from_exec_server_started` 包装为 `UnifiedExecProcess`，存入 `ProcessStore` codex:1422-1424 
- `start_streaming_output` 持续广播 `ExecCommandOutputDelta` 事件；`spawn_exit_watcher` 在进程结束时发 `ExecCommandEnd` 附完整 transcript codex:60-63 
- 输出经 `HeadTailBuffer` 截断（1 MiB 头尾保留），最终以 `ExecCommandToolOutput` 返回模型；沙箱拒绝错误映射为 `UnifiedExecError::sandbox_denied` 供 orchestrator 重试 codex:1533-1548 

## 调用链速查

```
exec_command tool call ("python task.py")
└─ ExecCommandHandler::handle_call                    # 参数解析、cwd/shell/env 解析
   └─ UnifiedExecProcessManager::open_session_with_sandbox
      ├─ exec_policy.create_exec_approval_requirement_for_shell  # 权限判断
      └─ ToolOrchestrator::run                        # 审批 + 沙箱选择 + 拒绝重试
         └─ UnifiedExecRuntime::run_attempt
            ├─ build_unified_exec_sandbox_command
            ├─ SandboxManager::transform / transform_for_direct_spawn   # 限制配置→命令行
            └─ open_session_with_prepared_exec_env
               ├─ remote: backend.start() → exec-server process_sandbox.rs → pty spawn
               └─ local: codex_sandboxing::spawn_process → spawn_child_async → .spawn()
   ← UnifiedExecProcess → start_streaming_output + spawn_exit_watcher → 事件流 + ToolOutput
```

## Notes

- `exec_command` 经 shell 运行（`user_shell`），实际沙箱化的是包装后的 `bash -c "python task.py"` 进程，而非直接 exec `python`。
- 索引中未包含 `ToolOrchestrator::run`、`UnifiedExecRuntime::run_attempt` 开头及 `codex_sandboxing::spawn_process` 的实现细节（仅见其调用点），如需逐行确认重试/降级逻辑可开启 Devin 会话查看完整文件。
- `ExecCommandHandler::one_shot` 变体移除 `tty`/`yield_time_ms`，改为 `timeout_ms`，用于一次性命令，但走同一 spawn 链路 codex:470-499 。

Wiki pages you might want to explore:
- [Unified Exec Process Management (openai/codex)](/wiki/openai/codex#5.3)
- [Tool Orchestration and Approval (openai/codex)](/wiki/openai/codex#5.5)
### Citations
**File:** codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs (L154-157)
```rust
    async fn handle_call(
        &self,
        invocation: ToolInvocation,
    ) -> Result<Box<dyn crate::tools::context::ToolOutput>, FunctionCallError> {
```
**File:** codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs (L158-176)
```rust
        let ToolInvocation {
            session,
            turn,
            step_context,
            cancellation_token,
            tracker,
            call_id,
            payload,
            ..
        } = invocation;

        let arguments = match payload {
            ToolPayload::Function { arguments } => arguments,
            _ => {
                return Err(FunctionCallError::RespondToModel(
                    "exec_command handler received unsupported payload".to_string(),
                ));
            }
        };
```
**File:** codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs (L185-190)
```rust
        let environment_args: ExecCommandEnvironmentArgs = parse_arguments(&arguments)?;
        let turn_environment = resolve_tool_environment(
            &step_context,
            environment_args.environment_id.as_deref(),
            "unified exec is unavailable in this session",
        )?;
```
**File:** codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs (L191-200)
```rust
        let native_environment_cwd = turn_environment.cwd().clone();
        let cwd = environment_args
            .workdir
            .as_deref()
            .filter(|workdir| !workdir.is_empty())
            .map_or_else(
                || Ok(native_environment_cwd.clone()),
                |workdir| native_environment_cwd.join(workdir),
            )
            .map_err(|err| FunctionCallError::RespondToModel(err.to_string()))?;
```
**File:** codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs (L206-230)
```rust
        let requires_host_native_cwd = !environment.is_remote()
            && SandboxManager::new().select_initial(
                turn_environment.permission_profile(),
                SandboxablePreference::Auto,
                codex_protocol::sandbox::effective_windows_sandbox_type(
                    turn_environment.config().windows_sandbox_type,
                    turn_environment.config().windows_sandbox_level,
                ),
                turn.network.is_some(),
            ) != SandboxType::None;
        // `to_abs_path()` alone cannot identify foreign drive paths: `file:///C:/repo` is
        // representable as `/C:/repo` on POSIX. Require the inferred convention to match too.
        let cwd_uses_native_convention =
            cwd.infer_path_convention() == Some(PathConvention::native());
        let native_cwd = match cwd.to_abs_path() {
            Ok(cwd) if cwd_uses_native_convention => Some(cwd),
            _ if !requires_host_native_cwd => None,
            Err(err) => return Err(FunctionCallError::RespondToModel(err.to_string())),
            Ok(_) => {
                return Err(FunctionCallError::RespondToModel(format!(
                    "path URI `{cwd}` does not use the host's native {} path convention",
                    PathConvention::native()
                )));
            }
        };
```
**File:** codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs (L231-241)
```rust
        let mut args: ExecCommandArgs = match native_cwd.as_ref() {
            Some(native_cwd) => {
                // The base path only resolves paths nested in the permissions config types.
                parse_arguments_with_base_path(&arguments, native_cwd)?
            }
            None => {
                // Foreign executor cwd values cannot seed this host's AbsolutePathBufGuard.
                // Sandbox intent and URI-native roots are still sent to the executor.
                parse_arguments(&arguments)?
            }
        };
```
**File:** codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs (L247-248)
```rust
        let sandbox_permissions =
            resolve_sandbox_permissions(args.sandbox_permissions, args.justification.as_deref())?;
```
**File:** codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs (L261-284)
```rust
        let shell = turn_environment
            .shell
            .clone()
            .map(Arc::new)
            .unwrap_or_else(|| session.user_shell());
        // TODO(anp): Resolve requested shells in remote environments instead of restricting
        // commands to the reported default shell.
        if environment.is_remote()
            && let Some(requested_shell) = args.shell.take()
        {
            let Some(remote_shell) = turn_environment.shell.as_ref() else {
                return Err(FunctionCallError::RespondToModel(format!(
                    "environment `{}` does not report a shell",
                    turn_environment.selection.environment_id
                )));
            };
            if detect_shell_type(Path::new(&requested_shell)) != Some(remote_shell.shell_type) {
                return Err(FunctionCallError::RespondToModel(format!(
                    "environment `{}` only supports `{}`",
                    turn_environment.selection.environment_id,
                    remote_shell.name()
                )));
            }
        }
```
**File:** codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs (L470-499)
```rust
fn one_shot_exec_command_spec(spec: ToolSpec) -> ToolSpec {
    let ToolSpec::Function(mut spec) = spec else {
        unreachable!("exec_command has a function schema");
    };
    spec.description = spec.description.replacen(
        "Runs a command in a PTY, returning output or a session ID for ongoing interaction.",
        "Runs a command to completion and returns its output. The process is terminated on timeout or cancellation and cannot be resumed.",
        1,
    );
    let properties = spec.parameters.properties.get_or_insert_default();
    properties.remove("tty");
    properties.remove("yield_time_ms");
    properties.insert(
        "timeout_ms".to_string(),
        JsonSchema::number(Some(
            "Maximum command runtime. Defaults to 10000 ms.".to_string(),
        )),
    );
    spec.output_schema = spec.output_schema.map(|schema| {
        let mut schema = schema.into_value();
        if let Some(output_properties) = schema
            .get_mut("properties")
            .and_then(serde_json::Value::as_object_mut)
        {
            output_properties.remove("session_id");
        }
        schema.into()
    });
    ToolSpec::Function(spec)
}
```
**File:** codex-rs/core/src/unified_exec/process_manager.rs (L47-64)
```rust
use crate::tools::sandboxing::ToolError;
use crate::unified_exec::ExecCommandRequest;
use crate::unified_exec::MAX_UNIFIED_EXEC_PROCESSES;
use crate::unified_exec::MAX_YIELD_TIME_MS;
use crate::unified_exec::MIN_EMPTY_YIELD_TIME_MS;
use crate::unified_exec::MIN_YIELD_TIME_MS;
use crate::unified_exec::ProcessEntry;
use crate::unified_exec::ProcessStore;
use crate::unified_exec::UnifiedExecContext;
use crate::unified_exec::UnifiedExecError;
use crate::unified_exec::UnifiedExecProcessManager;
use crate::unified_exec::WriteStdinInteractionEvent;
use crate::unified_exec::WriteStdinRequest;
use crate::unified_exec::async_watcher::emit_exec_end_for_unified_exec;
use crate::unified_exec::async_watcher::emit_failed_exec_end_for_unified_exec;
use crate::unified_exec::async_watcher::spawn_exit_watcher;
use crate::unified_exec::async_watcher::start_streaming_output;
use crate::unified_exec::clamp_yield_time;
```
**File:** codex-rs/core/src/unified_exec/process_manager.rs (L1310-1320)
```rust
    pub(crate) async fn open_session_with_prepared_exec_env(
        &self,
        process_id: i32,
        request: &ExecRequest,
        tool_ctx: Option<&ToolCtx>,
        windows_sandbox_proxy_settings_mode: codex_sandboxing::WindowsSandboxProxySettingsMode,
        network_policy_decider: Option<Arc<dyn NetworkPolicyDecider>>,
        tty: bool,
        environment: &codex_exec_server::Environment,
    ) -> Result<UnifiedExecProcess, UnifiedExecError> {
        if environment.is_remote() || request.exec_server_shell_snapshot.is_some() {
```
**File:** codex-rs/core/src/unified_exec/process_manager.rs (L1338-1354)
```rust
            let started = match network_policy_decider {
                Some(decider) => {
                    backend
                        .start_with_network_policy_decider(params, decider)
                        .await
                }
                None => backend.start(params).await,
            }
            .map_err(|err| UnifiedExecError::create_process(err.to_string()))?;
            let output_drain_policy = if environment.is_remote() {
                OutputDrainPolicy::WaitForOutputClosure
            } else {
                OutputDrainPolicy::BoundedAfterExit
            };
            return UnifiedExecProcess::from_exec_server_started(started, output_drain_policy)
                .await;
        }
```
**File:** codex-rs/core/src/unified_exec/process_manager.rs (L1396-1424)
```rust
        let windows_sandbox =
            if request.sandbox == codex_sandboxing::SandboxType::WindowsRestrictedToken {
                Some(codex_sandboxing::WindowsSandboxSpawnRequest {
                    permission_profile: &request.permission_profile,
                    workspace_roots: &request.windows_sandbox_workspace_roots,
                    windows_sandbox_level: request.windows_sandbox_level,
                    proxy_enforced: request.network.is_some(),
                    network_proxy_restricting_sid: network_proxy_restricting_sid.as_deref(),
                    proxy_settings_mode: windows_sandbox_proxy_settings_mode,
                    filesystem_overrides: request.windows_sandbox_filesystem_overrides.as_ref(),
                })
            } else {
                None
            };
        let spawn_result = codex_sandboxing::spawn_process(codex_sandboxing::SpawnRequest {
            command: &request.command,
            cwd: native_cwd.as_path(),
            env: &request.env,
            arg0: &request.arg0,
            sandbox: request.sandbox,
            windows_sandbox,
            tty,
            stdin_open: tty,
            inherited_fds: codex_utils_pty::ChildFds::Inherited(&[]),
        })
        .await;
        let spawned =
            spawn_result.map_err(|err| UnifiedExecError::create_process(err.to_string()))?;
        UnifiedExecProcess::from_spawned(spawned, request.sandbox).await
```
**File:** codex-rs/core/src/unified_exec/process_manager.rs (L1433-1438)
```rust
    pub(super) async fn open_session_with_sandbox(
        &self,
        request: &ExecCommandRequest,
        cwd: PathUri,
        context: &UnifiedExecContext,
    ) -> Result<(UnifiedExecAttempt, Option<DeferredNetworkApproval>), UnifiedExecError> {
```
**File:** codex-rs/core/src/unified_exec/process_manager.rs (L1439-1460)
```rust
        let shell_environment_policy = request.turn_environment.shell_environment_policy();
        let local_policy_env = create_env(shell_environment_policy, /*thread_id*/ None);
        let mut env = local_policy_env.clone();
        #[cfg(windows)]
        env.retain(|name, _| !name.eq_ignore_ascii_case(CODEX_THREAD_ID_ENV_VAR));
        env.insert(
            CODEX_THREAD_ID_ENV_VAR.to_string(),
            context.session.thread_id.to_string(),
        );
        set_tool_call_id_env_var(&mut env, Some(&context.call_id));
        inject_session_env(&mut env, context.session.session_id());
        inject_apply_patch_env(&mut env);
        let active_permission_profile = request.turn_environment.active_permission_profile();
        inject_permission_profile_env(&mut env, active_permission_profile.as_ref());
        let mut env = apply_unified_exec_env(env);
        strip_output_env(&mut env);
        let mut explicit_env_overrides = shell_environment_policy.r#set.clone();
        strip_output_env(&mut explicit_env_overrides);
        let exec_server_env_config = ExecServerEnvConfig {
            policy: exec_env_policy_from_shell_policy(shell_environment_policy),
            local_policy_env,
        };
```
**File:** codex-rs/core/src/unified_exec/process_manager.rs (L1477-1502)
```rust
        let exec_approval_requirement = context
            .session
            .services
            .exec_policy
            .create_exec_approval_requirement_for_shell(
                ExecApprovalRequest {
                    command: &request.command,
                    approval_policy: context.step_context.settings.approval_policy(),
                    permission_profile: request.turn_environment.permission_profile().clone(),
                    environment_policy: request.turn_environment.config().exec_policy.as_ref(),
                    windows_sandbox_level: windows_sandbox_level_for_legacy_checks(
                        request.turn_environment.config().windows_sandbox_type,
                        request.turn_environment.config().windows_sandbox_level,
                    ),
                    sandbox_permissions: if request.additional_permissions_preapproved {
                        crate::sandboxing::SandboxPermissions::UseDefault
                    } else {
                        request.sandbox_permissions
                    },
                    prefix_rule: request.prefix_rule.clone(),
                    allow_prefix_rules: context.step_context.turn.allow_prefix_rules(),
                },
                configured_shell,
                command_platform,
            )
            .await;
```
**File:** codex-rs/core/src/unified_exec/process_manager.rs (L1529-1532)
```rust
        let result = orchestrator
            .run(&mut runtime, &req, &tool_ctx)
            .await
            .map(|result| (result.output, result.deferred_network_approval))
```
**File:** codex-rs/core/src/unified_exec/process_manager.rs (L1533-1548)
```rust
            .map_err(|err| match err {
                ToolError::Codex(err) => match err.details() {
                    CodexErrorDetails::Sandbox(SandboxErr::Denied { output, .. }) => {
                        let output = output.as_ref().clone();
                        let message = if output.aggregated_output.text.is_empty() {
                            let exit_code = output.exit_code;
                            format!("Process exited with code {exit_code}")
                        } else {
                            output.aggregated_output.text.clone()
                        };
                        UnifiedExecError::sandbox_denied(message, output)
                    }
                    _ => UnifiedExecError::create_process(format!("{err:?}")),
                },
                other => UnifiedExecError::create_process(format!("{other:?}")),
            });
```
**File:** codex-rs/core/src/tools/runtimes/unified_exec.rs (L626-644)
```rust
        let baseline_file_system = req
            .turn_environment
            .permission_profile()
            .file_system_sandbox_policy();
        let permissions = if baseline_file_system.has_denied_read_restrictions()
            && attempt.exec_server_permissions.file_system_sandbox_policy() != baseline_file_system
        {
            permissions.with_filesystem_escalation()
        } else {
            permissions
        };

        let command = build_unified_exec_sandbox_command(
            &command,
            &req.cwd,
            &env,
            managed_network_context,
            additional_permissions,
        )
```
**File:** codex-rs/core/src/tools/runtimes/unified_exec.rs (L652-669)
```rust
        let process = self
            .manager
            .open_session_with_exec_env(
                req.process_id,
                ctx,
                command,
                options,
                attempt,
                managed_network,
                network_proxy_launch,
                /*environment_id*/ Some(&req.turn_environment.selection.environment_id),
                req.exec_server_env_config.clone(),
                req.shell_snapshot.clone(),
                windows_sandbox_proxy_settings_mode,
                req.tty,
                req.turn_environment.environment.as_ref(),
            )
            .await;
```
**File:** codex-rs/core/src/spawn.rs (L52-62)
```rust
pub(crate) async fn spawn_child_async(request: SpawnChildRequest<'_>) -> std::io::Result<Child> {
    let SpawnChildRequest {
        program,
        args,
        arg0,
        cwd,
        network_sandbox_policy,
        network,
        stdio_policy,
        mut env,
    } = request;
```
**File:** codex-rs/core/src/spawn.rs (L80-88)
```rust
    if let Some(network) = network {
        network.apply_to_env(&mut env);
    }
    cmd.env_clear();
    cmd.envs(env);

    if !network_sandbox_policy.is_enabled() {
        cmd.env(CODEX_SANDBOX_NETWORK_DISABLED_ENV_VAR, "1");
    }
```
**File:** codex-rs/core/src/spawn.rs (L94-137)
```rust
    #[cfg(unix)]
    unsafe {
        let detach_from_tty = matches!(stdio_policy, StdioPolicy::RedirectForShellTool);
        #[cfg(target_os = "linux")]
        let parent_pid = libc::getpid();
        cmd.pre_exec(move || {
            if detach_from_tty {
                codex_utils_pty::process_group::detach_from_tty()?;
            }

            // This relies on prctl(2), so it only works on Linux.
            #[cfg(target_os = "linux")]
            {
                // This prctl call effectively requests, "deliver SIGTERM when my
                // current parent dies."
                codex_utils_pty::process_group::set_parent_death_signal(parent_pid)?;
            }
            // Close descriptors accidentally inherited by the child.
            #[cfg(target_os = "macos")]
            codex_utils_pty::pty::close_inherited_fds_except(&[]);
            Ok(())
        });
    }

    match stdio_policy {
        StdioPolicy::RedirectForShellTool => {
            // Do not create a file descriptor for stdin because otherwise some
            // commands may hang forever waiting for input. For example, ripgrep has
            // a heuristic where it may try to read from stdin as explained here:
            // https://github.com/BurntSushi/ripgrep/blob/e2362d4d5185d02fa857bf381e7bd52e66fafc73/crates/core/flags/hiargs.rs#L1101-L1103
            cmd.stdin(Stdio::null());

            cmd.stdout(Stdio::piped()).stderr(Stdio::piped());
        }
        StdioPolicy::Inherit => {
            // Inherit stdin, stdout, and stderr from the parent process.
            cmd.stdin(Stdio::inherit())
                .stdout(Stdio::inherit())
                .stderr(Stdio::inherit());
        }
    }

    cmd.kill_on_drop(true).spawn()
}
```
**File:** codex-rs/core/src/unified_exec/mod.rs (L13-18)
```rust
//! Flow at a glance (open process)
//! 1) Build a small request `{ command, cwd }`.
//! 2) Orchestrator: approval (bypass/cache/prompt) → select sandbox → run.
//! 3) Runtime: transform `SandboxTransformRequest` -> `ExecRequest` -> spawn PTY.
//! 4) If denial, orchestrator retries with `SandboxType::None`.
//! 5) Process handle is returned with streaming output + metadata.
```
**File:** codex-rs/sandboxing/src/manager.rs (L568-603)
```rust
    pub fn transform_for_direct_spawn(
        &self,
        request: SandboxDirectSpawnTransformRequest<'_>,
    ) -> Result<SandboxExecRequest, SandboxTransformError> {
        #[cfg(target_os = "windows")]
        if request.transform.sandbox == SandboxType::WindowsRestrictedToken {
            let codex_home = codex_utils_home_dir::find_codex_home()
                .map_err(|err| SandboxTransformError::WindowsSandboxPreparation(err.to_string()))?;
            return self.transform_for_direct_spawn_with_codex_home(request, codex_home.as_path());
        }
        self.transform(request.transform)
    }

    #[cfg(target_os = "windows")]
    fn transform_for_direct_spawn_with_codex_home(
        &self,
        request: SandboxDirectSpawnTransformRequest<'_>,
        codex_home: &Path,
    ) -> Result<SandboxExecRequest, SandboxTransformError> {
        let workspace_roots = request.workspace_roots;
        let proxy_settings_mode = request.windows_sandbox_proxy_settings_mode;
        let sandbox_exe = request.transform.sandbox_exe.ok_or_else(|| {
            SandboxTransformError::WindowsSandboxPreparation(
                "missing Codex executable path".to_string(),
            )
        })?;
        let mut request = self.transform(request.transform)?;
        wrap_windows_sandbox_exec_request_for_direct_spawn(
            &mut request,
            workspace_roots,
            codex_home,
            sandbox_exe,
            proxy_settings_mode,
        )?;
        Ok(request)
    }
```
**File:** codex-rs/exec-server/README.md (L3-15)
```markdown
`codex-exec-server` is the library backing `codex exec-server`, a small
JSON-RPC server for spawning and controlling subprocesses through
`codex-utils-pty`.

It provides:

- a CLI entrypoint: `codex exec-server`
- a Rust client: `ExecServerClient`
- a small protocol module with shared request/response types

This crate owns the transport, protocol, and filesystem/process handlers. The
top-level `codex` binary owns hidden helper dispatch for sandboxed
filesystem operations and `codex-linux-sandbox`.
```
**File:** codex-rs/app-server/src/request_processors/command_exec_processor.rs (L317-342)
```rust
        let exec_request = codex_core::exec::build_exec_request(
            exec_params,
            &effective_permission_profile,
            &sandbox_cwd,
            windows_sandbox_workspace_roots.as_slice(),
            &codex_linux_sandbox_exe,
            &self.arg0_paths.codex_self_exe,
            self.config.effective_local_windows_sandbox_type(),
            use_legacy_landlock,
        )
        .await
        .map_err(|err| internal_error(format!("exec failed: {err}")))?;
        self.command_exec_manager
            .start(StartCommandExecParams {
                outgoing,
                request_id: request_for_task,
                process_id,
                exec_request,
                started_network_proxy: started_network_proxy_for_task,
                tty,
                stream_stdin,
                stream_stdout_stderr,
                output_bytes_cap,
                size,
            })
            .await
```
