import * as vscode from 'vscode';

export const RUNTIME_MESSAGES = {
	generatedAndCopied: 'Generated and copied: {0}',
	generationFailed: 'Failed to generate a commit message. Check the configuration and network, then try again.',
	invalidCommitMessage: 'The LLM returned an invalid commit message format. Try again.',
	gitReadFailed: 'Unable to read the Git staging area. Confirm that the current directory is a valid repository and Git is available.',
	emptyStagedDiff: 'The staging area has no changes. Stage changes first.',
	noWorkspace: 'No workspace found. Open a Git repository first.',
	ambiguousWorkspace: 'Unable to determine the repository. Focus a file in the target workspace and try again.',
	unsupportedProvider: 'Unsupported aiCommit.provider. Choose one of: {0}.',
	missingApiKey: 'Missing aiCommit.apiKey configuration.',
	missingModel: 'Missing aiCommit.model configuration.',
	missingBaseUrl: 'Provider {0} requires aiCommit.baseUrl.',
	unrecognizedProviderResponse: '{0} returned an unrecognized response.',
	providerRequestFailed: '{0} request failed. Check the network and aiCommit.baseUrl.',
	providerHttpFailed: '{0} request failed (HTTP {1}).',
	providerInvalidJson: '{0} returned invalid JSON.',
} as const;

export type RuntimeMessageKey = keyof typeof RUNTIME_MESSAGES;

export const SUPPORTED_LOCALES = [
	'en',
	'zh-cn',
	'zh-tw',
	'ja',
	'ko',
	'es',
	'fr',
	'de',
	'pt-br',
	'ru',
] as const;

export type SupportedLocale = typeof SUPPORTED_LOCALES[number];

export const SUPPORTED_COMMIT_LANGUAGES = ['auto', ...SUPPORTED_LOCALES] as const;

export type CommitLanguagePreference = typeof SUPPORTED_COMMIT_LANGUAGES[number];

const COMMIT_LANGUAGES: Record<SupportedLocale, string> = {
	en: 'English',
	'zh-cn': 'Simplified Chinese',
	'zh-tw': 'Traditional Chinese',
	ja: 'Japanese',
	ko: 'Korean',
	es: 'Spanish',
	fr: 'French',
	de: 'German',
	'pt-br': 'Brazilian Portuguese',
	ru: 'Russian',
};

export function localize(
	key: RuntimeMessageKey,
	...args: Array<string | number | boolean>
): string {
	return vscode.l10n.t(RUNTIME_MESSAGES[key], ...args);
}

export function isCommitLanguagePreference(value: unknown): value is CommitLanguagePreference {
	return typeof value === 'string'
		&& (SUPPORTED_COMMIT_LANGUAGES as readonly string[]).includes(value);
}

export function resolveCommitLanguage(
	locale: string,
	preference: CommitLanguagePreference = 'auto',
): string {
	if (preference !== 'auto') {
		return COMMIT_LANGUAGES[preference];
	}

	const normalized = locale.trim().toLowerCase().replace(/_/g, '-');
	if (normalized === 'zh-cn' || normalized.startsWith('zh-hans')) {
		return COMMIT_LANGUAGES['zh-cn'];
	}
	if (normalized === 'zh-tw' || normalized.startsWith('zh-hant')) {
		return COMMIT_LANGUAGES['zh-tw'];
	}
	if (normalized === 'pt-br') {
		return COMMIT_LANGUAGES['pt-br'];
	}

	for (const localePrefix of ['en', 'ja', 'ko', 'es', 'fr', 'de', 'ru'] as const) {
		if (normalized === localePrefix || normalized.startsWith(`${localePrefix}-`)) {
			return COMMIT_LANGUAGES[localePrefix];
		}
	}

	return COMMIT_LANGUAGES.en;
}
