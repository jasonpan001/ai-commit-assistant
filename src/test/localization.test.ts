import * as assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { RUNTIME_MESSAGES, resolveCommitLanguage, SUPPORTED_LOCALES } from '../localization';

const projectRoot = resolve(__dirname, '../..');

suite('Localization', () => {
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
});

function localizedLocales(): string[] {
	return SUPPORTED_LOCALES.filter(locale => locale !== 'en');
}

function readJson(relativePath: string): Record<string, string> {
	return JSON.parse(readFileSync(resolve(projectRoot, relativePath), 'utf8')) as Record<string, string>;
}

function placeholders(value: string): string[] {
	return value.match(/\{\d+\}/g)?.sort() ?? [];
}
