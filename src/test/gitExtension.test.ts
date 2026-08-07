import * as assert from 'node:assert';
import * as vscode from 'vscode';
import { GitRepository, selectGitRepository } from '../gitExtension';

suite('VS Code Git repository selection', () => {
	test('prefers the repository selected in Source Control', () => {
		const selected = repository('/repo/b', true);

		assert.strictEqual(
			selectGitRepository([repository('/repo/a'), selected], '/repo/a'),
			selected,
		);
	});

	test('uses the active workspace when no repository is selected', () => {
		const active = repository('/repo/b');

		assert.strictEqual(
			selectGitRepository([repository('/repo/a'), active], '/repo/b'),
			active,
		);
	});

	test('falls back to the only Git repository', () => {
		const only = repository('/repo/a');

		assert.strictEqual(selectGitRepository([only]), only);
	});

	test('does not guess between ambiguous repositories', () => {
		assert.strictEqual(
			selectGitRepository([repository('/repo/a'), repository('/repo/b')]),
			undefined,
		);
	});
});

function repository(path: string, selected = false): GitRepository {
	return {
		rootUri: vscode.Uri.file(path),
		inputBox: { value: '' },
		ui: { selected },
	};
}
