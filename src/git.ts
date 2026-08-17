import { execFile } from 'node:child_process';
import { UserFacingError } from './errors';
import { localize } from './localization';

export type GitDiffRunner = (repository: string) => Promise<string>;

const MAX_DIFF_BUFFER_BYTES = 10 * 1024 * 1024;
const GIT_DIFF_TIMEOUT_MS = 30_000;
const BINARY_DIFF_PATTERN = /^(?:Binary files .* differ|GIT binary patch)$/m;
const SAFE_DIFF_OPTIONS = ['--no-ext-diff', '--no-textconv'];

export async function readGitDiff(
	repository: string,
	runner: GitDiffRunner = executeUncommittedDiff,
): Promise<string> {
	let diff: string;
	try {
		diff = await runner(repository);
	} catch {
		throw new UserFacingError(localize('gitReadFailed'));
	}

	if (!diff.trim()) {
		throw new UserFacingError(localize('emptyGitDiff'));
	}

	return diff;
}

async function executeUncommittedDiff(repository: string): Promise<string> {
	const trackedDiff = await readTrackedDiff(repository);
	const untrackedOutput = await executeGit(
		repository,
		['ls-files', '--others', '--exclude-standard', '-z'],
	);
	const untrackedFiles = untrackedOutput.split('\0').filter(Boolean);
	const parts: string[] = [];
	let totalBytes = 0;
	const appendDiff = (diff: string): void => {
		if (!diff.trim()) {
			return;
		}
		totalBytes += Buffer.byteLength(diff, 'utf8') + (parts.length > 0 ? 1 : 0);
		if (totalBytes > MAX_DIFF_BUFFER_BYTES) {
			throw new Error('Git diff exceeds the configured buffer limit.');
		}
		parts.push(diff);
	};
	appendDiff(removeBinaryDiffs(trackedDiff));

	for (const file of untrackedFiles) {
		const diff = await executeGit(
			repository,
			['diff', '--no-index', ...SAFE_DIFF_OPTIONS, '--', nullDevicePath(), file],
			true,
		);
		if (!BINARY_DIFF_PATTERN.test(diff)) {
			appendDiff(diff);
		}
	}

	return parts.join('\n');
}

async function readTrackedDiff(repository: string): Promise<string> {
	try {
		return await executeGit(repository, ['diff', ...SAFE_DIFF_OPTIONS, 'HEAD']);
	} catch {
		const staged = await executeGit(repository, ['diff', '--cached', ...SAFE_DIFF_OPTIONS]);
		const unstaged = await executeGit(repository, ['diff', ...SAFE_DIFF_OPTIONS]);
		return [staged, unstaged].filter(part => part.trim()).join('\n');
	}
}

function removeBinaryDiffs(diff: string): string {
	return diff
		.split(/(?=^diff --git )/m)
		.filter(part => !BINARY_DIFF_PATTERN.test(part))
		.join('');
}

function nullDevicePath(): string {
	return process.platform === 'win32' ? 'NUL' : '/dev/null';
}

function executeGit(
	repository: string,
	args: string[],
	allowDifferenceExit = false,
): Promise<string> {
	return new Promise((resolve, reject) => {
		execFile(
			'git',
			args,
			{
				cwd: repository,
				encoding: 'utf8',
				maxBuffer: MAX_DIFF_BUFFER_BYTES,
				timeout: GIT_DIFF_TIMEOUT_MS,
			},
			(error, stdout) => {
				if (error && !(allowDifferenceExit && error.code === 1)) {
					reject(error);
					return;
				}

				resolve(stdout);
			},
		);
	});
}
