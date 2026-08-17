import * as assert from 'node:assert';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readGitDiff } from '../git';

suite('Git changes diff', () => {
	test('returns a non-empty Git diff', async () => {
		let receivedRepository = '';
		const diff = await readGitDiff('/repo', async repository => {
			receivedRepository = repository;
			return 'diff --git a/file b/file';
		});

		assert.strictEqual(receivedRepository, '/repo');
		assert.strictEqual(diff, 'diff --git a/file b/file');
	});

	test('collects staged, unstaged, and untracked text changes', async () => {
		const repository = createRepository();
		try {
			writeFileSync(join(repository, 'tracked.txt'), 'staged change\n');
			git(repository, 'add', 'tracked.txt');
			writeFileSync(join(repository, 'tracked.txt'), 'staged and unstaged change\n');
			writeFileSync(join(repository, 'untracked.txt'), 'new text file\n');
			writeFileSync(join(repository, 'ignored.txt'), 'ignored content\n');
			writeFileSync(join(repository, 'binary.dat'), Buffer.from([0, 1, 2, 3]));

			const diff = await readGitDiff(repository);

			assert.match(diff, /staged and unstaged change/);
			assert.match(diff, /untracked\.txt/);
			assert.match(diff, /new text file/);
			assert.doesNotMatch(diff, /ignored\.txt|ignored content/);
			assert.doesNotMatch(diff, /binary\.dat/);
		} finally {
			rmSync(repository, { recursive: true, force: true });
		}
	});

	test('collects changes from a repository without commits', async () => {
		const repository = mkdtempSync(join(tmpdir(), 'stagedcraft-empty-git-test-'));
		try {
			git(repository, 'init');
			writeFileSync(join(repository, 'staged.txt'), 'staged in empty repository\n');
			git(repository, 'add', 'staged.txt');
			writeFileSync(join(repository, 'untracked.txt'), 'untracked in empty repository\n');

			const diff = await readGitDiff(repository);

			assert.match(diff, /staged in empty repository/);
			assert.match(diff, /untracked in empty repository/);
		} finally {
			rmSync(repository, { recursive: true, force: true });
		}
	});

	test('rejects an empty Git diff', async () => {
		await assert.rejects(readGitDiff('/repo', async () => '  \n'), /no staged, unstaged, or untracked text changes/i);
	});

	test('sanitizes Git failures', async () => {
		await assert.rejects(
			readGitDiff('/repo', async () => {
				throw new Error('sensitive local path');
			}),
			(error: unknown) => error instanceof Error
				&& error.message.includes('Unable to read Git changes')
				&& !error.message.includes('sensitive local path'),
		);
	});
});

function createRepository(): string {
	const repository = mkdtempSync(join(tmpdir(), 'stagedcraft-git-test-'));
	git(repository, 'init');
	git(repository, 'config', 'user.email', 'test@example.com');
	git(repository, 'config', 'user.name', 'StagedCraft Test');
	writeFileSync(join(repository, '.gitignore'), 'ignored.txt\n');
	writeFileSync(join(repository, 'tracked.txt'), 'initial content\n');
	git(repository, 'add', '.gitignore', 'tracked.txt');
	git(repository, 'commit', '-m', 'test: initialize repository');
	return repository;
}

function git(repository: string, ...args: string[]): void {
	execFileSync('git', args, { cwd: repository, stdio: 'ignore' });
}
