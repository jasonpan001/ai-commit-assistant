# AI Commit Assistant

[English](README.md) | [中文](README.zh-cn.md)

根据当前 Git 仓库的 staged diff 调用 LLM，生成 Conventional Commit message，写入 Git 提交输入框并复制到系统剪贴板。

默认格式：

```text
type(scope): description
```

例如：

```text
fix(rtc): 修复房间退出状态同步问题
```

## 使用方式

1. 在 VS Code 中打开 Git 仓库。
2. 使用 `git add` 或 Source Control 面板暂存需要提交的变更。
3. 配置 LLM Provider、API Key 和模型。
4. 点击 Source Control 面板顶部的 AI Commit 按钮，或通过命令面板执行 `AI Commit: Generate Message`。
5. 检查 Git 提交输入框中的结果，再通过自己的 Git 工作流提交。

扩展会同时保留一份剪贴板副本，但不会执行 `git commit` 或修改暂存区。提交输入框已有内容时，会先询问是否覆盖；取消后不会请求 LLM。

## 多语言

扩展界面和运行时提示会跟随 VS Code 的显示语言，生成结果中的 description 也会使用相同语言。当前支持：

- English
- 简体中文、繁體中文
- 日本語、한국어
- Español、Français、Deutsch
- Português (Brasil)、Русский

通过命令面板执行 `Configure Display Language`，安装或选择对应的 VS Code 语言包，然后按 VS Code 提示重新加载窗口即可切换。未支持的显示语言会回退到英文。

如果希望界面语言和 Commit description 使用不同语言，可通过 `aiCommit.commitLanguage` 显式选择。默认值 `auto` 表示跟随 VS Code 显示语言；显式选择只影响 Commit description，不会改变设置页、命令或通知语言。例如，英文界面选择 `zh-cn` 后会生成中文 description。

生成结果始终保持 `type(scope): description` 结构；`type` 和 `scope` 使用英文标识，只有 description 跟随所选 Commit 语言。

## 配置

| 设置 | 必填 | 说明 |
| --- | --- | --- |
| `aiCommit.provider` | 是 | LLM Provider，默认 `openai-compatible` |
| `aiCommit.commitLanguage` | 否 | Commit description 语言，默认 `auto`；支持在 User 或 Workspace 设置中覆盖 |
| `aiCommit.baseUrl` | 视 Provider 而定 | 留空使用预设地址；Azure OpenAI 必填 |
| `aiCommit.apiKey` | 视 Provider 而定 | 云端 Provider 必填；Ollama、LM Studio 可留空；按 machine scope 保存 |
| `aiCommit.model` | 是 | Provider 接受的模型或 Azure 部署标识 |

### Provider 预设

| Provider | 配置值 | 默认 Base URL | API Key | 协议 |
| --- | --- | --- | --- | --- |
| Anthropic | `anthropic` | `https://api.anthropic.com` | 必填 | Messages |
| OpenAI | `openai` | `https://api.openai.com/v1` | 必填 | Chat Completions |
| OpenAI Compatible | `openai-compatible` | `https://api.openai.com/v1` | 必填 | Chat Completions |
| Google Gemini | `gemini` | `https://generativelanguage.googleapis.com/v1beta` | 必填 | Generate Content |
| Azure OpenAI | `azure-openai` | 无，必须配置资源地址 | 必填 | Chat Completions |
| DeepSeek | `deepseek` | `https://api.deepseek.com` | 必填 | Chat Completions |
| OpenRouter | `openrouter` | `https://openrouter.ai/api/v1` | 必填 | Chat Completions |
| Groq | `groq` | `https://api.groq.com/openai/v1` | 必填 | Chat Completions |
| xAI | `xai` | `https://api.x.ai/v1` | 必填 | Chat Completions |
| Mistral AI | `mistral` | `https://api.mistral.ai/v1` | 必填 | Chat Completions |
| Together AI | `together` | `https://api.together.xyz/v1` | 必填 | Chat Completions |
| Ollama | `ollama` | `http://localhost:11434/v1` | 可选 | Chat Completions |
| LM Studio | `lm-studio` | `http://localhost:1234/v1` | 可选 | Chat Completions |

模型名称由各 Provider 管理且可能变化，扩展不会内置默认模型。请填写当前账户可用的模型标识。

### 配置示例

OpenAI Compatible 可用于任何实现 `POST {baseUrl}/chat/completions` 的服务：

```json
{
  "aiCommit.provider": "openai-compatible",
  "aiCommit.baseUrl": "https://llm.example.com/v1",
  "aiCommit.apiKey": "YOUR_API_KEY",
  "aiCommit.model": "YOUR_MODEL_ID"
}
```

Anthropic：

```json
{
  "aiCommit.provider": "anthropic",
  "aiCommit.apiKey": "YOUR_API_KEY",
  "aiCommit.model": "YOUR_CLAUDE_MODEL_ID"
}
```

Google Gemini：

```json
{
  "aiCommit.provider": "gemini",
  "aiCommit.apiKey": "YOUR_GEMINI_API_KEY",
  "aiCommit.model": "YOUR_GEMINI_MODEL_ID"
}
```

Azure OpenAI 的 Base URL 必须指向资源的 OpenAI v1 地址，`model` 填部署标识：

```json
{
  "aiCommit.provider": "azure-openai",
  "aiCommit.baseUrl": "https://YOUR_RESOURCE.openai.azure.com/openai/v1",
  "aiCommit.apiKey": "YOUR_AZURE_OPENAI_API_KEY",
  "aiCommit.model": "YOUR_DEPLOYMENT_NAME"
}
```

Ollama 默认连接本机服务，不要求 API Key：

```json
{
  "aiCommit.provider": "ollama",
  "aiCommit.model": "YOUR_LOCAL_MODEL"
}
```

LM Studio 使用方式相同，将 Provider 改为 `lm-studio`。如果本地服务启用了 Bearer Token，可同时配置 `aiCommit.apiKey`。

用户配置的 `aiCommit.baseUrl` 始终优先于预设地址，可用于企业代理、私有部署或兼容网关。

### Commit 语言示例

以下配置会保持 VS Code 界面语言不变，同时要求 LLM 生成简体中文 description：

```json
{
  "aiCommit.commitLanguage": "zh-cn"
}
```

可选值为 `auto`、`en`、`zh-cn`、`zh-tw`、`ja`、`ko`、`es`、`fr`、`de`、`pt-br` 和 `ru`。Workspace 设置遵循 VS Code 原生配置优先级，可覆盖 User 设置。

## 数据与凭证安全

执行命令会把完整 staged diff、系统 Prompt 和模型标识发送到所选 Provider 的最终请求地址。请只在组织策略允许时使用，并确认 Base URL 及其运营方可信。

- `aiCommit.apiKey` 是敏感配置。不要将真实密钥写入会提交的 `.vscode/settings.json`。
- API Key 当前存储在 VS Code machine scope 设置中，并非 VS Code SecretStorage。
- 扩展不会记录 API Key、staged diff、请求正文或 Provider 原始响应。
- Ollama 和 LM Studio 的默认 HTTP 地址仅指向 `localhost`。不要把敏感 diff 发送到不可信的远程明文 HTTP 地址。
- 自定义 Base URL 会接收完整 staged diff，扩展无法验证代理是否保存或转发数据。

## MVP 限制

- 每次只处理一个仓库；多根工作区会优先使用当前编辑器所属工作区。
- 仅支持非流式文本生成，不支持重试、故障转移、自定义 Prompt 或自定义提交格式。
- 不对大 diff 做截断或摘要，超过 Git 缓冲区或模型上下文限制时会失败并提示。
- Git diff 和 Provider 请求的超时时间固定为 30 秒。
- 仅校验单行 Conventional Commit 输出结构，语义和描述语言正确性仍需人工审核。
- 暂不支持 Amazon Bedrock SigV4、Google Vertex AI OAuth 或云厂商工作负载身份认证。
