import * as assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PROVIDER_DEFINITIONS, SUPPORTED_PROVIDERS } from '../providerCatalog';

suite('Provider catalog', () => {
	test('contains unique provider identifiers', () => {
		assert.strictEqual(PROVIDER_DEFINITIONS.length, 13);
		assert.strictEqual(new Set(SUPPORTED_PROVIDERS).size, PROVIDER_DEFINITIONS.length);
	});

	test('matches the VS Code configuration manifest', () => {
		const packageJson = JSON.parse(
			readFileSync(resolve(__dirname, '../../package.json'), 'utf8'),
		) as PackageManifest;
		const providerConfiguration = packageJson.contributes.configuration.properties['aiCommit.provider'];

		assert.deepStrictEqual(providerConfiguration.enum, [...SUPPORTED_PROVIDERS]);
		assert.strictEqual(providerConfiguration.enumItemLabels.length, PROVIDER_DEFINITIONS.length);
		assert.ok(providerConfiguration.enumItemLabels.every(label => label.trim().length > 0));
		assert.strictEqual(providerConfiguration.enumDescriptions.length, PROVIDER_DEFINITIONS.length);
		assert.ok(providerConfiguration.enumDescriptions.every(description => /^%[^%]+%$/.test(description)));
		assert.strictEqual(providerConfiguration.default, 'openai-compatible');
	});
});

interface PackageManifest {
	contributes: {
		configuration: {
			properties: {
				'aiCommit.provider': {
					enum: string[];
					enumItemLabels: string[];
					enumDescriptions: string[];
					default: string;
				};
			};
		};
	};
}
