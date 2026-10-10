---
name: summarize
description: "Summarize or transcribe URLs, YouTube/videos, podcasts, articles, transcripts, PDFs, and local files."
license: MIT
metadata:
  homepage: https://summarize.sh
  openclaw:
    emoji: "🧾"
    requires:
      bins: ["summarize"]
---

## 用途与项目边界

用户要求总结链接、文章、视频、播客、PDF 或本地文件，提取转录，或明确使用 summarize.sh 时使用。遵守项目 [AGENTS.md](../../../AGENTS.md)；普通总结留在对话中，要求保存时接入 [knowledge-save](../knowledge-save/SKILL.md)，按来源规则判断 readings 与自己的知识卡片。

输出沿用用户要求及项目 [正文写法](../../../docs/writing-style.md)，不因工具示例改变语言、篇幅或笔记模板。请求转录但内容过长时，可先给简短摘要并询问需要展开的时间段；摘要不能冒充完整转录。

## 工具选择与执行

1. 先检查 `summarize` 是否在 PATH；可用时运行 `summarize --version` 和 `summarize --help` 核对当前选项，需要模型摘要时再检查 `summarize status`。同轮已知结果复用，不读取或输出密钥。
2. 按 [上游工作流](references/upstream.md) 选择本次需要的摘要、提取、媒体或 JSON 分支。只需原文或转录时用提取模式；该模式跳过最终摘要，不保证 OCR、转录或提取服务完全在本地运行。
3. 工具不存在或所需输入不受支持时，使用当前可用的网页、文件或转录能力完成用户请求，并说明实际来源与限制；用户明确指定 CLI 时如实说明不可用，不声称执行成功。安装、配置或新增服务应服务当前需求，不为普通摘要自动更换全局配置。
4. 核对实际结果：CLI 退出成功且内容非空，JSON 可解析；区分完整原文、部分提取和模型摘要。提取失败时不根据标题或摘要补造原文，影响结论的来源与时间定位需保留。

## 来源与维护

工具工作流来自 [steipete/summarize](https://github.com/steipete/summarize/blob/main/.agents/skills/summarize/SKILL.md)，许可见 [LICENSE.txt](LICENSE.txt)。本地入口保留原有触发范围和项目适配，上游正文置于 references 按需读取，不另维护第二份命令大全；网页读取日期与未固定提交的限制已记录在参考文件。更新时比较行为与依赖，只同步适合当前版本的内容，不覆盖项目保存与学习约定。
