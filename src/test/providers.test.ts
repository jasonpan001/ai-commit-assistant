import * as assert from 'node:assert';
import { AiCommitConfiguration, ProviderName } from '../config';
import { CommitPrompt } from '../commitMessage';
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

	test('creates an Anthropic Messages request and extracts text', async () => {
		let request: CapturedRequest | undefined;
		const provider = createLlmProvider(configuration('anthropic'), captureRequest(
			{ content: [{ type: 'text', text: 'fix(api): 修复请求错误' }] },
			captured => { request = captured; },
		));

		const result = await provider.generate(prompt);

		assert.strictEqual(result, 'fix(api): 修复请求错误');
		assert.strictEqual(request?.url, 'https://provider.example/v1/messages');
		assert.strictEqual(request?.options.headers['x-api-key'], 'sensitive-key');
		assert.strictEqual(request?.options.headers['anthropic-version'], '2023-06-01');
		assert.ok(request?.options.signal);
		assert.deepStrictEqual(JSON.parse(request?.options.body ?? '{}'), {
			model: 'test-model',
			max_tokens: 128,
			system: 'system prompt',
			messages: [{ role: 'user', content: 'user prompt' }],
		});
	});

	test('creates an OpenAI-compatible request and extracts assistant text', async () => {
		let request: CapturedRequest | undefined;
		const provider = createLlmProvider(configuration('openai-compatible'), captureRequest(
			{ choices: [{ message: { content: 'feat(ui): 增加生成命令' } }] },
			captured => { request = captured; },
		));

		const result = await provider.generate(prompt);

		assert.strictEqual(result, 'feat(ui): 增加生成命令');
		assert.strictEqual(request?.url, 'https://provider.example/chat/completions');
		assert.strictEqual(request?.options.headers.authorization, 'Bearer sensitive-key');
		assert.ok(request?.options.signal);
		assert.deepStrictEqual(JSON.parse(request?.options.body ?? '{}'), {
			model: 'test-model',
			messages: [
				{ role: 'system', content: 'system prompt' },
				{ role: 'user', content: 'user prompt' },
			],
		});
	});

	for (const providerName of ['anthropic', 'openai-compatible'] as const) {
		test(`${providerName} sanitizes HTTP failures`, async () => {
			const provider = createLlmProvider(configuration(providerName), async () => response({}, false, 401));
			await assertSanitizedRejection(provider.generate(prompt), /HTTP 401/);
		});

		test(`${providerName} sanitizes network failures`, async () => {
			const provider = createLlmProvider(configuration(providerName), async () => {
				throw new Error('request body and sensitive-key');
			});
			await assertSanitizedRejection(provider.generate(prompt), /请求失败/);
		});

		test(`${providerName} rejects malformed JSON`, async () => {
			const provider = createLlmProvider(configuration(providerName), async () => ({
				ok: true,
				status: 200,
				json: async () => { throw new Error('raw response'); },
			}));
			await assertSanitizedRejection(provider.generate(prompt), /无效的 JSON/);
		});

		test(`${providerName} rejects a missing text response`, async () => {
			const provider = createLlmProvider(configuration(providerName), async () => response({}));
			await assertSanitizedRejection(provider.generate(prompt), /无法识别的响应/);
		});
	}
});

interface CapturedRequest {
	url: string;
	options: HttpRequestOptions;
}

function configuration(provider: ProviderName): AiCommitConfiguration {
	return {
		provider,
		baseUrl: 'https://provider.example///',
		apiKey: 'sensitive-key',
		model: 'test-model',
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
			&& !error.message.includes('user prompt'),
	);
}
