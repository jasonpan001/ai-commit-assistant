import { UserFacingError } from './errors';
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
		throw new UserFacingError(`配置 aiCommit.provider 不受支持，请选择：${SUPPORTED_PROVIDERS.join('、')}。`);
	}
	const provider = getProviderDefinition(providerValue);

	const apiKey = readString(settings, 'apiKey');
	if (provider.requiresApiKey && !apiKey) {
		throw new UserFacingError('缺少配置 aiCommit.apiKey。');
	}

	const model = readString(settings, 'model');
	if (!model) {
		throw new UserFacingError('缺少配置 aiCommit.model。');
	}
	const baseUrl = readString(settings, 'baseUrl') || provider.defaultBaseUrl;
	if (!baseUrl) {
		throw new UserFacingError(`Provider ${provider.label} 缺少配置 aiCommit.baseUrl。`);
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
