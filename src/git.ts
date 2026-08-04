import { execFile } from 'node:child_process';
import { UserFacingError } from './errors';
import { localize } from './localization';

export type GitDiffRunner = (repository: string) => Promise<string>;

const MAX_DIFF_BUFFER_BYTES = 10 * 1024 * 1024;
const GIT_DIFF_TIMEOUT_MS = 30_000;

export async function readStagedDiff(
	repository: string,
	runner: GitDiffRunner = executeCachedDiff,
): Promise<string> {
	let diff: string;
	try {
		diff = await runner(repository);
	} catch {
		throw new UserFacingError(localize('gitReadFailed'));
	}

	if (!diff.trim()) {
		throw new UserFacingError(localize('emptyStagedDiff'));
	}

	return diff;
}

function executeCachedDiff(repository: string): Promise<string> {
	return new Promise((resolve, reject) => {
		execFile(
			'git',
			['diff', '--cached', '--no-ext-diff'],
			{
				cwd: repository,
				encoding: 'utf8',
				maxBuffer: MAX_DIFF_BUFFER_BYTES,
				timeout: GIT_DIFF_TIMEOUT_MS,
			},
			(error, stdout) => {
				if (error) {
					reject(error);
					return;
				}

				resolve(stdout);
			},
		);
	});
}
