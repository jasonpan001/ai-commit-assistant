import * as assert from 'node:assert';
import {
	createCredentialStore,
	secretKey,
	SecretStorageAdapter,
} from '../credentials';

suite('Credential storage', () => {
	test('keeps API keys isolated by provider', async () => {
		const state = createState();
		const credentials = createCredentialStore(state.secrets);

		await credentials.store('openai', ' openai-key ');
		await credentials.store('anthropic', 'anthropic-key');

		assert.strictEqual(await credentials.get('openai'), 'openai-key');
		assert.strictEqual(await credentials.get('anthropic'), 'anthropic-key');
		assert.strictEqual(state.values.get(secretKey('openai')), 'openai-key');
		assert.strictEqual(state.values.get(secretKey('anthropic')), 'anthropic-key');
	});

	test('deletes only the selected provider key', async () => {
		const state = createState();
		state.values.set(secretKey('openai'), 'openai-key');
		state.values.set(secretKey('anthropic'), 'anthropic-key');
		const credentials = createCredentialStore(state.secrets);

		await credentials.delete('openai');

		assert.strictEqual(await state.secrets.get(secretKey('openai')), undefined);
		assert.strictEqual(await state.secrets.get(secretKey('anthropic')), 'anthropic-key');
	});
});

interface CredentialState {
	values: Map<string, string>;
	secrets: SecretStorageAdapter;
}

function createState(): CredentialState {
	const state = {
		values: new Map<string, string>(),
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
	return state;
}
