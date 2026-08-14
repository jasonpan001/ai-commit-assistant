import { ProviderName } from './providerCatalog';

const SECRET_KEY_PREFIX = 'aiCommit.apiKey.';

export interface SecretStorageAdapter {
	get(key: string): PromiseLike<string | undefined>;
	store(key: string, value: string): PromiseLike<void>;
	delete(key: string): PromiseLike<void>;
}

export interface LegacyApiKeySettings {
	read(): string | undefined;
	clear(): PromiseLike<void>;
}

export interface CredentialStore {
	get(provider: ProviderName): Promise<string>;
	store(provider: ProviderName, apiKey: string): Promise<void>;
	delete(provider: ProviderName): Promise<void>;
}

export function createCredentialStore(
	secrets: SecretStorageAdapter,
	legacySettings: LegacyApiKeySettings,
): CredentialStore {
	return {
		async get(provider) {
			const storedApiKey = (await secrets.get(secretKey(provider)))?.trim() ?? '';
			const legacyValue = legacySettings.read();
			const legacyApiKey = legacyValue?.trim() ?? '';

			if (storedApiKey) {
				if (legacyValue !== undefined) {
					await legacySettings.clear();
				}
				return storedApiKey;
			}

			if (!legacyApiKey) {
				if (legacyValue !== undefined) {
					await legacySettings.clear();
				}
				return '';
			}

			await secrets.store(secretKey(provider), legacyApiKey);
			await legacySettings.clear();
			return legacyApiKey;
		},
		async store(provider, apiKey) {
			await secrets.store(secretKey(provider), apiKey.trim());
			if (legacySettings.read() !== undefined) {
				await legacySettings.clear();
			}
		},
		async delete(provider) {
			await secrets.delete(secretKey(provider));
			if (legacySettings.read() !== undefined) {
				await legacySettings.clear();
			}
		},
	};
}

export function secretKey(provider: ProviderName): string {
	return `${SECRET_KEY_PREFIX}${provider}`;
}
