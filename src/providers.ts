import { AiCommitConfiguration } from './config';
import { CommitPrompt } from './commitMessage';
import { UserFacingError } from './errors';

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
	if (configuration.provider === 'anthropic') {
		return new AnthropicProvider(configuration, fetchClient);
	}

	return new OpenAiCompatibleProvider(configuration, fetchClient);
}

export function buildEndpoint(baseUrl: string, endpointPath: string): string {
	return `${baseUrl.replace(/\/+$/, '')}/${endpointPath.replace(/^\/+/, '')}`;
}

class AnthropicProvider implements LlmProvider {
	constructor(
		private readonly configuration: AiCommitConfiguration,
		private readonly fetchClient: FetchClient,
	) {}

	async generate(prompt: CommitPrompt): Promise<string> {
		const response = await requestJson(
			'Anthropic',
			buildEndpoint(this.configuration.baseUrl, 'v1/messages'),
			{
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					'x-api-key': this.configuration.apiKey,
					'anthropic-version': '2023-06-01',
				},
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
			throw new UserFacingError('Anthropic 返回了无法识别的响应。');
		}

		return content;
	}
}

class OpenAiCompatibleProvider implements LlmProvider {
	constructor(
		private readonly configuration: AiCommitConfiguration,
		private readonly fetchClient: FetchClient,
	) {}

	async generate(prompt: CommitPrompt): Promise<string> {
		const response = await requestJson(
			'OpenAI Compatible',
			buildEndpoint(this.configuration.baseUrl, 'chat/completions'),
			{
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					authorization: `Bearer ${this.configuration.apiKey}`,
				},
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
			throw new UserFacingError('OpenAI Compatible 返回了无法识别的响应。');
		}

		return message;
	}
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
		throw new UserFacingError(`${providerName} 请求失败，请检查网络和 aiCommit.baseUrl。`);
	}

	if (!response.ok) {
		throw new UserFacingError(`${providerName} 请求失败（HTTP ${response.status}）。`);
	}

	try {
		return await response.json();
	} catch {
		throw new UserFacingError(`${providerName} 返回了无效的 JSON。`);
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

const defaultFetchClient: FetchClient = async (url, options) => fetch(url, options);
