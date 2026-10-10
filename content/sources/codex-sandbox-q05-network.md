## Q5
网络限制通过网络命名空间、防火墙、代理还是其他机制实现？如果程序忽略 HTTP_PROXY，直接连接 IP、使用 UDP，或访问 localhost、Unix socket，会发生什么？域名白名单在哪里检查，限制如何覆盖子进程？
### Answer
**简答**：网络限制是**多层叠加**的——Linux 用 `bwrap --unshare-net` 网络命名空间 + seccomp 系统调用过滤；macOS 用 Seatbelt profile 的 `network-outbound`/`network-bind` 规则；细粒度控制（域名白名单）由 `codex-network-proxy` 的 HTTP/SOCKS5 代理做应用层检查。忽略 `HTTP_PROXY` 没用：直连 IP 在 Linux 上没有可用路由（隔离 netns）且 socket 调用被 seccomp 拦下，macOS 上被 Seatbelt 内核拒绝；UDP、localhost、Unix socket 分别由 seccomp 参数规则 / SBPL loopback 端口白名单 / Unix socket allowlist 管控 codex:93-101 codex:332-354 codex:1-12 。

---

## 限制机制（按平台）

### Linux：`--unshare-net` + seccomp，没有防火墙

- 网络受限且无代理路由时，helper 用 `--unshare-net` 隔离整个网络命名空间；managed proxy 模式下也是 `--unshare-net`，但额外建一条**TCP→UDS→TCP 路由桥**，使命令只能到达配置好的代理端点 codex:93-101 。
- `create_linux_sandbox_command_args_for_permission_profile` 把 `ManagedNetworkSandboxContext`（`loopback_ports`、`allow_local_binding`、`allow_unix_sockets`）序列化进 `--managed-network` argv；`enforce_managed_network` 触发 `allow_network_for_proxy` codex:9-14 codex:53-63 。
- inner stage 先 `activate_proxy_routes_in_netns` 起桥，再 `apply_permission_profile_to_current_thread` 装 seccomp，最后 `fork()` + exec 命令——过滤器在 exec 前装好，整个子进程树继承 codex:227-257 。
- 三种 `NetworkSeccompMode`：
  - **Restricted**：deny `connect`/`accept`/`bind`/`listen`/`sendto`/`sendmmsg`/`setsockopt` 等；`socket`/`socketpair` 只允许 `AF_UNIX`（注释说明放行 `recvfrom`/socketpair 是为了 `cargo` 这类工具） codex:203-234 
  - **ProxyRouted**：隔离 netns 内允许 `AF_INET`/`AF_INET6`（够到本地桥）；独立 `AF_UNIX` socket 被拒，除非 `dangerously_allow_all_unix_sockets`；`socketpair` 仍限 `AF_UNIX` codex:235-271 
  - **VmSocketRestricted**：仅 deny `AF_VSOCK`（防 WSL2 经 vsock 触达宿主/启动 Windows 进程） codex:272-281 codex:59-66 
  - **所有模式**额外 deny `io_uring_*`（可绕过 socket-family 限制建 AF_VSOCK）和 `ptrace`/`process_vm_*` codex:192-201 。

### macOS：Seatbelt SBPL 规则

`dynamic_network_policy_for_network` 生成受限 profile：只在 `proxy.ports`/`has_proxy_config`/`enforce_managed_network` 时放行 `network-outbound` 到各 `localhost:<port>`，`allow_local_binding` 时再放行 `network-bind *:*` + localhost 进出站；Unix socket 按 allowlist 生成 `system-socket`/`network-outbound (remote unix-socket)` 规则 codex:319-353 。测试 `prepared_managed_network_context_allows_only_its_proxy_ports` 验证只放行 `localhost:43123`/`48081`，无通配放行 codex:897-928 。

### 代理：`codex-network-proxy`（域名白名单在这里）

- 跑 HTTP 代理（`127.0.0.1:3128`）+ SOCKS5（`127.0.0.1:8081`，支持 UDP associate），子进程经 `HTTP_PROXY`/`HTTPS_PROXY`/`ALL_PROXY` 环境变量被指向它——`apply_proxy_env_overrides` 在 `prepare_for_addrs` 里强制重写这些变量并注入 MITM CA bundle codex:3-10 codex:1141-1151 。
- **域名白名单在代理进程内检查**（`NetworkPolicyDecider` + `ConfigState`），规则：无 allow 条目即全拒；`*.example.com` 只匹配子域，`**.example.com` 含 apex，`?` 匹配单字节（含点），全局 `*` 被拒；**deny 恒胜 allow**；`allow_local_binding=false` 时本地/私网 IP 需显式白名单且解析到私网 IP 的域名仍被拦 codex:242-258 。
- `prepare_for_addrs` 同时产出 `ManagedNetworkSandboxContext`（便携的 loopback 端口/socket 白名单）交给 OS 沙箱，使 Seatbelt/seccomp 的白名单与代理监听端口一致 codex:1194-1203 。
- Windows 上 managed 监听器被钳到 loopback，代理端口经 `WINDOWS_SANDBOX_PROXY_PORTS` env 传入沙箱 codex:426-435 codex:1181-1193 。

## 绕过尝试的后果

| 行为 | Linux | macOS |
|---|---|---|
| 忽略 `HTTP_PROXY` 直连 IP | netns 无外部路由；Restricted 模式 `socket(AF_INET)` 直接被 seccomp 拒 | Seatbelt 无对应 `network-outbound` 规则 → 内核拒绝 |
| UDP | `sendto`/`sendmmsg`/`socket(AF_INET+SOCK_DGRAM)` 被拒；ProxyRouted 下只能到桥 | 无 UDP 放行规则 → 拒绝（SOCKS5 UDP 只能走代理，limited 模式全拒） codex:255-258  |
| localhost | 仅代理 `loopback_ports` 可达（Seatbelt）；Linux netns 内 loopback + 桥端点 | 只允许 `localhost:<白名单端口>`；`allow_local_binding` 另放开绑定 codex:334-344  |
| Unix socket | Restricted：`AF_UNIX` socket 放行（socketpair 是 IPC 必需）；ProxyRouted：独立 `AF_UNIX` 被拒，需 `allow_unix_sockets`/`dangerously_allow_all_unix_sockets` | SBPL allowlist；`dangerously_allow_all_unix_sockets` 可全放 codex:172-188  |

## 对子进程的覆盖

seccomp 过滤器安装在 inner stage 的 `fork()` 之前、`exec` 之后由子进程继承——同一 netns、同一 BPF 过滤器对整个子进程树生效；`PR_SET_NO_NEW_PRIVS` 阻止 setuid 逃逸 codex:246-257 codex:68-76 。代理 env 变量随进程 env 自然传给孙子进程 codex:1141-1151 。

## Notes

- 已知边界：README 明确说 DNS rebinding 无法彻底防，建议威胁模型含恶意 DNS 时叠加防火墙/VPC 层；远程 exec-server 走 `remote_launch_config`/`policy_decision_timeout_ms` 由执行端本地代理强制 codex:267-271 codex:339-390 。
- `CODEX_SANDBOX_NETWORK_DISABLED=1` 是无强制力的约定标记。

Wiki pages you might want to explore:
- [Network Proxy (openai/codex)](/wiki/openai/codex#3.12)
- [Sandboxing Implementation (openai/codex)](/wiki/openai/codex#5.6)

Wiki pages you might want to explore:
- [Network Proxy (openai/codex)](/wiki/openai/codex#3.12)
- [Tool Orchestration and Approval (openai/codex)](/wiki/openai/codex#5.5)
- [Sandboxing Implementation (openai/codex)](/wiki/openai/codex#5.6)
### Citations
**File:** codex-rs/linux-sandbox/README.md (L93-101)
```markdown
- When bubblewrap is active and network is restricted without proxy routing, the helper also
  isolates the network namespace via `--unshare-net`.
- In managed proxy mode, the helper uses `--unshare-net` plus an internal
  TCP->UDS->TCP routing bridge so tool traffic reaches only configured proxy
  endpoints.
- In managed proxy mode, after the bridge is live, seccomp allows IP sockets
  inside the isolated network namespace and blocks new standalone `AF_UNIX`
  sockets unless `dangerously_allow_all_unix_sockets` is granted. Unix socket
  pairs remain allowed for communication between related processes.
```
**File:** codex-rs/sandboxing/src/seatbelt.rs (L172-188)
```rust
    let unix_domain_socket_policy = match (managed_network, network) {
        (Some(context), _) if context.dangerously_allow_all_unix_sockets => {
            UnixDomainSocketPolicy::AllowAll
        }
        (Some(context), _) => {
            UnixDomainSocketPolicy::from_allowlist(&context.allow_unix_sockets, extra_allowed)
        }
        (None, Some(network)) if network.dangerously_allow_all_unix_sockets() => {
            UnixDomainSocketPolicy::AllowAll
        }
        (None, Some(network)) => {
            UnixDomainSocketPolicy::from_allowlist(&network.allow_unix_sockets(), extra_allowed)
        }
        (None, None) => UnixDomainSocketPolicy::Restricted {
            allowed: extra_allowed,
        },
    };
```
**File:** codex-rs/sandboxing/src/seatbelt.rs (L319-354)
```rust
fn dynamic_network_policy_for_network(
    network_policy: NetworkSandboxPolicy,
    enforce_managed_network: bool,
    proxy: &ProxyPolicyInputs,
) -> String {
    let has_some_unix_socket_access = match &proxy.unix_domain_socket_policy {
        UnixDomainSocketPolicy::AllowAll => true,
        UnixDomainSocketPolicy::Restricted { allowed } => !allowed.is_empty(),
    };
    let should_use_restricted_network_policy = !proxy.ports.is_empty()
        || proxy.has_proxy_config
        || enforce_managed_network
        || (!network_policy.is_enabled() && has_some_unix_socket_access);
    if should_use_restricted_network_policy {
        let mut policy = String::new();
        if proxy.allow_local_binding {
            policy.push_str("; allow local binding and loopback traffic\n");
            policy.push_str("(allow network-bind (local ip \"*:*\"))\n");
            policy.push_str("(allow network-inbound (local ip \"localhost:*\"))\n");
            policy.push_str("(allow network-outbound (remote ip \"localhost:*\"))\n");
        }
        for port in &proxy.ports {
            policy.push_str(&format!(
                "(allow network-outbound (remote ip \"localhost:{port}\"))\n"
            ));
        }
        if proxy.allow_local_binding || !proxy.ports.is_empty() {
            policy.push_str(MACOS_SEATBELT_TLS_TRUST_POLICY);
        }
        let unix_socket_policy = unix_socket_policy(proxy);
        if !unix_socket_policy.is_empty() {
            policy.push_str("; allow unix domain sockets for local IPC\n");
            policy.push_str(&unix_socket_policy);
        }
        return format!("{policy}{MACOS_SEATBELT_NETWORK_POLICY}");
    }
```
**File:** codex-rs/network-proxy/README.md (L1-12)
```markdown
# codex-network-proxy

`codex-network-proxy` is Codex's local network policy enforcement proxy. It runs:

- an HTTP proxy (default `127.0.0.1:3128`)
- a SOCKS5 proxy (default `127.0.0.1:8081`, enabled by default)

On Windows, managed HTTP listeners prefer ports `3128-3159`, and SOCKS5 listeners prefer ports
`8081-8112`. An explicitly configured port is attempted first. If every preferred port is occupied,
the proxy preserves its existing ephemeral loopback fallback.

It enforces an allow/deny policy and a "limited" mode intended for read-only network access.
```
**File:** codex-rs/network-proxy/README.md (L242-258)
```markdown
- Allowlist-first policy: if `domains` has no `allow` entries, requests are blocked until an allowlist is configured.
- Domain patterns: exact hosts are supported, `*.example.com` matches subdomains only, and `**.example.com` matches the apex plus subdomains; the global `*` wildcard is only accepted when explicitly enabled for allowlist compilation and is otherwise rejected.
- Within a domain pattern, `?` matches exactly one byte, including a dot. For example,
  `api?.example.com` matches `api1.example.com`, but not `api.example.com` or `api12.example.com`.
  It can be combined with `*`, `*.`, and `**.` in both allow and deny entries.
  Matching uses UTF-8 bytes with ASCII case insensitivity; it does not convert between Unicode
  domain names and IDNA/Punycode. Internationalized domains arriving as Punycode must be matched
  using their Punycode spelling.
- Deny wins: `domains` entries marked `deny` always override the allowlist.
- Local/private network protection: when `allow_local_binding = false`, the proxy blocks loopback
  and common private/link-local ranges. Explicit allowlisting of local IP literals (or `localhost`)
  is required to permit them; hostnames that resolve to local/private IPs are still blocked even if
  allowlisted (best-effort DNS lookup).
- Limited mode enforcement:
  - only `GET`, `HEAD`, and `OPTIONS` are allowed
  - HTTPS `CONNECT` requests and HTTPS SOCKS5 TCP targets on `:443` require MITM so the proxy can
    enforce limited-mode method policy; SOCKS5 UDP and non-HTTPS SOCKS5 TCP remain blocked
```
**File:** codex-rs/network-proxy/README.md (L267-271)
```markdown
  Limitations:

- DNS rebinding is hard to fully prevent without pinning the resolved IP(s) all the way down to the
  transport layer. If your threat model includes hostile DNS, enforce network egress at a lower
  layer too (e.g., firewall / VPC / corporate proxy policies).
```
**File:** codex-rs/sandboxing/src/landlock.rs (L9-14)
```rust
pub fn allow_network_for_proxy(enforce_managed_network: bool) -> bool {
    // When managed network requirements are active, request proxy-only
    // networking from the Linux sandbox helper. Without managed requirements,
    // preserve existing behavior.
    enforce_managed_network
}
```
**File:** codex-rs/sandboxing/src/landlock.rs (L53-63)
```rust
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
```
**File:** codex-rs/linux-sandbox/src/linux_run_main.rs (L227-257)
```rust
        if allow_network_for_proxy {
            let spec = proxy_route_spec
                .as_deref()
                .unwrap_or_else(|| panic!("managed proxy mode requires --proxy-route-spec"));
            if let Err(err) = activate_proxy_routes_in_netns(spec) {
                panic!("error activating Linux proxy routing bridge: {err}");
            }
        }
        let proxy_routing_active = allow_network_for_proxy;
        if let Err(e) = apply_permission_profile_to_current_thread(
            &permission_profile,
            &sandbox_policy_cwd,
            /*apply_landlock_fs*/ false,
            managed_network.as_ref(),
            proxy_routing_active,
        ) {
            panic!("error applying Linux sandbox restrictions: {e:?}");
        }

        let signal_mask = ForwardedSignalMask::block();
        let command_pid = unsafe { libc::fork() };
        if command_pid < 0 {
            let err = std::io::Error::last_os_error();
            panic!("failed to fork sandboxed command: {err}");
        }

        if command_pid == 0 {
            reset_forwarded_signal_handlers_to_default();
            signal_mask.restore();
            exec_or_panic(command);
        }
```
**File:** codex-rs/linux-sandbox/src/seccomp.rs (L59-66)
```rust
    .or_else(|| {
        // VM sockets can reach host services outside the filesystem sandbox.
        // In WSL2 they also allow Windows process launch through an alias of
        // the interop socket, even when /run/WSL is masked. Keep ordinary
        // network access while denying that host bridge.
        (!file_system_sandbox_policy.has_full_disk_write_access())
            .then_some(NetworkSeccompMode::VmSocketRestricted)
    });
```
**File:** codex-rs/linux-sandbox/src/seccomp.rs (L68-76)
```rust
    // `PR_SET_NO_NEW_PRIVS` is required for seccomp, but it also prevents
    // setuid privilege elevation. Many `bwrap` deployments rely on setuid, so
    // we avoid this unless we need seccomp or we are explicitly using the
    // legacy Landlock filesystem pipeline.
    if network_seccomp_mode.is_some()
        || (apply_landlock_fs && !file_system_sandbox_policy.has_full_disk_write_access())
    {
        set_no_new_privs()?;
    }
```
**File:** codex-rs/linux-sandbox/src/seccomp.rs (L192-201)
```rust
    if mode != NetworkSeccompMode::VmSocketRestricted {
        deny_syscall(&mut rules, libc::SYS_ptrace);
        deny_syscall(&mut rules, libc::SYS_process_vm_readv);
        deny_syscall(&mut rules, libc::SYS_process_vm_writev);
    }
    // io_uring can create AF_VSOCK sockets without a socket() syscall, so
    // keep it unavailable in every mode with socket-family restrictions.
    deny_syscall(&mut rules, libc::SYS_io_uring_setup);
    deny_syscall(&mut rules, libc::SYS_io_uring_enter);
    deny_syscall(&mut rules, libc::SYS_io_uring_register);
```
**File:** codex-rs/linux-sandbox/src/seccomp.rs (L203-234)
```rust
    match mode {
        NetworkSeccompMode::Restricted => {
            deny_syscall(&mut rules, libc::SYS_connect);
            deny_syscall(&mut rules, libc::SYS_accept);
            deny_syscall(&mut rules, libc::SYS_accept4);
            deny_syscall(&mut rules, libc::SYS_bind);
            deny_syscall(&mut rules, libc::SYS_listen);
            deny_syscall(&mut rules, libc::SYS_getpeername);
            deny_syscall(&mut rules, libc::SYS_getsockname);
            deny_syscall(&mut rules, libc::SYS_shutdown);
            deny_syscall(&mut rules, libc::SYS_sendto);
            deny_syscall(&mut rules, libc::SYS_sendmmsg);
            // NOTE: allowing recvfrom allows some tools like: `cargo clippy`
            // to run with their socketpair + child processes for sub-proc
            // management.
            // deny_syscall(&mut rules, libc::SYS_recvfrom);
            deny_syscall(&mut rules, libc::SYS_recvmmsg);
            deny_syscall(&mut rules, libc::SYS_getsockopt);
            deny_syscall(&mut rules, libc::SYS_setsockopt);

            // For `socket` we allow AF_UNIX (arg0 == AF_UNIX) and deny
            // everything else.
            let unix_only_rule = SeccompRule::new(vec![SeccompCondition::new(
                0, // first argument (domain)
                SeccompCmpArgLen::Dword,
                SeccompCmpOp::Ne,
                libc::AF_UNIX as u64,
            )?])?;

            rules.insert(libc::SYS_socket, vec![unix_only_rule.clone()]);
            rules.insert(libc::SYS_socketpair, vec![unix_only_rule]);
        }
```
**File:** codex-rs/linux-sandbox/src/seccomp.rs (L235-271)
```rust
        NetworkSeccompMode::ProxyRouted => {
            // In proxy-routed mode we allow IP sockets in the isolated
            // namespace (used to reach the local TCP bridge). Standalone Unix
            // sockets require an explicit managed-policy grant; all other
            // socket families remain denied.
            let mut denied_socket_conditions = vec![
                SeccompCondition::new(
                    0,
                    SeccompCmpArgLen::Dword,
                    SeccompCmpOp::Ne,
                    libc::AF_INET as u64,
                )?,
                SeccompCondition::new(
                    0,
                    SeccompCmpArgLen::Dword,
                    SeccompCmpOp::Ne,
                    libc::AF_INET6 as u64,
                )?,
            ];
            if managed_network.is_some_and(|context| context.dangerously_allow_all_unix_sockets) {
                denied_socket_conditions.push(SeccompCondition::new(
                    0,
                    SeccompCmpArgLen::Dword,
                    SeccompCmpOp::Ne,
                    libc::AF_UNIX as u64,
                )?);
            }
            let deny_non_ip_socket = SeccompRule::new(denied_socket_conditions)?;
            let deny_non_unix_socketpair = SeccompRule::new(vec![SeccompCondition::new(
                0,
                SeccompCmpArgLen::Dword,
                SeccompCmpOp::Ne,
                libc::AF_UNIX as u64,
            )?])?;
            rules.insert(libc::SYS_socket, vec![deny_non_ip_socket]);
            rules.insert(libc::SYS_socketpair, vec![deny_non_unix_socketpair]);
        }
```
**File:** codex-rs/linux-sandbox/src/seccomp.rs (L272-281)
```rust
        NetworkSeccompMode::VmSocketRestricted => {
            let deny_vsock = SeccompRule::new(vec![SeccompCondition::new(
                0,
                SeccompCmpArgLen::Dword,
                SeccompCmpOp::Eq,
                libc::AF_VSOCK as u64,
            )?])?;
            rules.insert(libc::SYS_socket, vec![deny_vsock.clone()]);
            rules.insert(libc::SYS_socketpair, vec![deny_vsock]);
        }
```
**File:** codex-rs/sandboxing/src/seatbelt_tests.rs (L897-928)
```rust
fn prepared_managed_network_context_allows_only_its_proxy_ports() {
    let file_system_policy = FileSystemSandboxPolicy::from_legacy_sandbox_policy_for_cwd(
        &SandboxPolicy::new_read_only_policy(),
        Path::new("/"),
    );
    let managed_network = ManagedNetworkSandboxContext {
        loopback_ports: vec![43123, 48081],
        allow_local_binding: false,
        ..Default::default()
    };
    let args = create_seatbelt_command_args(CreateSeatbeltCommandArgsParams {
        command: vec!["/bin/true".to_string()],
        file_system_sandbox_policy: &file_system_policy,
        network_sandbox_policy: NetworkSandboxPolicy::Restricted,
        sandbox_policy_cwd: Path::new("/"),
        enforce_managed_network: true,
        managed_network: Some(&managed_network),
        environment_id: None,
        network: None,
        extra_allow_unix_sockets: &[],
    })
    .unwrap();

    let policy = seatbelt_policy_arg(&args);
    assert!(policy.contains("(allow network-outbound (remote ip \"localhost:43123\"))"));
    assert!(policy.contains("(allow network-outbound (remote ip \"localhost:48081\"))"));
    assert!(!policy.contains("(allow network-outbound (remote ip \"localhost:9999\"))"));
    assert!(!policy.contains("(allow network-bind (local ip \"*:*\"))"));
    assert!(!policy.contains("(allow network-outbound)\n"));
    assert!(!policy.contains("(allow system-socket (socket-domain AF_UNIX))"));
    assert!(!policy.contains("(allow network-outbound (remote unix-socket))"));
}
```
**File:** codex-rs/network-proxy/src/proxy.rs (L426-435)
```rust
#[cfg(target_os = "windows")]
pub(super) fn windows_managed_loopback_addr(addr: SocketAddr) -> SocketAddr {
    if !addr.ip().is_loopback() {
        warn!(
            "managed Windows proxies must bind to loopback; clamping {addr} to 127.0.0.1:{}",
            addr.port()
        );
    }
    SocketAddr::from(([127, 0, 0, 1], addr.port()))
}
```
**File:** codex-rs/network-proxy/src/proxy.rs (L1141-1151)
```rust
        let runtime_settings = self.runtime_settings();
        // Enforce proxying for child processes. Proxy endpoint values are always rewritten;
        // managed MITM CA vars preserve child-scoped overrides after proxy startup.
        apply_proxy_env_overrides(
            &mut env,
            addrs.http_addr,
            addrs.socks_addr,
            self.socks_enabled,
            runtime_settings.allow_local_binding,
            runtime_settings.mitm_ca_trust_bundle.as_ref(),
        );
```
**File:** codex-rs/network-proxy/src/proxy.rs (L1181-1193)
```rust
        #[cfg(target_os = "windows")]
        if client == EnvironmentProxyClient::SandboxedProcess && self.windows_runtime.is_some() {
            env.insert(
                WINDOWS_SANDBOX_PROXY_PORTS_ENV_KEY.to_string(),
                loopback_ports
                    .iter()
                    .map(u16::to_string)
                    .collect::<Vec<_>>()
                    .join(","),
            );
        } else {
            env.remove(WINDOWS_SANDBOX_PROXY_PORTS_ENV_KEY);
        }
```
**File:** codex-rs/network-proxy/src/proxy.rs (L1194-1203)
```rust
        PreparedManagedNetwork {
            env,
            sandbox_context: ManagedNetworkSandboxContext {
                loopback_ports,
                allow_local_binding: runtime_settings.allow_local_binding,
                allow_unix_sockets: runtime_settings.allow_unix_sockets.to_vec(),
                dangerously_allow_all_unix_sockets: runtime_settings
                    .dangerously_allow_all_unix_sockets,
            },
        }
```
**File:** codex-rs/core/src/tools/runtimes/unified_exec.rs (L339-390)
```rust
        let (mut env, managed_network_context, network_proxy_launch) = match managed_network {
            Some(network) if environment_is_remote => {
                let mut launch = network
                    .remote_launch_config(crate::windows_sandbox::local_binding_policy_for_sandbox(
                        req.turn_environment.config().windows_sandbox_type,
                        req.turn_environment.executor_platform_os.as_deref(),
                    ))
                    .await
                    .map_err(|err| {
                        ToolError::Codex(CodexErr::Io(io::Error::other(err.to_string())))
                    })?;
                if routes_approval_policy_to_guardian(
                    ctx.step_context.settings.approval_policy(),
                    ctx.step_context.settings.approvals_reviewer(),
                ) && network
                    .remote_policy_decider(launch.proxy.allow_local_binding)
                    .is_some()
                {
                    let timeout = ctx
                        .session
                        .hooks()
                        .max_permission_request_timeout()
                        .saturating_add(GUARDIAN_REVIEW_TIMEOUT)
                        .saturating_add(REMOTE_NETWORK_POLICY_DECISION_MARGIN);
                    launch.policy_decision_timeout_ms =
                        Some(u64::try_from(timeout.as_millis()).map_err(|_| {
                            ToolError::Rejected(
                                "remote network policy decision timeout exceeds protocol limit"
                                    .to_string(),
                            )
                        })?);
                }
                if !launch.proxy.enabled {
                    (env, None, None)
                } else {
                    let environment_info =
                        req.turn_environment
                            .environment
                            .info()
                            .await
                            .map_err(|err| {
                                ToolError::Codex(CodexErr::Io(io::Error::other(format!(
                                    "failed to query exec-server capabilities: {err}"
                                ))))
                            })?;
                    if !environment_info.capabilities.network_proxy_launch {
                        return Err(ToolError::Rejected(
                            "selected exec-server does not support executor-local network proxy launches"
                                .to_string(),
                        ));
                    }
                    (env, None, Some(launch))
```
