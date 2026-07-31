import { UserFacingError } from './errors';

export const SUPPORTED_PROVIDERS = ['anthropic', 'openai-compatible'] as const;

export type ProviderName = typeof SUPPORTED_PROVIDERS[number];

export interface AiCommitConfiguration {
	provider: ProviderName;
	baseUrl: string;
	apiKey: string;
	model: string;
}

export interface SettingsReader {
	get<T>(section: string): T | undefined;
}

const DEFAULT_BASE_URLS: Record<ProviderName, string> = {
	anthropic: 'https://api.anthropic.com',
	'openai-compatible': 'https://api.openai.com/v1',
};

export function loadConfiguration(settings: SettingsReader): AiCommitConfiguration {
	const providerValue = readString(settings, 'provider') || 'openai-compatible';
	if (!isProviderName(providerValue)) {
		throw new UserFacingError('配置 aiCommit.provider 不受支持，请选择 anthropic 或 openai-compatible。');
	}

	const apiKey = readString(settings, 'apiKey');
	if (!apiKey) {
		throw new UserFacingError('缺少配置 aiCommit.apiKey。');
	}

	const model = readString(settings, 'model');
	if (!model) {
		throw new UserFacingError('缺少配置 aiCommit.model。');
	}

	return {
		provider: providerValue,
		baseUrl: readString(settings, 'baseUrl') || DEFAULT_BASE_URLS[providerValue],
		apiKey,
		model,
	};
}

function readString(settings: SettingsReader, section: string): string {
	const value = settings.get<unknown>(section);
	return typeof value === 'string' ? value.trim() : '';
}

function isProviderName(value: string): value is ProviderName {
	return SUPPORTED_PROVIDERS.some(provider => provider === value);
}
