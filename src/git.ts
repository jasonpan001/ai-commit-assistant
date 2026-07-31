import { execFile } from 'node:child_process';
import { UserFacingError } from './errors';

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
		throw new UserFacingError('无法读取 Git 暂存区，请确认当前目录是有效仓库且 Git 可用。');
	}

	if (!diff.trim()) {
		throw new UserFacingError('暂存区没有变更，请先执行 Git stage。');
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
