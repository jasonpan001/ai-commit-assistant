import * as assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = resolve(__dirname, '../..');

suite('Release workflow', () => {
	test('packages a tested VSIX from a matching version tag', () => {
		const workflow = readFileSync(
			resolve(projectRoot, '.github/workflows/release-vsix.yml'),
			'utf8',
		);

		assert.match(workflow, /tags:\s*\n\s*- 'v\*\.\*\.\*'/);
		assert.match(workflow, /contents: write/);
		assert.match(workflow, /uses: actions\/checkout@[0-9a-f]{40} # v\d+\.\d+\.\d+/);
		assert.match(workflow, /uses: actions\/setup-node@[0-9a-f]{40} # v\d+\.\d+\.\d+/);
		assert.match(workflow, /GITHUB_REF_NAME/);
		assert.match(workflow, /xvfb-run -a npm test/);
		assert.match(workflow, /npm exec -- vsce package/);
		assert.match(workflow, /gh release create/);
	});

	test('keeps release tooling out of the VSIX', () => {
		const vscodeIgnore = readFileSync(resolve(projectRoot, '.vscodeignore'), 'utf8');
		assert.match(vscodeIgnore, /^\.github\/\*\*$/m);
	});
});
