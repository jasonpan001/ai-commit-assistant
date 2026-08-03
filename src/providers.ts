import { AiCommitConfiguration } from './config';
import { CommitPrompt } from './commitMessage';
import { UserFacingError } from './errors';
import { localize } from './localization';
import { AuthenticationStrategy, getProviderDefinition, ProviderDefinition } from './providerCatalog';

export interface LlmProvider {
	generate(prompt: CommitPrompt): Promise<string>;
}

export interface HttpRequestOptions {
	method: 'POST';
	headers: Record<string, string>;
	body: string;
	signal?: AbortSignal;
}

export interface HttpResponse {
	ok: boolean;
	status: number;
	json(): Promise<unknown>;
}

export type FetchClient = (url: string, options: HttpRequestOptions) => Promise<HttpResponse>;

const REQUEST_TIMEOUT_MS = 30_000;

export function createLlmProvider(
	configuration: AiCommitConfiguration,
	fetchClient: FetchClient = defaultFetchClient,
): LlmProvider {
	const definition = getProviderDefinition(configuration.provider);
	switch (definition.protocol) {
		case 'anthropic-messages':
			return new AnthropicProvider(configuration, definition, fetchClient);
		case 'gemini-generate-content':
			return new GeminiProvider(configuration, definition, fetchClient);
		case 'openai-chat':
			return new OpenAiCompatibleProvider(configuration, definition, fetchClient);
	}
}

export function buildEndpoint(baseUrl: string, endpointPath: string): string {
	return `${baseUrl.replace(/\/+$/, '')}/${endpointPath.replace(/^\/+/, '')}`;
}

class AnthropicProvider implements LlmProvider {
	constructor(
		private readonly configuration: AiCommitConfiguration,
		private readonly definition: ProviderDefinition,
		private readonly fetchClient: FetchClient,
	) {}

	async generate(prompt: CommitPrompt): Promise<string> {
		const response = await requestJson(
			this.definition.label,
			buildEndpoint(this.configuration.baseUrl, 'v1/messages'),
			{
				method: 'POST',
				headers: buildHeaders(this.definition.authentication, this.configuration.apiKey),
				body: JSON.stringify({
					model: this.configuration.model,
					max_tokens: 128,
					system: prompt.system,
					messages: [{ role: 'user', content: prompt.user }],
				}),
			},
			this.fetchClient,
		);

		const content = isRecord(response) && Array.isArray(response.content)
			? response.content
				.filter(isRecord)
				.filter(item => item.type === 'text' && typeof item.text === 'string')
				.map(item => item.text as string)
				.join('')
				.trim()
			: '';

		if (!content) {
			throw new UserFacingError(localize('unrecognizedProviderResponse', this.definition.label));
		}

		return content;
	}
}

class OpenAiCompatibleProvider implements LlmProvider {
	constructor(
		private readonly configuration: AiCommitConfiguration,
		private readonly definition: ProviderDefinition,
		private readonly fetchClient: FetchClient,
	) {}

	async generate(prompt: CommitPrompt): Promise<string> {
		const response = await requestJson(
			this.definition.label,
			buildEndpoint(this.configuration.baseUrl, 'chat/completions'),
			{
				method: 'POST',
				headers: buildHeaders(this.definition.authentication, this.configuration.apiKey),
				body: JSON.stringify({
					model: this.configuration.model,
					messages: [
						{ role: 'system', content: prompt.system },
						{ role: 'user', content: prompt.user },
					],
				}),
			},
			this.fetchClient,
		);

		const firstChoice = isRecord(response) && Array.isArray(response.choices)
			? response.choices[0]
			: undefined;
		const message = isRecord(firstChoice) && isRecord(firstChoice.message)
			? firstChoice.message.content
			: undefined;

		if (typeof message !== 'string' || !message.trim()) {
			throw new UserFacingError(localize('unrecognizedProviderResponse', this.definition.label));
		}

		return message;
	}
}

class GeminiProvider implements LlmProvider {
	constructor(
		private readonly configuration: AiCommitConfiguration,
		private readonly definition: ProviderDefinition,
		private readonly fetchClient: FetchClient,
	) {}

	async generate(prompt: CommitPrompt): Promise<string> {
		const model = this.configuration.model.replace(/^models\//, '');
		const response = await requestJson(
			this.definition.label,
			buildEndpoint(this.configuration.baseUrl, `models/${encodeURIComponent(model)}:generateContent`),
			{
				method: 'POST',
				headers: buildHeaders(this.definition.authentication, this.configuration.apiKey),
				body: JSON.stringify({
					systemInstruction: { parts: [{ text: prompt.system }] },
					contents: [{ role: 'user', parts: [{ text: prompt.user }] }],
					generationConfig: { maxOutputTokens: 128 },
				}),
			},
			this.fetchClient,
		);

		const firstCandidate = isRecord(response) && Array.isArray(response.candidates)
			? response.candidates[0]
			: undefined;
		const content = isRecord(firstCandidate) ? firstCandidate.content : undefined;
		const text = isRecord(content) && Array.isArray(content.parts)
			? content.parts
				.filter(isRecord)
				.filter(part => typeof part.text === 'string')
				.map(part => part.text as string)
				.join('')
				.trim()
			: '';

		if (!text) {
			throw new UserFacingError(localize('unrecognizedProviderResponse', this.definition.label));
		}

		return text;
	}
}

export function buildHeaders(
	authentication: AuthenticationStrategy,
	apiKey: string,
): Record<string, string> {
	const headers: Record<string, string> = { 'content-type': 'application/json' };

	switch (authentication) {
		case 'bearer':
		case 'optional-bearer':
			if (apiKey) {
				headers.authorization = `Bearer ${apiKey}`;
			}
			break;
		case 'anthropic-key':
			headers['x-api-key'] = apiKey;
			headers['anthropic-version'] = '2023-06-01';
			break;
		case 'gemini-key':
			headers['x-goog-api-key'] = apiKey;
			break;
		case 'azure-key':
			headers['api-key'] = apiKey;
			break;
	}

	return headers;
}

async function requestJson(
	providerName: string,
	url: string,
	options: HttpRequestOptions,
	fetchClient: FetchClient,
): Promise<unknown> {
	let response: HttpResponse;
	try {
		response = await fetchClient(url, {
			...options,
			signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
		});
	} catch {
		throw new UserFacingError(localize('providerRequestFailed', providerName));
	}

	if (!response.ok) {
		throw new UserFacingError(localize('providerHttpFailed', providerName, response.status));
	}

	try {
		return await response.json();
	} catch {
		throw new UserFacingError(localize('providerInvalidJson', providerName));
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

const defaultFetchClient: FetchClient = async (url, options) => fetch(url, options);
