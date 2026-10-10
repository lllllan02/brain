## Q3
本项目在不同操作系统上分别使用什么隔离机制？请追踪权限配置如何转换成 Seatbelt profile、bubblewrap 参数、容器配置、系统调用过滤规则或虚拟机配置。哪些限制由操作系统实施，哪些只是应用层检查？
### Answer
**简答**：Codex 按平台把 `PermissionProfile` 转换成不同原生机制——macOS 用 Seatbelt SBPL profile（经 `/usr/bin/sandbox-exec`），Linux 用 bubblewrap 命名空间 + `PR_SET_NO_NEW_PRIVS` + seccomp（Landlock 为 legacy 回退），Windows 用受限令牌 + ACL（或 elevated runner / MXC `BaseContainerRunner`）。这些都是**OS 强制**的；应用层检查只在两处出现：①策略能力验证（后端无法执行某策略时拒绝运行而非降级），②审批/权限决策（`exec_policy`）发生在沙箱之外。本项目没有使用虚拟机 codex:388-435 。

---

## 统一入口：`SandboxManager::transform`

`transform` 以 `SandboxType` 分发到各后端，输入是 `SandboxTransformRequest{command, permissions, sandbox, ...}`，输出是宿主可执行的 `SandboxExecRequest` codex:355-388 。沙箱类型由 `select_initial` 依据 `should_require_platform_sandbox` + `get_platform_sandbox` 决定 codex:313-330 。

### macOS → Seatbelt profile

`SandboxType::MacosSeatbelt` 分支调用 `create_seatbelt_command_args_with_profile`，把 `file_system_sandbox_policy` / `network_sandbox_policy` 编译成 SBPL 文本，最终命令行为 `["/usr/bin/sandbox-exec", "-p", <profile>, ...原命令...]` codex:436-474 。profile 中写权限授予 writable roots，`.git`/`.codex` 等被显式保持只读；debug CLI 还追加 `(deny file-ioctl (ioctl-command TIOCSTI))` 防止向宿主终端注入输入 codex:400-426 。**全部由内核 Seatbelt 强制**。

### Linux → bwrap 参数 + seccomp 规则（+ 可选 Landlock）

两层转换：

1. **外层（transform 时）**：`create_linux_sandbox_command_args_for_permission_profile` 把 `PermissionProfile` 序列化成 JSON 放进 argv：`--sandbox-policy-cwd`、`--command-cwd`、`--permission-profile <json>`、`--managed-network <json>`、`--use-legacy-landlock`，最后 `--` 接原命令，program 换成 `codex-linux-sandbox` helper codex:26-67 。

2. **helper 内（`run_main`）**：bwrap 阶段先建文件系统视图——`--ro-bind / /` 默认只读、`--bind` 叠加可写根、受保护子路径再 `--ro-bind`、unreadable glob 展开后用 mount 遮蔽、`--unshare-user`/`--unshare-pid`/`--unshare-net`/`--proc`；然后 re-exec 自身进入 inner stage codex:294-347 codex:53-68 。

3. **inner stage**：`apply_permission_profile_to_current_thread` 设置 `PR_SET_NO_NEW_PRIVS` 并按 `NetworkSeccompMode` 装 seccomp 过滤器——受限网络拦网络 syscall、文件系统受限时拦 `AF_VSOCK`、所有模式拦 `io_uring`；`apply_landlock_fs` 仅在 legacy 路径启用 Landlock 文件系统规则（不支持受限只读，会报错） codex:45-96 。全部是**内核强制**（namespace、seccomp、Landlock、capability 检查）。

### Windows → 受限令牌 + ACL / elevated runner / MXC 容器

- `SandboxType::WindowsRestrictedToken`：`transform_for_direct_spawn` 把命令包成 `codex.exe` wrapper 参数（`wrap_windows_sandbox_exec_request_for_direct_spawn`），文件系统覆盖由 `resolve_windows_restricted_token_filesystem_overrides` / `resolve_windows_elevated_filesystem_overrides` 预先解析成具体 deny ACE 路径集合 codex:581-603 codex:140-170 。
- **策略能力检查（应用层）**：非 elevated 后端若策略含 deny-read、受限读根、或不匹配的 split writable roots，直接返回错误拒绝运行——"refusing to run unsandboxed" codex:98-131 。实际强制（受限令牌 + 文件/注册表 ACL）由 Windows 内核完成。
- `SandboxType::WindowsMxc`：命令经 Codex helper 进入 Microsoft MXC `BaseContainerRunner`，`create_command_args` 携带 `PermissionProfile` + policy cwd + 代理上下文；不改 ACL、不建沙箱用户、不提权 codex:390-434 codex:3-7 。这是**容器级隔离**（PSEC + job object），由 MXC/OS 强制。

### 文件工具

`sandbox_exec_request` 在 exec-server 中把文件操作同样包装进 `transform_for_direct_spawn`，即文件访问也跑在沙箱化 helper 进程里，而非仅应用层路径检查 codex:178-209 。

## OS 强制 vs 应用层检查

| 层 | 性质 |
|---|---|
| Seatbelt、bwrap namespace/mount、seccomp、Landlock、Windows token+ACL、MXC job | OS 强制 |
| `should_require_platform_sandbox`、能力探测（WSL1 拒绝、MXC `is_available`、Windows 后端策略拒绝） | 应用层预检——防止降级执行 |
| `exec_policy` 审批、`resolve_sandbox_permissions` | 纯应用层策略 |
| `CODEX_SANDBOX_NETWORK_DISABLED` env、`--inherit-pid-namespace` 提示 | 约定式标记，无强制力 |

## Notes

- 无虚拟机机制；MXC 容器是 Windows 上最接近容器/VM 的隔离。
- exec-server 在 spawn 前会把 sandbox helper 路径加入可读根，避免 bwrap re-exec 被自己的文件系统视图挡住 codex:194-211 。
- `run_integrity_checks` 在构建 `ExecRequest` 时验证请求完整性，是另一处应用层检查 codex:117-123 。

Wiki pages you might want to explore:
- [Overview (openai/codex)](/wiki/openai/codex#1)
- [Sandboxing Implementation (openai/codex)](/wiki/openai/codex#5.6)
### Citations
**File:** codex-rs/sandboxing/src/manager.rs (L313-330)
```rust
    pub fn select_initial(
        &self,
        permission_profile: &PermissionProfile,
        pref: SandboxablePreference,
        windows_sandbox_type: SandboxType,
        has_managed_network_requirements: bool,
    ) -> SandboxType {
        #[cfg(windows)]
        crate::windows_mxc::record_availability_once();

        if !self.should_sandbox(permission_profile, pref, has_managed_network_requirements) {
            return SandboxType::None;
        }
        if cfg!(windows) && windows_sandbox_type == SandboxType::WindowsMxc {
            return SandboxType::WindowsMxc;
        }
        get_platform_sandbox(windows_sandbox_type != SandboxType::None).unwrap_or(SandboxType::None)
    }
```
**File:** codex-rs/sandboxing/src/manager.rs (L355-435)
```rust
    pub fn transform(
        &self,
        request: SandboxTransformRequest<'_>,
    ) -> Result<SandboxExecRequest, SandboxTransformError> {
        let SandboxTransformRequest {
            mut command,
            permissions,
            sandbox,
            enforce_managed_network,
            environment_id,
            network,
            sandbox_policy_cwd,
            sandbox_exe,
            use_legacy_landlock,
            windows_sandbox_level,
        } = request;
        #[cfg(target_os = "macos")]
        let managed_network = command.managed_network.as_ref();
        let additional_permissions = command.additional_permissions.take();
        let managed_mitm_ca_trust_bundle_path =
            network.and_then(NetworkProxy::managed_mitm_ca_trust_bundle_path);
        let base_effective_permission_profile =
            effective_permission_profile(permissions, additional_permissions.as_ref());
        let pending_sandboxed_request = PendingSandboxedExecRequest::new(
            &command.cwd,
            sandbox_policy_cwd,
            base_effective_permission_profile.clone(),
            managed_mitm_ca_trust_bundle_path.as_ref(),
        );
        let mut argv = Vec::with_capacity(1 + command.args.len());
        argv.push(os_string_to_command_component(command.program));
        argv.extend(command.args);

        let (argv, arg0_override, pending_sandboxed_request) = match sandbox {
            SandboxType::None => (argv, None, None),
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
                let mut full_command =
                    vec![os_string_to_command_component(exe.as_os_str().to_owned())];
                full_command.extend(
                    codex_mxc_sandbox::create_command_args(
                        codex_mxc_sandbox::CreateMxcCommandArgsParams {
                            command: argv,
                            permission_profile: &pending.effective_permission_profile,
                            sandbox_policy_cwd: pending.native_sandbox_policy_cwd.as_path(),
                            managed_network: managed_network.as_ref(),
                            env: &mut command.env,
                        },
                    )
                    .map_err(|err| SandboxTransformError::WindowsMxcPreparation(err.to_string()))?,
                );
                (full_command, None, Some(pending))
            }
```
**File:** codex-rs/sandboxing/src/manager.rs (L436-474)
```rust
            #[cfg(target_os = "macos")]
            SandboxType::MacosSeatbelt => {
                use crate::seatbelt::CreateSeatbeltCommandArgsParams;
                use crate::seatbelt::MACOS_PATH_TO_SEATBELT_EXECUTABLE;
                use crate::seatbelt::SeatbeltPreparationError;
                use crate::seatbelt::create_seatbelt_command_args_with_profile;

                let pending = pending_sandboxed_request?;
                let (file_system_sandbox_policy, network_sandbox_policy) = pending
                    .effective_permission_profile
                    .to_runtime_permissions();
                let mut args = create_seatbelt_command_args_with_profile(
                    CreateSeatbeltCommandArgsParams {
                        command: argv,
                        file_system_sandbox_policy: &file_system_sandbox_policy,
                        network_sandbox_policy,
                        sandbox_policy_cwd: pending.native_sandbox_policy_cwd.as_path(),
                        enforce_managed_network,
                        managed_network,
                        environment_id,
                        network,
                        extra_allow_unix_sockets: &[],
                    },
                    self.seatbelt_profile,
                    self.allowed_symlinked_codex_home.as_ref(),
                )
                .map_err(|err| match err {
                    SeatbeltPreparationError::FileSystem(message) => {
                        SandboxTransformError::SeatbeltPreparation(message)
                    }
                    SeatbeltPreparationError::EnvironmentNetworkProxy(message) => {
                        SandboxTransformError::EnvironmentNetworkProxy(message)
                    }
                })?;
                let mut full_command = Vec::with_capacity(1 + args.len());
                full_command.push(MACOS_PATH_TO_SEATBELT_EXECUTABLE.to_string());
                full_command.append(&mut args);
                (full_command, None, Some(pending))
            }
```
**File:** codex-rs/sandboxing/src/manager.rs (L581-603)
```rust
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
**File:** codex-rs/cli/src/debug_sandbox.rs (L400-426)
```rust
            let mut args = create_seatbelt_command_args(CreateSeatbeltCommandArgsParams {
                command,
                file_system_sandbox_policy: &file_system_sandbox_policy,
                network_sandbox_policy,
                sandbox_policy_cwd: sandbox_policy_cwd.as_path(),
                enforce_managed_network,
                managed_network: None,
                environment_id: None,
                network: network.as_ref(),
                extra_allow_unix_sockets: allow_unix_sockets,
            })
            .map_err(|err| anyhow::anyhow!(err))?;
            // This CLI inherits the user's controlling terminal. Keep this deny
            // after every shared policy allowance so the child cannot queue input
            // for the unsandboxed shell that resumes when Codex exits.
            match args.as_mut_slice() {
                [flag, policy, ..] if flag.as_str() == "-p" => {
                    // Older macOS policy compilers do not define the TIOCSTI symbol.
                    policy.push_str(&format!(
                        "\n(deny file-ioctl (ioctl-command {}))",
                        libc::TIOCSTI
                    ));
                }
                _ => anyhow::bail!("Seatbelt command is missing its generated policy"),
            }
            spawn_debug_sandbox_child(
                PathBuf::from("/usr/bin/sandbox-exec"),
```
**File:** codex-rs/sandboxing/src/landlock.rs (L26-67)
```rust
pub fn create_linux_sandbox_command_args_for_permission_profile(
    command: Vec<String>,
    command_cwd: &Path,
    permission_profile: &PermissionProfile,
    sandbox_policy_cwd: &Path,
    use_legacy_landlock: bool,
    managed_network: Option<&ManagedNetworkSandboxContext>,
) -> Vec<String> {
    let permission_profile_json = serde_json::to_string(permission_profile)
        .unwrap_or_else(|err| panic!("failed to serialize permission profile: {err}"));
    let sandbox_policy_cwd = sandbox_policy_cwd
        .to_str()
        .unwrap_or_else(|| panic!("cwd must be valid UTF-8"))
        .to_string();
    let command_cwd = command_cwd
        .to_str()
        .unwrap_or_else(|| panic!("command cwd must be valid UTF-8"))
        .to_string();

    let mut linux_cmd: Vec<String> = vec![
        "--sandbox-policy-cwd".to_string(),
        sandbox_policy_cwd,
        "--command-cwd".to_string(),
        command_cwd,
        "--permission-profile".to_string(),
        permission_profile_json,
    ];
    // Proxy-only networking requires bubblewrap's isolated network namespace.
    if use_legacy_landlock && managed_network.is_none() {
        linux_cmd.push("--use-legacy-landlock".to_string());
    }
    if let Some(managed_network) = managed_network {
        linux_cmd.push("--managed-network".to_string());
        linux_cmd.push(
            serde_json::to_string(managed_network)
                .unwrap_or_else(|err| panic!("failed to serialize managed network context: {err}")),
        );
    }
    linux_cmd.push("--".to_string());
    linux_cmd.extend(command);
    linux_cmd
}
```
**File:** codex-rs/linux-sandbox/src/linux_run_main.rs (L294-347)
```rust
    if !use_legacy_landlock {
        // Outer stage: bubblewrap first, then re-enter this binary in the
        // sandboxed environment to apply seccomp. This path never falls back
        // to legacy Landlock on failure.
        let (proxy_route_spec, proxy_controls) = if allow_network_for_proxy {
            let (proxy_route_spec, controls) = prepare_host_proxy_route_spec()
                .unwrap_or_else(|err| panic!("failed to prepare host proxy routing bridge: {err}"));
            (Some(proxy_route_spec), controls)
        } else {
            (None, Vec::new())
        };
        let options = BwrapOptions {
            mount_proc: !no_proc && !inherit_pid_namespace,
            inherit_pid_namespace,
            network_mode: bwrap_network_mode(network_sandbox_policy, allow_network_for_proxy),
            mask_wsl_interop: !file_system_sandbox_policy.has_full_disk_write_access()
                && Path::new(WSL_INTEROP_DIR).is_dir(),
            mask_wslg_distro: (!file_system_sandbox_policy.has_full_disk_write_access()
                || !file_system_sandbox_policy
                    .get_unreadable_globs_with_cwd(&sandbox_policy_cwd)
                    .is_empty())
                && crate::wslg::is_duplicate_root(Path::new(WSLG_DISTRO_ROOT))
                    .unwrap_or_else(|err| exit_with_bwrap_build_error(err.into())),
            ..Default::default()
        };
        if options.mask_wslg_distro
            && let Some(executable) = command
                .first()
                .filter(|executable| executable.contains('/'))
        {
            let executable = command_cwd
                .as_deref()
                .unwrap_or(&sandbox_policy_cwd)
                .join(executable);
            crate::wslg::ensure_supported_path(&executable)
                .unwrap_or_else(|err| exit_with_bwrap_build_error(err));
        }
        let inner = build_inner_seccomp_command(InnerSeccompCommandArgs {
            sandbox_policy_cwd: &sandbox_policy_cwd,
            command_cwd: command_cwd.as_deref(),
            permission_profile: &permission_profile,
            managed_network,
            proxy_route_spec,
            command,
        });
        run_bwrap_with_proc_fallback(
            &sandbox_policy_cwd,
            command_cwd.as_deref(),
            &file_system_sandbox_policy,
            options,
            inner,
            proxy_controls,
        );
    }
```
**File:** codex-rs/linux-sandbox/README.md (L53-68)
```markdown
- When bubblewrap is active, the helper applies `PR_SET_NO_NEW_PRIVS` and a
  seccomp filter in-process after establishing the filesystem view. Restricted
  network policies block network syscalls; filesystem-restricted policies with
  otherwise unrestricted networking still block `AF_VSOCK` sockets. All filter
  modes block `io_uring` to prevent bypassing socket-family restrictions.
- When bubblewrap is active, the filesystem is read-only by default via `--ro-bind / /`.
- When bubblewrap is active, writable roots are layered with `--bind <root> <root>`.
- When bubblewrap is active, protected subpaths under writable roots (for
  example `.git`,
  resolved `gitdir:`, and `.codex`) are re-applied as read-only via `--ro-bind`.
- When bubblewrap is active, overlapping split-policy
  entries are applied in path-specificity order so narrower writable children
  can reopen broader read-only or denied parents while narrower denied subpaths
  still win. For example, `/repo = write`, `/repo/a = none`, `/repo/a/b = write`
  keeps `/repo` writable, denies `/repo/a`, and reopens `/repo/a/b` as
  writable again.
```
**File:** codex-rs/linux-sandbox/src/seccomp.rs (L45-96)
```rust
pub(crate) fn apply_permission_profile_to_current_thread(
    permission_profile: &PermissionProfile,
    cwd: &Path,
    apply_landlock_fs: bool,
    managed_network: Option<&ManagedNetworkSandboxContext>,
    proxy_routing_active: bool,
) -> Result<()> {
    let (file_system_sandbox_policy, network_sandbox_policy) =
        permission_profile.to_runtime_permissions();
    let network_seccomp_mode = network_seccomp_mode(
        network_sandbox_policy,
        managed_network.is_some(),
        proxy_routing_active,
    )
    .or_else(|| {
        // VM sockets can reach host services outside the filesystem sandbox.
        // In WSL2 they also allow Windows process launch through an alias of
        // the interop socket, even when /run/WSL is masked. Keep ordinary
        // network access while denying that host bridge.
        (!file_system_sandbox_policy.has_full_disk_write_access())
            .then_some(NetworkSeccompMode::VmSocketRestricted)
    });

    // `PR_SET_NO_NEW_PRIVS` is required for seccomp, but it also prevents
    // setuid privilege elevation. Many `bwrap` deployments rely on setuid, so
    // we avoid this unless we need seccomp or we are explicitly using the
    // legacy Landlock filesystem pipeline.
    if network_seccomp_mode.is_some()
        || (apply_landlock_fs && !file_system_sandbox_policy.has_full_disk_write_access())
    {
        set_no_new_privs()?;
    }

    if let Some(mode) = network_seccomp_mode {
        install_network_seccomp_filter_on_current_thread(mode, managed_network)?;
    }

    if apply_landlock_fs && !file_system_sandbox_policy.has_full_disk_write_access() {
        if !file_system_sandbox_policy.has_full_disk_read_access() {
            return Err(CodexErr::UnsupportedOperation(
                "Restricted read-only access is not supported by the legacy Linux Landlock filesystem backend."
                    .to_string(),
            ));
        }

        let writable_roots = file_system_sandbox_policy
            .get_writable_roots_with_cwd(cwd)
            .into_iter()
            .map(|writable_root| writable_root.root)
            .collect();
        install_filesystem_landlock_rules_on_current_thread(writable_roots)?;
    }
```
**File:** codex-rs/core/src/sandboxing/mod.rs (L117-123)
```rust
    pub(crate) async fn from_sandbox_exec_request(
        request: SandboxExecRequest,
        options: ExecOptions,
        windows_sandbox_workspace_roots: Vec<AbsolutePathBuf>,
    ) -> Result<Self, CodexErr> {
        codex_exec_server::run_integrity_checks(&request).await;
        let SandboxExecRequest {
```
**File:** codex-rs/core/src/sandboxing/mod.rs (L140-170)
```rust
        let windows_sandbox_filesystem_overrides = if sandbox == SandboxType::WindowsRestrictedToken
        {
            let sandbox_policy_cwd = windows_sandbox_policy_cwd
                .to_abs_path()
                .map_err(|err| CodexErr::InvalidRequest(format!("invalid sandbox cwd: {err}")))?;
            let use_windows_elevated_backend =
                windows_sandbox_uses_elevated_backend(windows_sandbox_level);
            if use_windows_elevated_backend {
                resolve_windows_elevated_filesystem_overrides(
                    sandbox,
                    &permission_profile,
                    &sandbox_policy_cwd,
                    use_windows_elevated_backend,
                    &env,
                )
            } else {
                resolve_windows_restricted_token_filesystem_overrides(
                    sandbox,
                    &permission_profile,
                    &sandbox_policy_cwd,
                    windows_sandbox_level,
                )
            }
            .map_err(|error| {
                CodexErr::UnsupportedOperation(
                    truncate_middle_with_token_budget(&error, /*max_tokens*/ 900).0,
                )
            })?
        } else {
            None
        };
```
**File:** codex-rs/sandboxing/src/windows.rs (L98-131)
```rust
    if !permission_profile_supports_windows_restricted_token_sandbox(permission_profile) {
        let permission_profile_name = permission_profile_display_name(permission_profile);
        return Err(format!(
            "windows sandbox backend cannot enforce file_system={:?}, network={network_sandbox_policy:?}, permission_profile={permission_profile_name}; refusing to run unsandboxed",
            file_system_sandbox_policy.kind,
        ));
    }

    // Windows protects existing metadata paths through the legacy writable root
    // projection. Do not turn skip-missing entries into newly-created
    // deny-write sentinels.
    file_system_sandbox_policy.remove_skip_missing_path_entries();

    // The restricted-token backend can still enforce split write restrictions,
    // but its WRITE_RESTRICTED token does not make capability SID deny-read ACEs
    // participate in read access checks. Read restrictions therefore require the
    // elevated backend, even when the filesystem root remains readable.
    if !windows_policy_has_root_read_access(&file_system_sandbox_policy, sandbox_policy_cwd) {
        return Err(
            "windows unelevated restricted-token sandbox cannot enforce split filesystem read restrictions directly; refusing to run unsandboxed"
                .to_string(),
        );
    }

    let additional_deny_read_paths = codex_windows_sandbox::resolve_windows_deny_read_paths(
        &file_system_sandbox_policy,
        sandbox_policy_cwd,
    )?;
    if !additional_deny_read_paths.is_empty() {
        return Err(
            "windows unelevated restricted-token sandbox cannot enforce deny-read restrictions directly; refusing to run unsandboxed"
                .to_string(),
        );
    }
```
**File:** codex-rs/mxc-sandbox/README.md (L3-7)
```markdown
This crate routes a command through the current Codex executable and directly
into Microsoft's MXC `BaseContainerRunner`. It requires a working Windows
process security environment (PSEC). It never invokes MXC's AppContainer
dispatcher, edits host ACLs, creates sandbox users, runs setup, or requests
elevation. The existing Codex Windows sandboxes remain separate backends.
```
**File:** codex-rs/exec-server/src/fs_sandbox.rs (L178-209)
```rust
        let command = SandboxCommand {
            program: helper.as_path().as_os_str().to_owned(),
            args: vec![CODEX_FS_HELPER_ARG1.to_string()],
            cwd: PathUri::from_abs_path(&helper_cwd),
            env: self.helper_env.clone(),
            managed_network: None,
            additional_permissions: None,
        };
        let mut request = sandbox_manager
            .transform_for_direct_spawn(SandboxDirectSpawnTransformRequest {
                workspace_roots,
                windows_sandbox_proxy_settings_mode:
                    codex_sandboxing::WindowsSandboxProxySettingsMode::Preserve,
                transform: SandboxTransformRequest {
                    command,
                    permissions: permission_profile,
                    sandbox,
                    enforce_managed_network: false,
                    environment_id: None,
                    network: None,
                    sandbox_policy_cwd: &cwd.uri,
                    sandbox_exe: if cfg!(windows) {
                        Some(self.runtime_paths.codex_self_exe.as_path())
                    } else {
                        self.runtime_paths.codex_linux_sandbox_exe.as_deref()
                    },
                    use_legacy_landlock: sandbox_context.use_legacy_landlock,
                    windows_sandbox_level: windows_sandbox_level
                        .unwrap_or(WindowsSandboxLevel::Disabled),
                },
            })
            .map_err(|err| invalid_request(format!("failed to prepare fs sandbox: {err}")))?;
```
**File:** codex-rs/exec-server/src/process_sandbox.rs (L194-211)
```rust
    #[cfg(target_os = "linux")]
    let sandbox_helper_paths = {
        let mut sandbox_helper_paths = sandbox_helper_paths;
        if !sandbox_helper_paths.contains(&runtime_paths.codex_self_exe) {
            sandbox_helper_paths.push(runtime_paths.codex_self_exe.clone());
        }
        sandbox_helper_paths.extend(runtime_paths.codex_linux_sandbox_exe.iter().cloned());
        sandbox_helper_paths
    };
    #[cfg(unix)]
    let file_system_policy = file_system_policy
        .with_additional_readable_roots(native_sandbox_policy_cwd.as_path(), &sandbox_helper_paths);
    #[cfg(unix)]
    let permissions = PermissionProfile::from_runtime_permissions_with_enforcement(
        permissions.enforcement(),
        &file_system_policy,
        network_policy,
    );
```
