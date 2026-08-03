import * as assert from 'node:assert';
import { loadConfiguration, SettingsReader } from '../config';
import { ProviderName } from '../providerCatalog';

suite('Configuration', () => {
	const defaultBaseUrls: ReadonlyArray<[ProviderName, string]> = [
		['anthropic', 'https://api.anthropic.com'],
		['openai', 'https://api.openai.com/v1'],
		['openai-compatible', 'https://api.openai.com/v1'],
		['gemini', 'https://generativelanguage.googleapis.com/v1beta'],
		['deepseek', 'https://api.deepseek.com'],
		['openrouter', 'https://openrouter.ai/api/v1'],
		['groq', 'https://api.groq.com/openai/v1'],
		['xai', 'https://api.x.ai/v1'],
		['mistral', 'https://api.mistral.ai/v1'],
		['together', 'https://api.together.xyz/v1'],
		['ollama', 'http://localhost:11434/v1'],
		['lm-studio', 'http://localhost:1234/v1'],
	];

	for (const [provider, expectedBaseUrl] of defaultBaseUrls) {
		test(`uses the ${provider} default base URL`, () => {
			const configuration = loadConfiguration(settings({
				provider,
				apiKey: provider === 'ollama' || provider === 'lm-studio' ? '' : ' test-key ',
				model: ' test-model ',
			}));

			assert.strictEqual(configuration.baseUrl, expectedBaseUrl);
			assert.strictEqual(configuration.apiKey, provider === 'ollama' || provider === 'lm-studio' ? '' : 'test-key');
			assert.strictEqual(configuration.model, 'test-model');
		});
	}

	test('keeps openai-compatible as the default provider', () => {
		const configuration = loadConfiguration(settings({ apiKey: 'key', model: 'model' }));

		assert.strictEqual(configuration.provider, 'openai-compatible');
	});

	test('uses a trimmed custom base URL instead of the provider default', () => {
		const configuration = loadConfiguration(settings({
			provider: 'gemini',
			baseUrl: ' https://proxy.example/v1beta ',
			apiKey: 'key',
			model: 'model',
		}));

		assert.strictEqual(configuration.baseUrl, 'https://proxy.example/v1beta');
	});

	test('requires a resource base URL for Azure OpenAI', () => {
		assert.throws(
			() => loadConfiguration(settings({ provider: 'azure-openai', apiKey: 'key', model: 'deployment' })),
			/aiCommit\.baseUrl/,
		);
	});

	test('accepts an Azure OpenAI resource base URL', () => {
		const configuration = loadConfiguration(settings({
			provider: 'azure-openai',
			baseUrl: 'https://resource.openai.azure.com/openai/v1',
			apiKey: 'key',
			model: 'deployment',
		}));

		assert.strictEqual(configuration.baseUrl, 'https://resource.openai.azure.com/openai/v1');
	});

	test('allows local providers without an API key', () => {
		for (const provider of ['ollama', 'lm-studio'] as const) {
			assert.doesNotThrow(() => loadConfiguration(settings({ provider, model: 'local-model' })));
		}
	});

	test('rejects a cloud provider without an API key', () => {
		assert.throws(
			() => loadConfiguration(settings({ provider: 'gemini', model: 'gemini-model' })),
			/aiCommit\.apiKey/,
		);
	});

	test('rejects unsupported providers', () => {
		assert.throws(
			() => loadConfiguration(settings({ provider: 'unknown', apiKey: 'secret', model: 'model' })),
			/provider/,
		);
	});

	test('reports a missing model without exposing configured secrets', () => {
		assert.throws(
			() => loadConfiguration(settings({ provider: 'anthropic', apiKey: 'super-secret', model: '' })),
			(error: unknown) => error instanceof Error
				&& error.message.includes('aiCommit.model')
				&& !error.message.includes('super-secret'),
		);
	});
});

function settings(values: Record<string, unknown>): SettingsReader {
	return {
		get<T>(section: string): T | undefined {
			return values[section] as T | undefined;
		},
	};
}
