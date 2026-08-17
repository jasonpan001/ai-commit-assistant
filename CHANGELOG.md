# Change Log

All notable changes to the "ai-commit-assistant" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed

- Generate commit messages silently and replace unchanged existing commit input without a confirmation prompt
- Generate from staged, unstaged, and untracked text changes without requiring `git add`; ignored and binary files are excluded

## [0.0.1] - 2026-08-07

### Added

- Generate Conventional Commit messages from staged Git diffs via cloud and local LLM providers
- Source Control title-bar action and `StagedCraft AI: Generate Commit Message` command
- Provider presets: Anthropic, OpenAI, OpenAI-compatible, Gemini, Azure OpenAI, DeepSeek, OpenRouter, Groq, xAI, Mistral, Together, Ollama, LM Studio
- UI and runtime localization for English, zh-CN, zh-TW, ja, ko, es, fr, de, pt-BR, and ru
- `aiCommit.commitLanguage` setting to decouple commit description language from the VS Code display language
- Per-provider API key storage using VS Code SecretStorage, with a direct setup action when a key is missing
- Write generated messages into the Git commit input box and copy them to the clipboard
