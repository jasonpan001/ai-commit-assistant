import * as assert from 'node:assert';
import { readStagedDiff } from '../git';

suite('Staged Git diff', () => {
	test('returns a non-empty staged diff', async () => {
		let receivedRepository = '';
		const diff = await readStagedDiff('/repo', async repository => {
			receivedRepository = repository;
			return 'diff --git a/file b/file';
		});

		assert.strictEqual(receivedRepository, '/repo');
		assert.strictEqual(diff, 'diff --git a/file b/file');
	});

	test('rejects an empty staged diff', async () => {
		await assert.rejects(readStagedDiff('/repo', async () => '  \n'), /staging area has no changes/i);
	});

	test('sanitizes Git failures', async () => {
		await assert.rejects(
			readStagedDiff('/repo', async () => {
				throw new Error('sensitive local path');
			}),
			(error: unknown) => error instanceof Error
				&& error.message.includes('Unable to read the Git staging area')
				&& !error.message.includes('sensitive local path'),
		);
	});
});
