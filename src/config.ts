import { MissingApiKeyError, UserFacingError } from './errors';
import {
	CommitLanguagePreference,
	isCommitLanguagePreference,
	localize,
} from './localization';
import {
	getProviderDefinition,
	isProviderName,
	ProviderName,
	SUPPORTED_PROVIDERS,
} from './providerCatalog';

export { ProviderName, SUPPORTED_PROVIDERS } from './providerCatalog';

export interface AiCommitConfiguration {
	provider: ProviderName;
	baseUrl: string;
	apiKey: string;
	model: string;
	commitLanguage: CommitLanguagePreference;
}

export interface SettingsReader {
	get<T>(section: string): T | undefined;
}

export function readProvider(settings: SettingsReader): ProviderName {
	const providerValue = readString(settings, 'provider') || 'openai-compatible';
	if (!isProviderName(providerValue)) {
		throw new UserFacingError(localize('unsupportedProvider', SUPPORTED_PROVIDERS.join(', ')));
	}
	return providerValue;
}

export function loadConfiguration(settings: SettingsReader, apiKey = ''): AiCommitConfiguration {
	const providerValue = readProvider(settings);
	const provider = getProviderDefinition(providerValue);

	const normalizedApiKey = apiKey.trim();
	if (provider.requiresApiKey && !normalizedApiKey) {
		throw new MissingApiKeyError(localize('missingApiKey', provider.label));
	}

	const model = readString(settings, 'model');
	if (!model) {
		throw new UserFacingError(localize('missingModel'));
	}
	const baseUrl = readString(settings, 'baseUrl') || provider.defaultBaseUrl;
	if (!baseUrl) {
		throw new UserFacingError(localize('missingBaseUrl', provider.label));
	}

	return {
		provider: providerValue,
		baseUrl,
		apiKey: normalizedApiKey,
		model,
		commitLanguage: readCommitLanguage(settings),
	};
}

function readCommitLanguage(settings: SettingsReader): CommitLanguagePreference {
	const value = readString(settings, 'commitLanguage');
	return isCommitLanguagePreference(value) ? value : 'auto';
}

function readString(settings: SettingsReader, section: string): string {
	const value = settings.get<unknown>(section);
	return typeof value === 'string' ? value.trim() : '';
}
