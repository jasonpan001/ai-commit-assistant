import * as vscode from 'vscode';
import { UserFacingError } from './errors';
import { localize } from './localization';
import { selectRepository } from './workspace';

export interface GitRepository {
	readonly rootUri: vscode.Uri;
	readonly inputBox: { value: string };
	readonly ui: { readonly selected: boolean };
}

interface GitApi {
	readonly repositories: GitRepository[];
	getRepository(uri: vscode.Uri): GitRepository | null;
}

interface GitExtension {
	readonly enabled: boolean;
	getAPI(version: 1): GitApi;
}

export interface GitInputClient {
	resolveRepository(activeWorkspace: string | undefined, workspaces: readonly string[]): Promise<string>;
	read(repository: string): Promise<string>;
	write(repository: string, message: string): Promise<void>;
}

export function createGitInputClient(): GitInputClient {
	return {
		async resolveRepository(activeWorkspace, workspaces) {
			const api = await getGitApi();
			const selected = selectGitRepository(api.repositories, activeWorkspace);
			if (selected) {
				return selected.rootUri.fsPath;
			}

			const workspace = selectRepository(activeWorkspace, workspaces);
			const repository = api.getRepository(vscode.Uri.file(workspace));
			if (!repository) {
				throw new UserFacingError(localize('gitRepositoryNotFound'));
			}
			return repository.rootUri.fsPath;
		},
		async read(repository) {
			return getRepository(await getGitApi(), repository).inputBox.value;
		},
		async write(repository, message) {
			getRepository(await getGitApi(), repository).inputBox.value = message;
		},
	};
}

export function selectGitRepository(
	repositories: readonly GitRepository[],
	activeWorkspace?: string,
): GitRepository | undefined {
	const selectedRepositories = repositories.filter(repository => repository.ui.selected);
	if (selectedRepositories.length === 1) {
		return selectedRepositories[0];
	}

	if (activeWorkspace) {
		const activeRepository = repositories.find(repository => repository.rootUri.fsPath === activeWorkspace);
		if (activeRepository) {
			return activeRepository;
		}
	}

	return repositories.length === 1 ? repositories[0] : undefined;
}

async function getGitApi(): Promise<GitApi> {
	try {
		const extension = vscode.extensions.getExtension<GitExtension>('vscode.git');
		if (!extension) {
			throw new Error('Git extension not found');
		}
		const gitExtension = extension.isActive ? extension.exports : await extension.activate();
		if (!gitExtension.enabled) {
			throw new Error('Git extension disabled');
		}
		return gitExtension.getAPI(1);
	} catch {
		throw new UserFacingError(localize('gitIntegrationUnavailable'));
	}
}

function getRepository(api: GitApi, repositoryPath: string): GitRepository {
	const repository = api.getRepository(vscode.Uri.file(repositoryPath));
	if (!repository) {
		throw new UserFacingError(localize('gitRepositoryNotFound'));
	}
	return repository;
}
