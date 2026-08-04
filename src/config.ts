import { UserFacingError } from './errors';
import { localize } from './localization';
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
}

export interface SettingsReader {
	get<T>(section: string): T | undefined;
}

export function loadConfiguration(settings: SettingsReader): AiCommitConfiguration {
	const providerValue = readString(settings, 'provider') || 'openai-compatible';
	if (!isProviderName(providerValue)) {
		throw new UserFacingError(localize('unsupportedProvider', SUPPORTED_PROVIDERS.join(', ')));
	}
	const provider = getProviderDefinition(providerValue);

	const apiKey = readString(settings, 'apiKey');
	if (provider.requiresApiKey && !apiKey) {
		throw new UserFacingError(localize('missingApiKey'));
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
		apiKey,
		model,
	};
}

function readString(settings: SettingsReader, section: string): string {
	const value = settings.get<unknown>(section);
	return typeof value === 'string' ? value.trim() : '';
}
