import * as assert from 'node:assert';
import { loadConfiguration, SettingsReader } from '../config';

suite('Configuration', () => {
	test('uses the OpenAI-compatible default base URL', () => {
		const configuration = loadConfiguration(settings({
			provider: 'openai-compatible',
			apiKey: ' test-key ',
			model: ' test-model ',
		}));

		assert.deepStrictEqual(configuration, {
			provider: 'openai-compatible',
			baseUrl: 'https://api.openai.com/v1',
			apiKey: 'test-key',
			model: 'test-model',
		});
	});

	test('uses the Anthropic default base URL', () => {
		const configuration = loadConfiguration(settings({
			provider: 'anthropic',
			apiKey: 'key',
			model: 'claude-model',
		}));

		assert.strictEqual(configuration.baseUrl, 'https://api.anthropic.com');
	});

	test('rejects unsupported providers', () => {
		assert.throws(
			() => loadConfiguration(settings({ provider: 'unknown', apiKey: 'secret', model: 'model' })),
			/provider/,
		);
	});

	test('reports missing required settings without exposing values', () => {
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
