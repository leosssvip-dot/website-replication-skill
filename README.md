# website-replication-skill

> [English](#english) · [中文](#中文)

An **agent-harness-agnostic** skill that audits any reference website or web app and produces a *differentiated parity plan* across UI, interactions, API contracts, data model, and architecture — without copying protected expression. Tested on **Claude Code** and **OpenAI Codex**; any harness that loads markdown skills and exposes file + browser MCP tools can run it.

---

## English

### Overview

**Typical uses**: benchmarking a competitor · replicating a legacy version of your own product · learning behavior from a partner integration · auditing an inspiration source.

**Status**: stable templates · domain-agnostic · works for SaaS, e-commerce, content, collaboration, AI tools, marketplaces, and internal tools.

### Ethics & Legal

This skill replicates **product behavior** (workflows, field structure, state handling, API capability mapping). It does **not** authorize you to:

- Copy logos, exact copy, proprietary assets, or distinctive page composition.
- Bypass authentication, paywalls, rate limits, robots restrictions, or technical protections.
- Substitute for legal advice on trademark, patent, copyright, or Terms-of-Service compliance.

Users are responsible for their own IP, ToS, jurisdiction, and ethics review. Treat the output as engineering planning material, not legal opinion.

The skill enforces **evidence redaction**: cookies, auth headers, tokens, customer data, private message contents, account identifiers, and one-time URLs must never be saved or shared in reports.

### Dependencies

The skill replicates not just UI but **interactions** — buttons, tab switches, mode toggles, async results, error states. That requires a browser automation layer. The agent auto-detects whatever is available and degrades gracefully.

#### Required (at least one browser automation tool)

Without one of these, the skill falls back to static HTML fetch and **every interaction is marked `inferred`** rather than `observed`.

| Tool | Purpose | Install |
|---|---|---|
| **Chrome MCP** (`Claude_in_Chrome`) | Click, screenshot, DOM read, network capture in a real Chrome session | Configure per the Claude-in-Chrome project's published setup steps |
| **Playwright MCP** | Headless / headed browser automation, multi-browser | Microsoft Playwright MCP — install per [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp) |
| **Claude Preview** (`Claude_Preview`) | Sandboxed preview environment with click / eval / screenshot / network | MCP server provided with Claude Code; enable in MCP settings |

#### Recommended (optional, improves coverage)

| Tool | Purpose |
|---|---|
| **Mobile MCP** (`mobile-mcp`) | Real device or simulator screenshots for mobile parity; otherwise DevTools responsive mode is used and findings are marked `inferred` |
| **WebFetch** / **web-reader MCP** | Reading official product docs, API references, changelogs |
| **WebSearch** | Locating docs, integration guides, status pages when URLs are unknown |
| **`curl`** | Unauthenticated endpoint probing when an MCP is not configured |

#### Runtime

- **Claude Code** ≥ current stable, or **OpenAI Codex CLI / IDE** with skills enabled.
- Filesystem write access to the evidence directory (default `./audit/`).

### Repository layout

```
website-replication-skill/
├── SKILL.md                          # Entry point — agent loads this first
├── agents/
│   └── openai.yaml                   # OpenAI Codex skill metadata
├── references/
│   ├── output-template.md            # Implementation-ready deliverable
│   ├── quick-audit-template.md       # ≤1h single-page/workflow audit
│   └── parity-checklist.md           # Coverage self-check
├── examples/
│   └── sample-audit.md               # Fictional walkthrough (no real data)
├── LICENSE                           # MIT
├── .gitignore
└── README.md
```

### Install

#### Claude Code

```bash
mkdir -p ~/.claude/skills
git clone https://github.com/leosssvip-dot/website-replication-skill.git \
  ~/.claude/skills/website-replication-skill
```

> Prefer to customize? Fork the repo and substitute your fork's URL.

Trigger by asking Claude something like "audit this site and produce a parity plan", or invoke explicitly via the skill picker.

#### OpenAI Codex

```bash
mkdir -p ~/.codex/skills
git clone https://github.com/leosssvip-dot/website-replication-skill.git \
  ~/.codex/skills/website-replication-skill
```

> Prefer to customize? Fork the repo and substitute your fork's URL.

In Codex CLI / IDE, type `$website-replication-skill` to invoke explicitly. Implicit invocation is enabled via `agents/openai.yaml`.

#### Other agent harnesses

The skill is plain markdown + a JS enumeration script + a YAML manifest — no harness-specific runtime. Any agent that can:

1. Load markdown files as system / skill context (so `SKILL.md` reaches the model)
2. Read / write files (so `MANIFEST.md`, inventories, and reports persist)
3. Call a browser automation MCP (Chrome MCP / Playwright MCP / equivalent)

…can run it. Copy or symlink this directory into wherever your harness expects skills:

```bash
git clone https://github.com/leosssvip-dot/website-replication-skill.git \
  <your-harness-skill-dir>/website-replication-skill
```

Tested concretely on Claude Code and OpenAI Codex. Other harnesses are expected to work but have not been verified — please open an issue with results if you try one.

#### Project-scoped install

Drop the directory under `.claude/skills/` or `.codex/skills/` (or your harness's equivalent) inside a specific repo to make the skill available only for that project.

### Usage

#### Minimum inputs the skill will ask for

- Reference site URL(s) and scope (which pages, tabs, modes).
- Existing codebase path (if rebuilding into a repo) — optional.
- Existing API or integration docs — optional.
- Differentiation preference: `workflow parity with original style` / `same features with target design system` / `research only`.

If any are missing, the skill proceeds with explicit assumptions and marks unknowns rather than blocking.

#### Picking a template

| Situation | Template |
|---|---|
| ≤ 1h, single page or single workflow | [references/quick-audit-template.md](references/quick-audit-template.md) |
| Implementation-ready audit with API / data / architecture plan | [references/output-template.md](references/output-template.md) |
| Coverage self-check during / after either of the above | [references/parity-checklist.md](references/parity-checklist.md) |

#### Default evidence directory

Screenshots, DOM dumps, network logs, and the final report go to `./audit/<site-slug>/<YYYY-MM-DD>/` unless you specify another path. `audit/` is `.gitignore`'d — never commit real audit evidence.

### Claim taxonomy

Every claim in a report is tagged:

- `observed` — directly seen via interaction or network capture.
- `documented` — found in official API / product docs.
- `inferred` — reasonable deduction from partial evidence.
- `blocked` — would require paid / authenticated access that is unavailable.
- `not applicable` — does not apply to this competitor's product category.

This is the single most important contract of the skill: do not let the agent silently flatten these into "facts".

### Contributing

Pull requests welcome, especially:

- New product-category data-model examples for [output-template.md §7 Data Model](references/output-template.md#7-data-model).
- Real (fully redacted) sample audits under `examples/`.
- Translations of SKILL.md / templates.

Please do **not** submit:

- Sample audits containing real customer data, auth tokens, or non-redacted screenshots.
- Examples that copy competitor logos, distinctive composition, or exact copy.
- Changes that remove the evidence-safety or out-of-scope sections.

### License

[MIT](LICENSE) © 2026 Fred

---

## 中文

### 简介

**与 agent harness 无关**的 skill，可在任意支持加载 markdown skill + 浏览器 MCP 工具的 agent 框架里运行。已在 **Claude Code** 与 **OpenAI Codex** 上验证；其它框架（Cursor / Continue / Aider / 自研 harness 等）按下方"Other agent harnesses"段 symlink 或 copy 即可。

用于审计任意参考网站或 Web 应用，产出一份覆盖 UI、交互、API 契约、数据模型、架构的**差异化对等实施方案** —— 而不复制受保护的表达。

**典型场景**：竞品对标 · 复刻自家旧版产品 · 学习合作方集成行为 · 审计灵感来源。

**状态**：模板已稳定 · 不绑定具体行业 · 适用 SaaS、电商、内容、协作、AI 工具、Marketplace、内部工具。

### 法律与伦理

本 skill 复刻的是**产品行为**（工作流、字段结构、状态处理、API 能力映射），**不授权**你做以下事情：

- 复制 logo、原文文案、专有资产或具有独创性的页面构图。
- 绕过登录、付费墙、限流、robots 限制或任何技术保护措施。
- 替代关于商标、专利、版权或 ToS 合规的法律意见。

知识产权、ToS、司法管辖区与伦理审查由用户自行负责。skill 输出物是工程规划材料，不是法律意见。

skill 强制执行**证据脱敏**：cookies、auth headers、tokens、客户数据、私信内容、账号标识、一次性 URL 一律不得保存或写入报告。

### 依赖

本 skill 不只复刻 UI，还要复刻**交互** —— 按钮、tab 切换、mode toggle、异步结果、错误状态。这需要浏览器自动化能力。Agent 会自动检测当前可用工具并优雅降级。

#### 必需依赖（浏览器自动化工具，至少装一个）

如果一个都没有，skill 会回退到纯静态 HTML 抓取，**所有交互一律标 `inferred`**，不再是 `observed`。

| 工具 | 用途 | 安装 |
|---|---|---|
| **Chrome MCP**（`Claude_in_Chrome`） | 在真实 Chrome 会话里点击、截图、读取 DOM、抓网络请求 | 按 Claude-in-Chrome 项目官方说明配置 |
| **Playwright MCP** | Headless / headed 浏览器自动化，多浏览器 | 微软官方 Playwright MCP，按 [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp) 说明安装 |
| **Claude Preview**（`Claude_Preview`） | 沙箱预览环境，支持 click / eval / screenshot / network | Claude Code 附带的 MCP server，在 MCP 设置里启用 |

#### 推荐依赖（可选，覆盖更全）

| 工具 | 用途 |
|---|---|
| **Mobile MCP**（`mobile-mcp`） | 真机或模拟器移动端截图；没有就退到 DevTools 响应式模式，相关结论标 `inferred` |
| **WebFetch** / **web-reader MCP** | 读官方产品文档、API reference、changelog |
| **WebSearch** | URL 未知时查文档、集成指南、状态页 |
| **`curl`** | 未配置 MCP 时探测无需鉴权的接口 |

#### 运行环境

- **Claude Code** ≥ 当前 stable，或启用 skill 的 **OpenAI Codex CLI / IDE**。
- 对证据目录（默认 `./audit/`）的可写权限。

### 目录结构

```
website-replication-skill/
├── SKILL.md                          # Agent 入口，最先加载
├── agents/
│   └── openai.yaml                   # OpenAI Codex skill 元数据
├── references/
│   ├── output-template.md            # 可落地的完整交付模板
│   ├── quick-audit-template.md       # ≤1h 单页 / 单流程审计
│   └── parity-checklist.md           # 覆盖度自检清单
├── examples/
│   └── sample-audit.md               # 虚构样例（无真实数据）
├── LICENSE                           # MIT
├── .gitignore
└── README.md
```

### 安装

#### Claude Code

```bash
mkdir -p ~/.claude/skills
git clone https://github.com/leosssvip-dot/website-replication-skill.git \
  ~/.claude/skills/website-replication-skill
```

> 想自定义？fork 后用你自己仓库的 URL 替换上面的地址即可。

之后向 Claude 说"audit 这个网站，产出 parity plan"之类的话即可触发；也可在 skill picker 中显式调用。

#### OpenAI Codex

```bash
mkdir -p ~/.codex/skills
git clone https://github.com/leosssvip-dot/website-replication-skill.git \
  ~/.codex/skills/website-replication-skill
```

> 想自定义？fork 后用你自己仓库的 URL 替换上面的地址即可。

在 Codex CLI / IDE 输入 `$website-replication-skill` 显式调用。隐式调用由 `agents/openai.yaml` 启用。

#### 其它 agent 框架

Skill 本体是纯 markdown + JS 枚举脚本 + YAML manifest，没有 harness 专属 runtime。只要你的 agent 能：

1. 把 markdown 文件作为 system / skill 上下文加载（让 `SKILL.md` 能被模型读到）
2. 读写文件（让 `MANIFEST.md`、inventory、报告能持久化）
3. 调用浏览器自动化 MCP（Chrome MCP / Playwright MCP / 同类）

就能跑。把目录 clone / symlink 到 harness 期望的 skill 目录即可：

```bash
git clone https://github.com/leosssvip-dot/website-replication-skill.git \
  <你的-harness-skill-目录>/website-replication-skill
```

Claude Code 与 OpenAI Codex 已实测可用；其它 harness 预期可用但未验证 —— 跑通了欢迎开 issue 反馈。

#### 项目级安装

把目录放进具体仓库的 `.claude/skills/` 或 `.codex/skills/`（或你 harness 的等价目录），skill 只在该项目下可用。

### 使用

#### Skill 会问的最少输入

- 参考站 URL 与范围（页面 / tab / mode）。
- 现有代码仓库路径（重建时）— 可选。
- 现有 API 或集成文档 — 可选。
- 差异化偏好：`workflow parity with original style` / `same features with target design system` / `research only`。

缺项时不阻塞，skill 会显式标注假设并标记未知项。

#### 模板选择

| 场景 | 模板 |
|---|---|
| ≤ 1h，单页或单流程 | [references/quick-audit-template.md](references/quick-audit-template.md) |
| 含 API / 数据 / 架构的可落地审计 | [references/output-template.md](references/output-template.md) |
| 上述过程中 / 之后做覆盖度自检 | [references/parity-checklist.md](references/parity-checklist.md) |

#### 默认证据目录

截图、DOM、网络日志、最终报告写入 `./audit/<site-slug>/<YYYY-MM-DD>/`，除非你指定其他路径。`audit/` 默认在 `.gitignore` 内，**真实证据不要提交到仓库**。

### Claim 分级体系

报告里每条结论都打标签：

- `observed` —— 通过交互或网络抓包直接看到的。
- `documented` —— 官方 API / 产品文档里写明的。
- `inferred` —— 从局部证据合理推断的。
- `blocked` —— 需要付费 / 鉴权访问而当前不可达的。
- `not applicable` —— 该竞品品类不适用。

这是 skill 最重要的契约：**不允许 agent 把它们偷偷合并为"事实"**。

### 贡献

欢迎 PR，尤其是：

- 给 [output-template.md §7 Data Model](references/output-template.md#7-data-model) 补新品类的数据模型样例。
- 在 `examples/` 下提交**完全脱敏**的真实审计样例。
- SKILL.md / 模板的多语言翻译。

请**不要**提交：

- 含真实客户数据、auth token、未脱敏截图的样例。
- 复制了竞品 logo、独创性构图或原文文案的样例。
- 删除证据安全或 out-of-scope 章节的改动。

### 许可证

[MIT](LICENSE) © 2026 Fred
