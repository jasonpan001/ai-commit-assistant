import * as assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
	RUNTIME_MESSAGES,
	resolveCommitLanguage,
	SUPPORTED_COMMIT_LANGUAGES,
	SUPPORTED_LOCALES,
} from '../localization';

const projectRoot = resolve(__dirname, '../..');

suite('Localization', () => {
	test('keeps the StagedCraft AI brand aligned across locales and documentation', () => {
		for (const locale of ['default', ...localizedLocales()]) {
			const suffix = locale === 'default' ? '' : `.${locale}`;
			const messages = readJson(`package.nls${suffix}.json`);
			assert.strictEqual(messages['extension.displayName'], 'StagedCraft AI', locale);
			assert.strictEqual(messages['configuration.title'], 'StagedCraft AI', locale);
			assert.ok(messages['command.generateMessage.title'].startsWith('StagedCraft AI'), locale);
			assert.ok(messages['command.setApiKey.title'].startsWith('StagedCraft AI'), locale);
			assert.ok(messages['command.clearApiKey.title'].startsWith('StagedCraft AI'), locale);
		}

		for (const readme of ['README.md', 'README.zh-cn.md']) {
			const content = readFileSync(resolve(projectRoot, readme), 'utf8');
			assert.match(content, /^# StagedCraft AI$/m, readme);
			assert.match(content, /\[.*(?:Privacy Policy|隐私政策).*\]\(PRIVACY\.md\)/, readme);
		}
		assert.match(
			readFileSync(resolve(projectRoot, 'PRIVACY.md'), 'utf8'),
			/^# StagedCraft AI Privacy Policy$/m,
		);
	});

	test('maps VS Code locales to commit description languages', () => {
		const cases: ReadonlyArray<readonly [string, string]> = [
			['en', 'English'],
			['en-US', 'English'],
			['zh-cn', 'Simplified Chinese'],
			['zh-Hans', 'Simplified Chinese'],
			['zh-tw', 'Traditional Chinese'],
			['zh-Hant', 'Traditional Chinese'],
			['ja-JP', 'Japanese'],
			['ko', 'Korean'],
			['es-MX', 'Spanish'],
			['fr-FR', 'French'],
			['de-DE', 'German'],
			['pt_BR', 'Brazilian Portuguese'],
			['ru-RU', 'Russian'],
			['it-IT', 'English'],
		];

		for (const [locale, expected] of cases) {
			assert.strictEqual(resolveCommitLanguage(locale), expected, locale);
		}
	});

	test('uses an explicit commit language instead of the VS Code locale', () => {
		assert.strictEqual(resolveCommitLanguage('en', 'zh-cn'), 'Simplified Chinese');
		assert.strictEqual(resolveCommitLanguage('zh-cn', 'en'), 'English');
		assert.strictEqual(resolveCommitLanguage('fr', 'ja'), 'Japanese');
	});

	test('keeps manifest localization keys aligned', () => {
		const english = readJson('package.nls.json');
		const expectedKeys = Object.keys(english).sort();

		for (const locale of localizedLocales()) {
			assert.deepStrictEqual(
				Object.keys(readJson(`package.nls.${locale}.json`)).sort(),
				expectedKeys,
				locale,
			);
		}
	});

	test('keeps runtime localization keys and placeholders aligned', () => {
		const expectedKeys = Object.values(RUNTIME_MESSAGES).sort();

		for (const locale of localizedLocales()) {
			const translations = readJson(`l10n/bundle.l10n.${locale}.json`);
			assert.deepStrictEqual(Object.keys(translations).sort(), expectedKeys, locale);

			for (const source of expectedKeys) {
				assert.deepStrictEqual(placeholders(translations[source]), placeholders(source), `${locale}: ${source}`);
			}
		}
	});

	test('declares every package manifest localization placeholder', () => {
		const packageJson = readFileSync(resolve(projectRoot, 'package.json'), 'utf8');
		const manifestMessages = readJson('package.nls.json');
		const referencedKeys = [...packageJson.matchAll(/%([^%]+)%/g)].map(match => match[1]);

		assert.ok(referencedKeys.length > 0);
		for (const key of referencedKeys) {
			assert.ok(Object.hasOwn(manifestMessages, key), key);
		}
	});

	test('declares the complete commit language setting in the manifest', () => {
		const packageJson = JSON.parse(
			readFileSync(resolve(projectRoot, 'package.json'), 'utf8'),
		) as PackageManifest;
		const setting = packageJson.contributes.configuration.properties['aiCommit.commitLanguage'];

		assert.deepStrictEqual(setting.enum, [...SUPPORTED_COMMIT_LANGUAGES]);
		assert.strictEqual(setting.enumItemLabels.length, SUPPORTED_COMMIT_LANGUAGES.length);
		assert.ok(setting.enumItemLabels.every(label => /^%[^%]+%$/.test(label)));
		assert.strictEqual(setting.default, 'auto');
		assert.strictEqual(setting.scope, 'window');
	});

	test('orders and labels settings for the setup workflow', () => {
		const packageJson = JSON.parse(
			readFileSync(resolve(projectRoot, 'package.json'), 'utf8'),
		) as PackageManifest;
		const properties = packageJson.contributes.configuration.properties;
		const settingIds = [
			'aiCommit.provider',
			'aiCommit.baseUrl',
			'aiCommit.model',
			'aiCommit.commitLanguage',
		] as const;

		assert.deepStrictEqual(settingIds.map(id => properties[id].order), [10, 20, 30, 40]);
		assert.ok(settingIds.every(id => /^%[^%]+%$/.test(properties[id].title)));
		assert.strictEqual(properties['aiCommit.provider'].scope, 'machine');
		assert.strictEqual(properties['aiCommit.baseUrl'].scope, 'machine');
		assert.strictEqual(properties['aiCommit.model'].scope, 'machine');
		assert.strictEqual(properties['aiCommit.apiKey'], undefined);
	});

	test('contributes API key management commands', () => {
		const packageJson = JSON.parse(
			readFileSync(resolve(projectRoot, 'package.json'), 'utf8'),
		) as PackageManifest;
		const commands = packageJson.contributes.commands;
		const configuration = packageJson.contributes.configuration.properties;

		assert.ok(commands.some(command => command.command === 'aiCommit.setApiKey'));
		assert.ok(commands.some(command => command.command === 'aiCommit.clearApiKey'));
		assert.strictEqual(configuration['aiCommit.apiKey'], undefined);
	});

	test('contributes the generate command to the Git SCM title toolbar', () => {
		const packageJson = JSON.parse(
			readFileSync(resolve(projectRoot, 'package.json'), 'utf8'),
		) as PackageManifest;
		const menuItem = packageJson.contributes.menus['scm/title'][0];

		assert.strictEqual(menuItem.command, 'aiCommit.generateMessage');
		assert.strictEqual(menuItem.when, 'scmProvider == git');
		assert.match(menuItem.group, /^navigation/);
	});
});

interface PackageManifest {
	contributes: {
		commands: Array<{
			command: string;
			title: string;
		}>;
		menus: {
			'scm/title': Array<{
				command: string;
				when: string;
				group: string;
			}>;
		};
		configuration: {
			properties: Record<string, {
				title: string;
				order: number;
				scope: string;
			}> & {
				'aiCommit.commitLanguage': {
					title: string;
					order: number;
					enum: string[];
					enumItemLabels: string[];
					default: string;
					scope: string;
				};
			};
		};
	};
}

function localizedLocales(): string[] {
	return SUPPORTED_LOCALES.filter(locale => locale !== 'en');
}

function readJson(relativePath: string): Record<string, string> {
	return JSON.parse(readFileSync(resolve(projectRoot, relativePath), 'utf8')) as Record<string, string>;
}

function placeholders(value: string): string[] {
	return value.match(/\{\d+\}/g)?.sort() ?? [];
}
