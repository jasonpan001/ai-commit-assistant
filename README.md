# AI Commit Assistant

[English](README.md) | [中文](README.zh-cn.md)

Generate Conventional Commit messages from your staged Git diff using cloud or local LLM providers. The result is written into the Git commit input box and copied to the clipboard.

Default format:

```text
type(scope): description
```

Example:

```text
fix(rtc): sync room leave state on exit
```

## How to use

1. Open a Git repository in VS Code.
2. Stage the changes you want to commit (`git add` or the Source Control panel).
3. Configure the LLM provider, API key, and model.
4. Click the AI Commit button at the top of the Source Control panel, or run `AI Commit: Generate Commit Message` from the Command Palette.
5. Review the message in the Git commit input box, then commit with your usual workflow.

The extension also copies the message to the clipboard. It never runs `git commit` or changes the staging area. If the commit input already has text, you will be asked whether to overwrite it; canceling skips the LLM request.

## Localization

The extension UI and runtime messages follow the VS Code display language. Generated commit descriptions use the same language by default. Supported languages:

- English
- Simplified Chinese, Traditional Chinese
- Japanese, Korean
- Spanish, French, German
- Portuguese (Brazil), Russian

Use `Configure Display Language` from the Command Palette, install or select a language pack, then reload when prompted. Unsupported display languages fall back to English.

To keep the UI language and commit description language separate, set `aiCommit.commitLanguage`. The default `auto` follows the VS Code display language. An explicit value only affects the commit description, not settings, commands, or notifications. For example, with an English UI and `zh-cn`, descriptions are generated in Simplified Chinese.

Output always keeps the `type(scope): description` shape; `type` and `scope` stay English identifiers, and only the description follows the selected commit language.

## Configuration

| Setting | Required | Description |
| --- | --- | --- |
| `aiCommit.provider` | Yes | AI provider used to generate commit messages. Default: `openai-compatible` |
| `aiCommit.baseUrl` | Depends on provider | Optional API base URL. Leave empty to use the preset endpoint; required for Azure OpenAI |
| `aiCommit.apiKey` | Depends on provider | Required for cloud providers; optional for Ollama and LM Studio. Stored in machine-scoped VS Code settings, not SecretStorage, and not synchronized |
| `aiCommit.model` | Yes | Model ID used for generation, or the Azure OpenAI deployment name |
| `aiCommit.commitLanguage` | No | Commit description language. Default: `auto`; `type` and `scope` remain in English |

### Provider presets

| Provider | Value | Default Base URL | API Key | Protocol |
| --- | --- | --- | --- | --- |
| Anthropic | `anthropic` | `https://api.anthropic.com` | Required | Messages |
| OpenAI | `openai` | `https://api.openai.com/v1` | Required | Chat Completions |
| OpenAI Compatible | `openai-compatible` | `https://api.openai.com/v1` | Required | Chat Completions |
| Google Gemini | `gemini` | `https://generativelanguage.googleapis.com/v1beta` | Required | Generate Content |
| Azure OpenAI | `azure-openai` | None; you must set the resource URL | Required | Chat Completions |
| DeepSeek | `deepseek` | `https://api.deepseek.com` | Required | Chat Completions |
| OpenRouter | `openrouter` | `https://openrouter.ai/api/v1` | Required | Chat Completions |
| Groq | `groq` | `https://api.groq.com/openai/v1` | Required | Chat Completions |
| xAI | `xai` | `https://api.x.ai/v1` | Required | Chat Completions |
| Mistral AI | `mistral` | `https://api.mistral.ai/v1` | Required | Chat Completions |
| Together AI | `together` | `https://api.together.xyz/v1` | Required | Chat Completions |
| Ollama | `ollama` | `http://localhost:11434/v1` | Optional | Chat Completions |
| LM Studio | `lm-studio` | `http://localhost:1234/v1` | Optional | Chat Completions |

Model names are managed by each provider and may change. This extension does not ship a default model. Use a model id available on your account.

### Configuration examples

OpenAI Compatible works with any service that implements `POST {baseUrl}/chat/completions`:

```json
{
  "aiCommit.provider": "openai-compatible",
  "aiCommit.baseUrl": "https://llm.example.com/v1",
  "aiCommit.apiKey": "YOUR_API_KEY",
  "aiCommit.model": "YOUR_MODEL_ID"
}
```

Anthropic:

```json
{
  "aiCommit.provider": "anthropic",
  "aiCommit.apiKey": "YOUR_API_KEY",
  "aiCommit.model": "YOUR_CLAUDE_MODEL_ID"
}
```

Google Gemini:

```json
{
  "aiCommit.provider": "gemini",
  "aiCommit.apiKey": "YOUR_GEMINI_API_KEY",
  "aiCommit.model": "YOUR_GEMINI_MODEL_ID"
}
```

For Azure OpenAI, Base URL must point at the resource OpenAI v1 endpoint, and `model` is the deployment name:

```json
{
  "aiCommit.provider": "azure-openai",
  "aiCommit.baseUrl": "https://YOUR_RESOURCE.openai.azure.com/openai/v1",
  "aiCommit.apiKey": "YOUR_AZURE_OPENAI_API_KEY",
  "aiCommit.model": "YOUR_DEPLOYMENT_NAME"
}
```

Ollama connects to a local service by default and does not require an API key:

```json
{
  "aiCommit.provider": "ollama",
  "aiCommit.model": "YOUR_LOCAL_MODEL"
}
```

LM Studio works the same way with provider `lm-studio`. If the local server requires a Bearer token, also set `aiCommit.apiKey`.

A user-configured `aiCommit.baseUrl` always overrides the preset URL, which is useful for enterprise proxies, private deployments, or compatible gateways.

### Commit language example

Keep the VS Code UI language unchanged while asking the LLM for Simplified Chinese descriptions:

```json
{
  "aiCommit.commitLanguage": "zh-cn"
}
```

Allowed values: `auto`, `en`, `zh-cn`, `zh-tw`, `ja`, `ko`, `es`, `fr`, `de`, `pt-br`, and `ru`. Workspace settings follow normal VS Code precedence and can override User settings.

## Data and credential safety

Running the command sends the full staged diff, system prompt, and model id to the final request URL of the selected provider. Use this only when allowed by your organization policy, and make sure the Base URL and its operator are trusted.

- `aiCommit.apiKey` is sensitive. Do not put real keys in a committed `.vscode/settings.json`.
- API keys are stored in VS Code machine-scope settings, not SecretStorage, and are not synchronized.
- The extension does not log API keys, staged diffs, request bodies, or raw provider responses.
- Default HTTP endpoints for Ollama and LM Studio point at `localhost` only. Do not send sensitive diffs to untrusted remote cleartext HTTP URLs.
- A custom Base URL receives the full staged diff; the extension cannot verify whether a proxy stores or forwards that data.

## MVP limitations

- One repository at a time; in multi-root workspaces the active editor's folder is preferred.
- Non-streaming text generation only; no retries, failover, custom prompts, or custom commit formats.
- Large diffs are not truncated or summarized; requests may fail when Git buffers or model context limits are exceeded.
- Git diff and provider requests time out after 30 seconds.
- Only the single-line Conventional Commit structure is validated; semantics and description language still need human review.
- Amazon Bedrock SigV4, Google Vertex AI OAuth, and cloud workload identity are not supported yet.
