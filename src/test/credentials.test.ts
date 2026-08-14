import * as assert from 'node:assert';
import * as vscode from 'vscode';
import {
	createCredentialStore,
	LegacyApiKeySettings,
	secretKey,
	SecretStorageAdapter,
} from '../credentials';

suite('Credential storage', () => {
	test('keeps API keys isolated by provider', async () => {
		const state = createState();
		const credentials = createCredentialStore(state.secrets, state.legacySettings);

		await credentials.store('openai', ' openai-key ');
		await credentials.store('anthropic', 'anthropic-key');

		assert.strictEqual(await credentials.get('openai'), 'openai-key');
		assert.strictEqual(await credentials.get('anthropic'), 'anthropic-key');
		assert.strictEqual(state.values.get(secretKey('openai')), 'openai-key');
		assert.strictEqual(state.values.get(secretKey('anthropic')), 'anthropic-key');
	});

	test('migrates and removes a legacy plaintext API key', async () => {
		const state = createState(' legacy-key ');
		const credentials = createCredentialStore(state.secrets, state.legacySettings);

		assert.strictEqual(await credentials.get('gemini'), 'legacy-key');
		assert.strictEqual(state.values.get(secretKey('gemini')), 'legacy-key');
		assert.strictEqual(state.legacyApiKey, undefined);
		assert.strictEqual(state.clearCalls, 1);
	});

	test('prefers SecretStorage and removes a redundant legacy key', async () => {
		const state = createState('outdated-key');
		state.values.set(secretKey('openai'), 'stored-key');
		const credentials = createCredentialStore(state.secrets, state.legacySettings);

		assert.strictEqual(await credentials.get('openai'), 'stored-key');
		assert.strictEqual(state.legacyApiKey, undefined);
		assert.strictEqual(state.clearCalls, 1);
	});

	test('removes an empty legacy setting without creating a secret', async () => {
		const state = createState('   ');
		const credentials = createCredentialStore(state.secrets, state.legacySettings);

		assert.strictEqual(await credentials.get('openai'), '');
		assert.strictEqual(state.values.has(secretKey('openai')), false);
		assert.strictEqual(state.legacyApiKey, undefined);
		assert.strictEqual(state.clearCalls, 1);
	});

	test('deletes only the selected provider key', async () => {
		const state = createState('legacy-key');
		state.values.set(secretKey('openai'), 'openai-key');
		state.values.set(secretKey('anthropic'), 'anthropic-key');
		const credentials = createCredentialStore(state.secrets, state.legacySettings);

		await credentials.delete('openai');

		assert.strictEqual(await state.secrets.get(secretKey('openai')), undefined);
		assert.strictEqual(await state.secrets.get(secretKey('anthropic')), 'anthropic-key');
		assert.strictEqual(state.legacyApiKey, undefined);
	});

	test('can remove the deprecated legacy setting after migration', async () => {
		const configuration = vscode.workspace.getConfiguration('aiCommit');
		try {
			await configuration.update('apiKey', 'legacy-key', vscode.ConfigurationTarget.Global);
			assert.strictEqual(
				vscode.workspace.getConfiguration('aiCommit').inspect('apiKey')?.globalValue,
				'legacy-key',
			);

			await configuration.update('apiKey', undefined, vscode.ConfigurationTarget.Global);
			assert.strictEqual(
				vscode.workspace.getConfiguration('aiCommit').inspect('apiKey')?.globalValue,
				undefined,
			);
		} finally {
			await configuration.update('apiKey', undefined, vscode.ConfigurationTarget.Global);
		}
	});
});

interface CredentialState {
	values: Map<string, string>;
	legacyApiKey: string | undefined;
	clearCalls: number;
	secrets: SecretStorageAdapter;
	legacySettings: LegacyApiKeySettings;
}

function createState(legacyApiKey?: string): CredentialState {
	const state = {
		values: new Map<string, string>(),
		legacyApiKey,
		clearCalls: 0,
	} as CredentialState;
	state.secrets = {
		get: async key => state.values.get(key),
		store: async (key, value) => {
			state.values.set(key, value);
		},
		delete: async key => {
			state.values.delete(key);
		},
	};
	state.legacySettings = {
		read: () => state.legacyApiKey,
		clear: async () => {
			state.legacyApiKey = undefined;
			state.clearCalls += 1;
		},
	};
	return state;
}
