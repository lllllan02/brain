---
parent: sandbox-implementations
title: "E2B 沙箱的大致用法"
category: "Agent"
tags: ["Agent", "沙箱"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
---

**E2B 把沙箱的创建与管理做成远程服务，SDK 负责向服务端下达指令。** 代码实际运行在远程隔离环境中；其公开运行时使用 Firecracker microVM，而不是 SDK 给本机 Python 进程加限制。[运行时架构](https://github.com/e2b-dev/runtime/blob/main/docs/ARCHITECTURE.md)

使用者主要负责上传输入、执行命令、取回结果和销毁，底层环境由平台管理；需要账号、SDK 和云端额度。

下面在本地控制端运行：把本机脚本上传到远程沙箱，再要求远程 Python 执行它。控制端需有 E2B SDK 与认证，所用模板需含 Python 和任务依赖；示例未实际调用服务。

```python
from pathlib import Path
from e2b import Sandbox

sbx = Sandbox.create(timeout=60, allow_internet_access=False)
try:
    sbx.files.write('/home/user/task.py', Path('task.py').read_text())
    result = sbx.commands.run('python /home/user/task.py')
    print(result.exit_code, result.stdout, result.stderr)
finally:
    sbx.kill()
```

`Sandbox.create` 创建远程环境，`files.write` 交付代码，`commands.run` 在里面执行；本机不需要启动 Docker。任务若还依赖数据文件，也要明确上传。

- 文件：通过 `files.write/read` 交付和取回，不自动挂本机目录；只上传任务需要的数据，销毁前保存输出。
- 网络：离线用 `allow_internet_access=False`；有限联网用 `network.allow_out` 指定目标，同时配置 `deny_out` 拒绝其他流量。入站访问是另一套设置。
- 凭据：`E2B_API_KEY` 留在控制端，不放进沙箱 `envs`。API 认证可先在控制端 `Secret.create` 保存秘密，再在目标域名的 `rules → transform → headers` 中用 `Secret.fill` 引用，由出口代理注入 HTTPS 请求头。普通 HTTP 不注入，网络变换规则也不代替访问白名单。
- 资源：模板的 `cpu_count`、`memory_mb` 配置规格；创建时的 `timeout` 限制沙箱存活时间，不是每条命令的运行时限。进程数、磁盘硬配额和应用总并发需另行确认。

密钥引用解析失败时，请求仍可能转发，但相应认证头会被移除。用测试凭据做成功／失败对照；销毁沙箱不等于删除平台保存的秘密。以上接口按 2026-10-10 文档核对，采用时匹配 SDK 版本。

[文件接口](https://docs.e2b.dev/filesystem/read-write)、[网络](https://docs.e2b.dev/network/internet-access)、[密钥注入](https://docs.e2b.dev/secrets/inject)、[模板规格](https://docs.e2b.dev/template/build)、[生命周期](https://docs.e2b.dev/sandbox)。
