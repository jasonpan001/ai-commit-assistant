import * as assert from 'node:assert';
import { AiCommitConfiguration } from '../config';
import { CommitPrompt } from '../commitMessage';
import { ProviderName } from '../providerCatalog';
import {
	buildEndpoint,
	createLlmProvider,
	FetchClient,
	HttpRequestOptions,
	HttpResponse,
} from '../providers';

const prompt: CommitPrompt = {
	system: 'system prompt',
	user: 'user prompt',
};

suite('LLM providers', () => {
	test('normalizes endpoint slashes', () => {
		assert.strictEqual(buildEndpoint('https://example.com/v1///', '/chat/completions'), 'https://example.com/v1/chat/completions');
	});

	test('creates an Anthropic Messages request and extracts text blocks', async () => {
		let request: CapturedRequest | undefined;
		const provider = createLlmProvider(configuration('anthropic'), captureRequest(
			{ content: [{ type: 'text', text: 'fix(api): ' }, { type: 'text', text: '修复请求错误' }] },
			captured => { request = captured; },
		));

		const result = await provider.generate(prompt);

		assert.strictEqual(result, 'fix(api): 修复请求错误');
		assert.strictEqual(request?.url, 'https://provider.example/v1/messages');
		assert.strictEqual(request?.options.headers['x-api-key'], 'sensitive-key');
		assert.strictEqual(request?.options.headers['anthropic-version'], '2023-06-01');
		assert.strictEqual(request?.options.headers.authorization, undefined);
		assert.ok(request?.options.signal);
		assert.deepStrictEqual(JSON.parse(request?.options.body ?? '{}'), {
			model: 'test-model',
			max_tokens: 128,
			system: 'system prompt',
			messages: [{ role: 'user', content: 'user prompt' }],
		});
	});

	test('creates a Gemini request and extracts text parts', async () => {
		let request: CapturedRequest | undefined;
		const provider = createLlmProvider(configuration('gemini'), captureRequest(
			{ candidates: [{ content: { parts: [{ text: 'feat(ai): ' }, { text: '增加模型支持' }] } }] },
			captured => { request = captured; },
		));

		const result = await provider.generate(prompt);

		assert.strictEqual(result, 'feat(ai): 增加模型支持');
		assert.strictEqual(request?.url, 'https://provider.example/models/test-model:generateContent');
		assert.strictEqual(request?.options.headers['x-goog-api-key'], 'sensitive-key');
		assert.strictEqual(request?.options.headers.authorization, undefined);
		assert.deepStrictEqual(JSON.parse(request?.options.body ?? '{}'), {
			systemInstruction: { parts: [{ text: 'system prompt' }] },
			contents: [{ role: 'user', parts: [{ text: 'user prompt' }] }],
			generationConfig: { maxOutputTokens: 128 },
		});
	});

	test('accepts a Gemini model with a models prefix', async () => {
		let request: CapturedRequest | undefined;
		const provider = createLlmProvider(
			configuration('gemini', { model: 'models/gemini-test' }),
			captureRequest(
				{ candidates: [{ content: { parts: [{ text: 'fix(ai): 修复模型路径' }] } }] },
				captured => { request = captured; },
			),
		);

		await provider.generate(prompt);

		assert.strictEqual(request?.url, 'https://provider.example/models/gemini-test:generateContent');
	});

	const compatibleProviders = [
		'anthropic',
		'openai',
		'openai-compatible',
		'deepseek',
		'openrouter',
		'groq',
		'xai',
		'mistral',
		'together',
	] as const;

	for (const providerName of compatibleProviders.filter(provider => provider !== 'anthropic')) {
		test(`${providerName} uses the shared OpenAI Chat adapter`, async () => {
			let request: CapturedRequest | undefined;
			const provider = createLlmProvider(configuration(providerName), captureRequest(
				{ choices: [{ message: { content: 'feat(ui): 增加生成命令' } }] },
				captured => { request = captured; },
			));

			const result = await provider.generate(prompt);

			assert.strictEqual(result, 'feat(ui): 增加生成命令');
			assert.strictEqual(request?.url, 'https://provider.example/chat/completions');
			assert.strictEqual(request?.options.headers.authorization, 'Bearer sensitive-key');
			assert.deepStrictEqual(JSON.parse(request?.options.body ?? '{}'), {
				model: 'test-model',
				messages: [
					{ role: 'system', content: 'system prompt' },
					{ role: 'user', content: 'user prompt' },
				],
			});
		});
	}

	test('Azure OpenAI uses the Chat adapter with api-key authentication', async () => {
		let request: CapturedRequest | undefined;
		const provider = createLlmProvider(configuration('azure-openai'), captureRequest(
			{ choices: [{ message: { content: 'fix(azure): 修复认证请求' } }] },
			captured => { request = captured; },
		));

		assert.strictEqual(await provider.generate(prompt), 'fix(azure): 修复认证请求');
		assert.strictEqual(request?.options.headers['api-key'], 'sensitive-key');
		assert.strictEqual(request?.options.headers.authorization, undefined);
	});

	for (const providerName of ['ollama', 'lm-studio'] as const) {
		test(`${providerName} omits optional authentication when the API key is empty`, async () => {
			let request: CapturedRequest | undefined;
			const provider = createLlmProvider(
				configuration(providerName, { apiKey: '' }),
				captureRequest(
					{ choices: [{ message: { content: 'feat(local): 增加本地模型' } }] },
					captured => { request = captured; },
				),
			);

			await provider.generate(prompt);

			assert.strictEqual(request?.options.headers.authorization, undefined);
		});

		test(`${providerName} sends optional Bearer authentication when configured`, async () => {
			let request: CapturedRequest | undefined;
			const provider = createLlmProvider(configuration(providerName), captureRequest(
				{ choices: [{ message: { content: 'feat(local): 增加本地认证' } }] },
				captured => { request = captured; },
			));

			await provider.generate(prompt);

			assert.strictEqual(request?.options.headers.authorization, 'Bearer sensitive-key');
		});
	}

	for (const providerName of ['anthropic', 'openai-compatible', 'gemini', 'azure-openai'] as const) {
		test(`${providerName} sanitizes HTTP failures`, async () => {
			const provider = createLlmProvider(configuration(providerName), async () => response({}, false, 401));
			await assertSanitizedRejection(provider.generate(prompt), /HTTP 401/);
		});

		test(`${providerName} sanitizes network failures`, async () => {
			const provider = createLlmProvider(configuration(providerName), async () => {
				throw new Error('request body, raw response and sensitive-key');
			});
			await assertSanitizedRejection(provider.generate(prompt), /request failed/);
		});

		test(`${providerName} rejects malformed JSON without exposing the response`, async () => {
			const provider = createLlmProvider(configuration(providerName), async () => ({
				ok: true,
				status: 200,
				json: async () => { throw new Error('raw response'); },
			}));
			await assertSanitizedRejection(provider.generate(prompt), /invalid JSON/);
		});

		test(`${providerName} rejects a missing text response`, async () => {
			const provider = createLlmProvider(configuration(providerName), async () => response({}));
			await assertSanitizedRejection(provider.generate(prompt), /unrecognized response/);
		});
	}
});

interface CapturedRequest {
	url: string;
	options: HttpRequestOptions;
}

function configuration(
	provider: ProviderName,
	overrides: Partial<AiCommitConfiguration> = {},
): AiCommitConfiguration {
	return {
		provider,
		baseUrl: 'https://provider.example///',
		apiKey: 'sensitive-key',
		model: 'test-model',
		commitLanguage: 'auto',
		...overrides,
	};
}

function captureRequest(body: unknown, capture: (request: CapturedRequest) => void): FetchClient {
	return async (url, options) => {
		capture({ url, options });
		return response(body);
	};
}

function response(body: unknown, ok = true, status = 200): HttpResponse {
	return {
		ok,
		status,
		json: async () => body,
	};
}

async function assertSanitizedRejection(result: Promise<string>, expected: RegExp): Promise<void> {
	await assert.rejects(
		result,
		(error: unknown) => error instanceof Error
			&& expected.test(error.message)
			&& !error.message.includes('sensitive-key')
			&& !error.message.includes('user prompt')
			&& !error.message.includes('raw response'),
	);
}
