# 渲染与环境

优先用本技能 `scripts/render.cjs`。它保留输入文件、输出 PNG/SVG、设置超时并关闭独立无头浏览器。2026-10-11 的验证环境使用 Node、Playwright 与本机 Chrome；固定 Excalidraw 0.18.0 和 sanitize-url 7.1.1，规避测试中在线最新模块依赖返回 404 的问题。固定版本不保证远程服务一直可用。

## 执行

先定位当前技能绝对路径。存在本地 `playwright` 包时：

```sh
node <skill目录>/scripts/render.cjs <输入.excalidraw> [输出前缀]
```

Codex 桌面环境缺少依赖时，调用 `load_workspace_dependencies` 获取当前 Node 可执行文件与包目录；不硬编码某个运行时版本或用户目录。通过 `NODE_PATH=<返回的Node包目录>` 运行返回的 Node 和本脚本。浏览器自动检测常见 Chrome/Edge/Chromium 路径，也可用 `DIAGRAM_BROWSER_PATH` 指定；没有系统浏览器时尝试 Playwright 管理的 Chromium。

没有可用依赖时按当前环境规则安装 Playwright/Chromium，或使用上游 README 中的 Python/uv 方案。上游 `render_template.html` 已同步固定相同绘图库版本，但 Python 路径并非本机这次验收路径。

渲染模板会从 esm.sh 联网加载代码，不能声称纯离线。使用独立浏览器，不读取个人浏览器资料。遇到沙箱限制时按环境权限机制处理；没有权限时不要绕过。加载失败时保留源文件，针对明确错误修正一次后再试，持续失败则说明阻碍，不无限重试或谎称已渲染。仅创建文件不代表已完成视觉检查，必须打开 PNG 验收。
