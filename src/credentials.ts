import { ProviderName } from './providerCatalog';

const SECRET_KEY_PREFIX = 'aiCommit.apiKey.';

export interface SecretStorageAdapter {
	get(key: string): PromiseLike<string | undefined>;
	store(key: string, value: string): PromiseLike<void>;
	delete(key: string): PromiseLike<void>;
}

export interface CredentialStore {
	get(provider: ProviderName): Promise<string>;
	store(provider: ProviderName, apiKey: string): Promise<void>;
	delete(provider: ProviderName): Promise<void>;
}

export function createCredentialStore(
	secrets: SecretStorageAdapter,
): CredentialStore {
	return {
		async get(provider) {
			return (await secrets.get(secretKey(provider)))?.trim() ?? '';
		},
		async store(provider, apiKey) {
			await secrets.store(secretKey(provider), apiKey.trim());
		},
		async delete(provider) {
			await secrets.delete(secretKey(provider));
		},
	};
}

export function secretKey(provider: ProviderName): string {
	return `${SECRET_KEY_PREFIX}${provider}`;
}
