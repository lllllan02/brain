## Q5
网络限制通过网络命名空间、防火墙、代理还是其他机制实现？如果程序忽略 HTTP_PROXY，直接连接 IP、使用 UDP，或访问 localhost、Unix socket，会发生什么？域名白名单在哪里检查，限制如何覆盖子进程？
### Answer
## 直接回答

**两种机制并存**：命令级沙箱（`BashTool`）用的是**代理**——`socat` 转发 + 域名白名单（`sandbox.network.strictAllowlist`、`allowed_domains`），而不是网络命名空间；可选的 devcontainer 部署用 **iptables + ipset 防火墙**。忽略 `HTTP_PROXY`、直连 IP 或 UDP 的程序会被代理/防火墙层拦下：devcontainer 中 UDP 只有 DNS 端口 53 放行，localhost（`lo`）和宿主 /24 网段始终放行，其余出站被 `REJECT`（icmp-admin-prohibited）。 claude-code:4210-4211 claude-code:2505-2505 claude-code:106-119 

---

## 命令级沙箱：代理模型（非 netns）

证据链：

- `sandbox.socatPath` 与 `sandbox.bwrapPath` 成对存在——bwrap 建文件系统隔离，socat 做网络出口转发。 claude-code:4210-4211 
- "sandboxed large uploads failing with TLS errors through **the sandbox proxy**"——明确存在一个 sandbox proxy 终止/转发流量。 claude-code:2469-2469 
- `sandbox.network.strictAllowlist`："deny non-allowlisted hosts for sandboxed commands **without prompting**"——白名单在代理层按 host 判定，默认非白名单主机会触发 prompt 而非直接拒绝。 claude-code:2505-2505 
- Auto mode 下有 **per-command `allowed_domains`**：每条命令所需的 host 随命令一起审批，只对那条命令开放——说明白名单是逐命令下发给代理的，不是静态防火墙。 claude-code:973-973 
- 域名列表规范化在配置层：IPv6 字面量 bracket 化 `[::1]:443`，歧义写法 fail-closed 并由 `/doctor` 标记。 claude-code:2318-2318 

## devcontainer：iptables 防火墙模型

`init-firewall.sh`（`postStartCommand` 执行，容器带 `NET_ADMIN`/`NET_RAW`）：

| 流量 | 结果 |
|---|---|
| UDP :53（DNS） | ACCEPT，出站+响应都放行。 claude-code:29-31  |
| TCP :22（SSH） | ACCEPT。 claude-code:33-35  |
| `lo` localhost | INPUT/OUTPUT 全 ACCEPT。 claude-code:37-38  |
| 宿主 /24 网段 | ACCEPT（容器↔宿主）。 claude-code:103-104  |
| `allowed-domains` ipset 目的地址 | ACCEPT——启动时把 GitHub CIDR + `dig A` 解析出的 IP（api.anthropic.com、registry.npmjs.org 等）灌进 `hash:net` ipset。 claude-code:41-90 claude-code:116-116  |
| 其他一切 | 默认 policy DROP + OUTPUT 末尾 `REJECT --reject-with icmp-admin-prohibited`（快速失败）。 claude-code:107-119  |

白名单在此模型中是**启动时一次性 DNS→IP 解析**（ipset），之后域名白名单不再检查 SNI/域名——只认 IP；脚本自带验证：`curl example.com` 必须失败、`api.github.com` 必须通。 claude-code:76-89 claude-code:122-136 

## 绕过场景的具体结果

- **忽略 HTTP_PROXY 直连 IP**：命令沙箱下，socat 代理模型意味着沙箱内进程没有独立出站路由（推断，源码不在索引）；devcontainer 下直连 IP 只要不在 ipset 就 `REJECT`。 claude-code:116-119 
- **UDP**：devcontainer 只放行 :53，其余 UDP 出站被 DROP/REJECT。 claude-code:29-31 
- **localhost**：devcontainer 显式放行 `lo`；命令沙箱的 localhost 行为无直接证据。 claude-code:37-38 
- **Unix socket**：不受网络层约束，走文件系统隔离（bwrap mount ns / Seatbelt）；插件侧 `$.http.fetch` 支持 `socketPath` 走 Unix socket，文档注明"through the host"。 claude-code:2929-2939 
- **子进程继承**：bwrap 产生的所有后代都在同一 mount ns 和同一网络限制内（namespace 继承）；socat 代理同样作用于所有后代连接。插件文档确认 `$.process.run` 命令"what a command of its own reaches is its own, as for the Bash tool"——即与 Bash 工具同一边界。 claude-code:2943-2948 

## Notes
- `BashTool` 沙箱内部（bwrap argv、socat 拓扑、是否 `--unshare-net`）的实现源码不在本仓库索引；上述"socat=出口代理、无独立 netns"的结论由配置配对与 "sandbox proxy" 表述推断。需要逐行确认请开 Devin session。
- `sandbox.network.allowMachLookup`（macOS）表明 Seatbelt 下网络控制还涉及 Mach service 访问（如 mDNSResponder），细节同上不可见。 claude-code:4903-4903 
- 域名白名单的"检查点"两种模型不同：代理模型在 **connect 时按域名**（socat 侧）逐命令裁决；防火墙模型在 **启动时解析成 IP** 后由内核按目的地址裁决。

Wiki pages you might want to explore:
- [Claude Code Overview (anthropics/claude-code)](/wiki/anthropics/claude-code#1)

Wiki pages you might want to explore:
- [Claude Code Overview (anthropics/claude-code)](/wiki/anthropics/claude-code#1)
### Citations
**File:** CHANGELOG.md (L973-973)
```markdown
- Added per-command `allowed_domains` to Bash, PowerShell and Monitor in auto mode with sandboxing: the hosts a command needs are reviewed with it and opened for it alone; other hosts are refused
```
**File:** CHANGELOG.md (L2318-2318)
```markdown
- Improved sandbox: IPv6 literals in network domain lists are now bracketed (`[::1]:443`), and ambiguous spellings are enforced fail-closed and flagged by `/doctor`
```
**File:** CHANGELOG.md (L2469-2469)
```markdown
- Fixed sandboxed large uploads failing with TLS errors through the sandbox proxy
```
**File:** CHANGELOG.md (L2505-2505)
```markdown
- Added `sandbox.network.strictAllowlist` setting to deny non-allowlisted hosts for sandboxed commands without prompting
```
**File:** CHANGELOG.md (L4210-4211)
```markdown
- Added `worktree.baseRef` setting (`fresh` | `head`) to choose whether `--worktree`, `EnterWorktree`, and agent-isolation worktrees branch from `origin/<default>` or local `HEAD`. **Note:** the default `fresh` changes `EnterWorktree`'s base back to `origin/<default>` (it has been local `HEAD` since 2.1.128) — set `worktree.baseRef: "head"` to keep unpushed commits in new worktrees
- Added `sandbox.bwrapPath` and `sandbox.socatPath` managed settings (Linux/WSL) to specify custom bubblewrap and socat binary locations
```
**File:** CHANGELOG.md (L4903-4903)
```markdown
- Fixed `sandbox.network.allowMachLookup` not taking effect on macOS
```
**File:** .devcontainer/init-firewall.sh (L29-31)
```shellscript
iptables -A OUTPUT -p udp --dport 53 -j ACCEPT
# Allow inbound DNS responses
iptables -A INPUT -p udp --sport 53 -j ACCEPT
```
**File:** .devcontainer/init-firewall.sh (L33-35)
```shellscript
iptables -A OUTPUT -p tcp --dport 22 -j ACCEPT
# Allow inbound SSH responses
iptables -A INPUT -p tcp --sport 22 -m state --state ESTABLISHED -j ACCEPT
```
**File:** .devcontainer/init-firewall.sh (L37-38)
```shellscript
iptables -A INPUT -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT
```
**File:** .devcontainer/init-firewall.sh (L41-90)
```shellscript
ipset create allowed-domains hash:net

# Fetch GitHub meta information and aggregate + add their IP ranges
echo "Fetching GitHub IP ranges..."
gh_ranges=$(curl -s https://api.github.com/meta)
if [ -z "$gh_ranges" ]; then
    echo "ERROR: Failed to fetch GitHub IP ranges"
    exit 1
fi

if ! echo "$gh_ranges" | jq -e '.web and .api and .git' >/dev/null; then
    echo "ERROR: GitHub API response missing required fields"
    exit 1
fi

echo "Processing GitHub IPs..."
while read -r cidr; do
    if [[ ! "$cidr" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/[0-9]{1,2}$ ]]; then
        echo "ERROR: Invalid CIDR range from GitHub meta: $cidr"
        exit 1
    fi
    echo "Adding GitHub range $cidr"
    ipset add allowed-domains "$cidr"
done < <(echo "$gh_ranges" | jq -r '(.web + .api + .git)[]' | aggregate -q)

# Resolve and add other allowed domains
for domain in \
    "registry.npmjs.org" \
    "api.anthropic.com" \
    "sentry.io" \
    "statsig.com" \
    "marketplace.visualstudio.com" \
    "vscode.blob.core.windows.net" \
    "update.code.visualstudio.com"; do
    echo "Resolving $domain..."
    ips=$(dig +noall +answer A "$domain" | awk '$4 == "A" {print $5}')
    if [ -z "$ips" ]; then
        echo "ERROR: Failed to resolve $domain"
        exit 1
    fi
    
    while read -r ip; do
        if [[ ! "$ip" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
            echo "ERROR: Invalid IP from DNS for $domain: $ip"
            exit 1
        fi
        echo "Adding $ip for $domain"
        ipset add allowed-domains "$ip"
    done < <(echo "$ips")
done
```
**File:** .devcontainer/init-firewall.sh (L103-104)
```shellscript
iptables -A INPUT -s "$HOST_NETWORK" -j ACCEPT
iptables -A OUTPUT -d "$HOST_NETWORK" -j ACCEPT
```
**File:** .devcontainer/init-firewall.sh (L106-119)
```shellscript
# Set default policies to DROP first
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT DROP

# First allow established connections for already approved traffic
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Then allow only specific outbound traffic to allowed domains
iptables -A OUTPUT -m set --match-set allowed-domains dst -j ACCEPT

# Explicitly REJECT all other outbound traffic for immediate feedback
iptables -A OUTPUT -j REJECT --reject-with icmp-admin-prohibited
```
**File:** .devcontainer/init-firewall.sh (L122-136)
```shellscript
echo "Verifying firewall rules..."
if curl --connect-timeout 5 https://example.com >/dev/null 2>&1; then
    echo "ERROR: Firewall verification failed - was able to reach https://example.com"
    exit 1
else
    echo "Firewall verification passed - unable to reach https://example.com as expected"
fi

# Verify GitHub API access
if ! curl --connect-timeout 5 https://api.github.com/zen >/dev/null 2>&1; then
    echo "ERROR: Firewall verification failed - unable to reach https://api.github.com"
    exit 1
else
    echo "Firewall verification passed - able to reach https://api.github.com as expected"
fi
```
**File:** mods/types/claude-code.d.ts (L2929-2939)
```typescript
           * @param url the URL (http or https)
           * @param init `{ method, headers, body, auth, socketPath }` (body a
           *             string; socketPath a Unix socket to go over instead of TCP)
           * @returns `{ status, ok, headers, text }` once the body is read
           * @example
           * const { ok, text } = await $.http.fetch("https://example.com/status")
           * @example
           * await $.http.fetch("http://bridge/reload", {
           *   method: "POST",
           *   socketPath: `${runDirectory}/bridge.sock`,
           * })
```
**File:** mods/types/claude-code.d.ts (L2943-2948)
```typescript
      /**
       * Commands on the host, run as the user the session runs as. CLI only.
       *
       * Local execution, not a network path: what a command of its own reaches
       * is its own, as for the Bash tool and a settings `command` hook.
       */
```
