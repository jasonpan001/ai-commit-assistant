import * as assert from 'node:assert';
import { selectRepository } from '../workspace';

suite('Workspace selection', () => {
	test('prefers the active editor workspace', () => {
		assert.strictEqual(selectRepository('/repo/b', ['/repo/a', '/repo/b']), '/repo/b');
	});

	test('falls back to the only workspace', () => {
		assert.strictEqual(selectRepository(undefined, ['/repo/a']), '/repo/a');
	});

	test('rejects an empty workspace window', () => {
		assert.throws(() => selectRepository(undefined, []), /No workspace found/);
	});

	test('rejects ambiguous multi-root windows', () => {
		assert.throws(() => selectRepository(undefined, ['/repo/a', '/repo/b']), /Unable to determine the repository/);
	});
});
