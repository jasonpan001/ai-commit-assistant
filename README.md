# AI Commit Assistant

根据当前 Git 仓库的 staged diff 调用 LLM，生成一条中文 Conventional Commit message，并复制到系统剪贴板。

默认格式：

```text
type(scope): 中文描述
```

例如：

```text
fix(rtc): 修复房间退出状态同步问题
```

## 使用方式

1. 在 VS Code 中打开 Git 仓库。
2. 使用 `git add` 或 Source Control 面板暂存需要提交的变更。
3. 配置 LLM Provider、API Key 和模型。
4. 打开命令面板，执行 `AI Commit: Generate Message`。
5. 检查剪贴板中的结果，再通过自己的 Git 工作流提交。

扩展不会执行 `git commit`、不会修改暂存区，也不会自动填写 Source Control 输入框。

## 配置

| 设置 | 必填 | 说明 |
| --- | --- | --- |
| `aiCommit.provider` | 是 | `anthropic` 或 `openai-compatible`，默认后者 |
| `aiCommit.baseUrl` | 否 | API Base URL；留空使用 Provider 默认值 |
| `aiCommit.apiKey` | 是 | API Key，按 machine scope 保存 |
| `aiCommit.model` | 是 | Provider 接受的模型标识 |

OpenAI Compatible 示例：

```json
{
  "aiCommit.provider": "openai-compatible",
  "aiCommit.baseUrl": "https://api.openai.com/v1",
  "aiCommit.apiKey": "YOUR_API_KEY",
  "aiCommit.model": "gpt-4.1-mini"
}
```

Anthropic 示例：

```json
{
  "aiCommit.provider": "anthropic",
  "aiCommit.baseUrl": "https://api.anthropic.com",
  "aiCommit.apiKey": "YOUR_API_KEY",
  "aiCommit.model": "claude-sonnet-4-20250514"
}
```

OpenAI-compatible 服务需要支持 `POST {baseUrl}/chat/completions`；Anthropic 服务需要支持 `POST {baseUrl}/v1/messages`。

## 数据与凭证安全

执行命令会把完整 staged diff 发送到配置的 LLM 地址。请只在组织策略允许时使用，并确保 Base URL 可信。

`aiCommit.apiKey` 是敏感配置。不要将包含真实密钥的 `.vscode/settings.json` 或用户设置文件提交到版本控制。扩展不会记录 API Key、staged diff、请求正文或 Provider 原始响应。

## MVP 限制

- 每次只处理一个仓库；多根工作区会优先使用当前编辑器所属工作区。
- 不支持流式响应、重试、自定义 Prompt 或自定义提交格式。
- 不对大 diff 做截断或摘要，超过 Git 缓冲区或模型上下文限制时会失败并提示。
- Git diff 和 Provider 请求的超时时间固定为 30 秒。
- 仅校验输出结构和中文描述，语义正确性仍需人工审核。
