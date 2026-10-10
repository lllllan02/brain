## Q9
沙箱按工具调用、任务、会话还是用户创建？连续两次命令共享哪些文件、进程和环境变量？CPU、内存、进程数、磁盘和运行时间分别由谁限制？创建失败、断连和取消时如何回收，哪些外部修改不会被回滚？
### Answer
**简答**：沙箱按**每次 spawn（每个 `SandboxAttempt` / 每次工具调用的进程启动）**创建，不按任务、会话或用户——`SandboxExecRequest` 注释明确要求只在执行边界构建，重试也是一次全新 transform+spawn codex:97-101 。连续两次命令**只共享宿主机文件系统**（可写根的修改持久可见），不共享进程（各自独立 PID namespace/进程组）和环境变量（每次 spawn 从策略重建）。资源限制很少：进程数由 `MAX_UNIFIED_EXEC_PROCESSES = 64`（应用层 LRU）、运行时间由 `ExecExpiration` 超时杀进程组控制；**没有可见的 cgroup/rlimit 级 CPU、内存、磁盘配额**。回收靠进程组信号 + `kill_on_drop` + pdeathsig；文件写入、网络副作用等外部修改**一律不回滚** codex:91-107 。

---

## 1. 沙箱创建粒度：每次 spawn

- `transform` → `SandboxExecRequest` 在每次进程启动前执行；审批后的重试是"一次新的 `SandboxAttempt`"（重新走 transform + spawn），注释明确"只能在执行边界构建" codex:97-117 codex:1310-1324 。
- exec-server 路径同理：`prepare_exec_request` 对单个 `ExecParams` 调 `transform_for_direct_spawn` 包装 argv codex:212-227 。
- 例外视角：`unified_exec` 的 PTY 进程可通过 `write_stdin` 跨多次工具调用存活——那是**进程会话**的存续，不是沙箱实例的复用；同一进程内的后续输入仍在当初创建的同一个沙箱内。

## 2. 连续两次命令之间共享什么

| 资源 | 是否共享 | 依据 |
|---|---|---|
| 文件系统（可写根内） | ✅ 共享且持久 | bwrap 是 mount namespace 视图，宿主目录真实被写入；无快照/overlay 回滚 |
| 进程 | ❌ 各自独立 | 默认 `--unshare-pid` + 新 `/proc`；每次 spawn 独立进程组 codex:91-107 （`--linux-sandbox-pid-namespace=inherit` 的受信部署除外 codex:108-120 ） |
| 环境变量 | ❌ 每次重建 | `open_session_with_sandbox` 每次调 `create_env(shell_environment_policy)` + 注入 `CODEX_THREAD_ID`/tool call id/permission profile env，再走凭据虚拟化——上一次命令里 `export` 的变量不会带出 codex:1439-1460  |
| 网络命名空间 | ❌ | `--unshare-net` 每次新建 |

例外：同一 `UnifiedExecProcess`（PTY 会话）内的多条命令自然共享该进程的 cwd/env/子进程。

## 3. 资源限制由谁实施

| 维度 | 机制 | 层级 |
|---|---|---|
| 进程数 | `ProcessStore` LRU，`MAX_UNIFIED_EXEC_PROCESSES = 64` | 应用层（Agent 内） |
| 运行时间 | `ExecExpiration` 超时 → `kill_child_process_group`（SIGKILL 组） codex:1383-1445  | 应用层 |
| CPU / 内存 / 磁盘配额 | **索引中未见 cgroup、rlimit 或配额设置**；bwrap/Seatbelt/受限令牌均不做资源记账；MXC runner 的 job 是 Windows 上最接近的容器级约束 | — |
| 磁盘写范围 | 文件系统策略（writable roots）限**位置**不限**量** | OS 强制 |

## 4. 回收与失败路径

- **创建失败**：transform/prepare 阶段报错直接 fail closed（`"sandbox intent cannot be enforced on this executor"` codex:223-227 ）；spawn 出错映射为 `UnifiedExecError::create_process` codex:1410-1424 。
- **取消**：先 SIGTERM 进程组 → 宽限期 → SIGKILL 升级；超时直接 SIGKILL 组（见前轮 `consume_output` 分析）。
- **断连/主进程退出**：Unix 上 `PR_SET_PDEATHSIG` + `kill_on_drop`；bwrap 层 `terminate_with_parent` + 合成挂载/protected-create 清理 codex:585-634 ；Windows 上 Job Object 终止杀后代，但**正常退出有意保留后代**；MXC runner 则在前台进程退出或取消时终止全部后代（行为差异已注明） codex:76-80 。
- **不回滚的外部修改**：可写根内的文件增删改、Git 状态变化、经代理发出的网络请求副作用、Windows ACL 授予（capability SID 条目按启动需求施加 codex:754-775 ）——沙箱是**访问控制**而非事务层，无任何快照/undo 机制。

## Notes

- 判读"按什么创建"的最强证据是结构：`SandboxTransformRequest`/`SandboxExecRequest` 是逐 spawn 的值对象，会话级状态只存在于 `TurnEnvironment` 的策略侧（决定**用什么策略**），不在沙箱实例侧。
- 索引中未见 CPU/内存/磁盘配额的任何实现；如果存在也应只在 MXC/PSEC 侧，需要查看 `mxc-sandbox` 完整源码确认，建议开 Devin 会话。

Wiki pages you might want to explore:
- [Unified Exec Process Management (openai/codex)](/wiki/openai/codex#5.3)
- [Sandboxing Implementation (openai/codex)](/wiki/openai/codex#5.6)
- [Exec Server (openai/codex)](/wiki/openai/codex#4.7)

Wiki pages you might want to explore:
- [Unified Exec Process Management (openai/codex)](/wiki/openai/codex#5.3)
- [Tool Orchestration and Approval (openai/codex)](/wiki/openai/codex#5.5)
- [Sandboxing Implementation (openai/codex)](/wiki/openai/codex#5.6)
### Citations
**File:** codex-rs/sandboxing/src/manager.rs (L97-117)
```rust
/// A host-native launch request produced after [`SandboxManager::transform`] validates URI inputs.
/// Build this only at the execution boundary: in exec-server, or in its logical equivalent within
/// app-server. Orchestration and transport code should retain [`PathUri`] values and defer
/// conversion to native paths until this request is created.
#[derive(Clone, Debug)]
pub struct SandboxExecRequest {
    /// Controller-selected override, retained for observations without altering the sandbox command.
    pub sandbox_override: SandboxOverride,
    pub command: Vec<String>,
    pub cwd: PathUri,
    pub sandbox_policy_cwd: PathUri,
    pub env: HashMap<String, String>,
    pub network: Option<NetworkProxy>,
    pub network_environment_id: Option<String>,
    pub sandbox: SandboxType,
    // TODO(anp): Reconcile these backend copies with the supplied sandbox context
    // (TurnEnvironment::sandbox_context for turns), preserving this launch snapshot.
    pub windows_sandbox_level: WindowsSandboxLevel,
    pub permission_profile: PermissionProfile,
    pub arg0: Option<String>,
}
```
**File:** codex-rs/linux-sandbox/README.md (L91-107)
```markdown
- When bubblewrap is active, the helper explicitly isolates the user namespace via
  `--unshare-user`. By default it also creates a PID namespace via `--unshare-pid`.
- When bubblewrap is active and network is restricted without proxy routing, the helper also
  isolates the network namespace via `--unshare-net`.
- In managed proxy mode, the helper uses `--unshare-net` plus an internal
  TCP->UDS->TCP routing bridge so tool traffic reaches only configured proxy
  endpoints.
- In managed proxy mode, after the bridge is live, seccomp allows IP sockets
  inside the isolated network namespace and blocks new standalone `AF_UNIX`
  sockets unless `dangerously_allow_all_unix_sockets` is granted. Unix socket
  pairs remain allowed for communication between related processes.
- When bubblewrap is active, it mounts a fresh `/proc` via `--proc /proc` by default.
  If that mount is denied, it retains the inherited `/proc` and still creates a
  PID namespace, preserving the existing fallback. `--no-proc` also retains the
  inherited `/proc` without disabling PID isolation. In these cases, process IDs
  inside the sandbox can differ from those exposed by `/proc`. Default invocations
  send no new helper flags and remain compatible with older helpers.
```
**File:** codex-rs/linux-sandbox/README.md (L108-120)
```markdown
- Trusted provisioning of a dedicated environment can start
  `codex exec-server --linux-sandbox-pid-namespace=inherit`. This startup-only
  setting applies to both process and filesystem helpers; repository config and
  command environment variables cannot enable it. The helper receives the new
  `--inherit-pid-namespace` option, which requires an updated helper; deploy the
  helper and startup flag together.
  Inheritance reuses the caller's PID namespace and `/proc` together, omitting
  `--unshare-pid` and `--as-pid-1`. This preserves process lookups but allows
  sandboxed commands to signal other same-UID processes, including the executor.
  With `:minimal`, the existing `/proc` is bound read-only, preserving its
  container masks; explicit filesystem denials are applied afterward.
  Filesystem, user, IPC, network, seccomp, and existing container `/proc` masks
  remain in force. The default `isolate` mode retains PID isolation.
```
**File:** codex-rs/core/src/unified_exec/process_manager.rs (L1310-1324)
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
            let backend = environment.get_exec_backend();
            let params = exec_server_params_for_request(
                process_id,
                request,
```
**File:** codex-rs/core/src/unified_exec/process_manager.rs (L1410-1424)
```rust
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
**File:** codex-rs/exec-server/src/process_sandbox.rs (L212-227)
```rust
    let sandbox_manager = SandboxManager::new()
        .with_linux_sandbox_pid_namespace(runtime_paths.linux_sandbox_pid_namespace);
    #[cfg(target_os = "macos")]
    let sandbox_manager = sandbox_manager
        .with_allowed_symlinked_codex_home(runtime_paths.allowed_symlinked_codex_home.clone());
    let (sandbox, windows_sandbox_level) = select_sandbox(
        &sandbox_manager,
        &permissions,
        sandbox_context,
        params.enforce_managed_network,
    );
    if sandbox == SandboxType::None {
        return Err(invalid_params(
            "sandbox intent cannot be enforced on this executor".to_string(),
        ));
    }
```
**File:** codex-rs/core/src/exec_tests.rs (L1383-1445)
```rust
async fn kill_child_process_group_kills_grandchildren_on_timeout() -> Result<()> {
    // On Linux/macOS, /bin/bash is typically present; on FreeBSD/OpenBSD,
    // prefer /bin/sh to avoid NotFound errors.
    #[cfg(any(target_os = "freebsd", target_os = "openbsd"))]
    let command = vec![
        "/bin/sh".to_string(),
        "-c".to_string(),
        "sleep 60 & echo $!; sleep 60".to_string(),
    ];
    #[cfg(all(unix, not(any(target_os = "freebsd", target_os = "openbsd"))))]
    let command = vec![
        "/bin/bash".to_string(),
        "-c".to_string(),
        "sleep 60 & echo $!; sleep 60".to_string(),
    ];
    let cwd = codex_utils_absolute_path::AbsolutePathBuf::current_dir()?;
    let env: HashMap<String, String> = std::env::vars().collect();
    let params = ExecParams {
        command,
        cwd,
        expiration: 500.into(),
        capture_policy: ExecCapturePolicy::ShellTool,
        env,
        network: None,
        network_environment_id: None,
        sandbox_permissions: SandboxPermissions::UseDefault,
        windows_sandbox_level: codex_protocol::config_types::WindowsSandboxLevel::Disabled,
        justification: None,
        arg0: None,
    };

    let output = exec(
        params,
        NetworkSandboxPolicy::Restricted,
        /*stdout_stream*/ None,
        /*after_spawn*/ None,
    )
    .await?;
    assert!(output.timed_out);

    let stdout = output.stdout.from_utf8_lossy().text;
    let pid_line = stdout.lines().next().unwrap_or("").trim();
    let pid: i32 = pid_line.parse().map_err(|error| {
        io::Error::new(
            io::ErrorKind::InvalidData,
            format!("Failed to parse pid from stdout '{pid_line}': {error}"),
        )
    })?;

    let mut killed = false;
    for _ in 0..20 {
        // Use kill(pid, 0) to check if the process is alive.
        if unsafe { libc::kill(pid, 0) } == -1
            && let Some(libc::ESRCH) = std::io::Error::last_os_error().raw_os_error()
        {
            killed = true;
            break;
        }
        tokio::time::sleep(Duration::from_millis(100)).await;
    }

    assert!(killed, "grandchild process with pid {pid} is still alive");
    Ok(())
```
**File:** codex-rs/linux-sandbox/src/linux_run_main.rs (L585-634)
```rust
fn run_bwrap_in_child_with_synthetic_mount_cleanup(bwrap_args: crate::bwrap::BwrapArgs) -> ! {
    let crate::bwrap::BwrapArgs {
        args,
        preserved_files,
        synthetic_mount_targets,
        protected_create_targets,
    } = bwrap_args;
    let setup_signal_mask = ForwardedSignalMask::block();
    let synthetic_mount_registrations = register_synthetic_mount_targets(&synthetic_mount_targets);
    let protected_create_registrations =
        register_protected_create_targets(&protected_create_targets);
    let exec_start_pipe = create_exec_start_pipe(!protected_create_targets.is_empty());
    let parent_pid = unsafe { libc::getpid() };
    let pid = unsafe { libc::fork() };
    if pid < 0 {
        let err = std::io::Error::last_os_error();
        panic!("failed to fork for bubblewrap: {err}");
    }

    if pid == 0 {
        reset_forwarded_signal_handlers_to_default();
        setup_signal_mask.restore();
        let setpgid_res = unsafe { libc::setpgid(0, 0) };
        if setpgid_res < 0 {
            let err = std::io::Error::last_os_error();
            panic!("failed to place bubblewrap child in its own process group: {err}");
        }
        terminate_with_parent(parent_pid);
        wait_for_parent_exec_start(exec_start_pipe[0], exec_start_pipe[1]);
        exec_bwrap(args, preserved_files);
    }

    drop(preserved_files);
    close_child_exec_start_read(exec_start_pipe[0]);
    let protected_create_monitor = ProtectedCreateMonitor::start(&protected_create_targets);
    let signal_forwarders = install_bwrap_signal_forwarders(pid);
    release_child_exec_start(exec_start_pipe[1]);
    setup_signal_mask.restore();
    let status = wait_for_bwrap_child(pid);
    let cleanup_signal_mask = ForwardedSignalMask::block();
    BWRAP_CHILD_PID.store(0, Ordering::SeqCst);
    let protected_create_monitor_violation = protected_create_monitor
        .map(ProtectedCreateMonitor::stop)
        .unwrap_or(false);
    cleanup_synthetic_mount_targets(&synthetic_mount_registrations);
    let protected_create_violation = protected_create_monitor_violation
        || cleanup_protected_create_targets(&protected_create_registrations);
    signal_forwarders.restore();
    cleanup_signal_mask.restore();
    exit_with_wait_status_or_policy_violation(status, protected_create_violation);
```
**File:** codex-rs/mxc-sandbox/README.md (L76-80)
```markdown
- The upstream runner terminates remaining descendants when the foreground
  process exits, as well as on cancellation. Both existing Windows backends
  preserve descendants after normal exit, so detached servers currently lose
  that behavior under MXC. Retaining descendants safely requires a longer-lived
  owner for the native policy and job.
```
**File:** codex-rs/windows-sandbox-rs/src/lib.rs (L754-775)
```rust
        let capability_roots =
            legacy_session_capability_roots(&permissions, &current_dir, &env_map, codex_home);
        let security = prepare_legacy_session_security(
            uses_write_capabilities,
            codex_home,
            cwd,
            capability_roots,
        )?;
        allow_null_device_for_workspace_write(uses_write_capabilities);
        apply_legacy_session_acl_rules(
            &permissions,
            codex_home,
            &current_dir,
            &env_map,
            &additional_deny_read_paths,
            &additional_deny_write_paths,
            LegacyAclSids {
                readonly_sid: security.readonly_sid.as_ref(),
                readonly_sid_str: security.readonly_sid_str.as_deref(),
                write_root_sids: &security.write_root_sids,
            },
        )?;
```
