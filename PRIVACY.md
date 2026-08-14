# StagedCraft AI Privacy Policy

Effective date: August 14, 2026

This Privacy Policy explains how the StagedCraft AI Visual Studio Code extension (the "Extension") processes information when you use it.

## Summary

- The Extension does not operate or send data through a server controlled by the publisher.
- The Extension does not collect telemetry, analytics, advertising identifiers, or usage statistics.
- A request is sent only when you explicitly run the command to generate a commit message.
- The request goes directly from Visual Studio Code to the AI provider or custom endpoint you configure.

## Information processed

When you generate a commit message, the Extension processes and sends the following information to the selected provider endpoint:

- the full staged Git diff, which may contain source code, configuration, personal data, credentials, or other confidential information;
- the system instruction used to request a Conventional Commit message;
- the selected commit language; and
- the configured model or deployment identifier.

If the selected provider requires authentication, its API key is sent only as an authentication credential to that provider endpoint. The publisher does not receive the API key or request content.

## Local storage

- API keys are stored separately for each provider using Visual Studio Code SecretStorage. They are not written to workspace settings and are not synchronized by the Extension.
- Provider, base URL, model, and language preferences are stored using Visual Studio Code settings.
- A generated commit message is written to the Git commit input and copied to the system clipboard.

The Extension does not write API keys, staged diffs, request bodies, or raw provider responses to logs.

## Third-party services

Cloud providers and custom endpoints are independent third parties. Their collection, use, retention, and protection of request data are governed by their own terms and privacy policies. You are responsible for reviewing the policy of the selected provider and confirming that sending the staged diff is permitted by your organization.

A custom Base URL receives the full request and authentication credential. Use only endpoints whose operators you trust. The Extension cannot determine whether a provider or proxy stores, analyzes, or forwards submitted data.

Ollama and LM Studio can be used with a local endpoint so that requests do not need to leave your machine. Their behavior still depends on how you configure and operate those services.

## Data retention

The publisher does not collect or retain request content, API keys, staged diffs, generated messages, or usage data. Any retention performed by a selected provider or custom endpoint is controlled by that third party and is outside the publisher's control.

## Your choices

You can:

- review and limit staged changes before generating a message;
- use a local provider;
- clear the selected provider's API key with `StagedCraft AI: Clear API Key`;
- change or remove provider settings; or
- disable or uninstall the Extension.

## Security

The Extension uses the security facilities provided by Visual Studio Code and avoids logging sensitive request data. No method of storage or network transmission is guaranteed to be completely secure. Keep Visual Studio Code and the Extension updated, and use HTTPS for non-local provider endpoints.

## Changes to this policy

This policy may be updated when the Extension's data practices change. Material changes will be documented in the Extension changelog, and the effective date above will be updated.

## Contact

For privacy questions or requests, open an issue in the [StagedCraft AI GitHub repository](https://github.com/jasonpan001/ai-commit-assistant/issues).
