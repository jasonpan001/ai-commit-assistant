import * as vscode from 'vscode';
import { executeGenerateMessageCommand } from './command';
import { loadConfiguration } from './config';
import { readStagedDiff } from './git';
import { createGitInputClient } from './gitExtension';
import { localize } from './localization';
import { createLlmProvider } from './providers';

export const GENERATE_MESSAGE_COMMAND = 'aiCommit.generateMessage';

export function activate(context: vscode.ExtensionContext): void {
	const gitInput = createGitInputClient();
	const disposable = vscode.commands.registerCommand(GENERATE_MESSAGE_COMMAND, () =>
		executeGenerateMessageCommand({
			resolveRepository: () => gitInput.resolveRepository(...getWorkspaceSelection()),
			loadConfiguration: () => loadConfiguration(vscode.workspace.getConfiguration('aiCommit')),
			readStagedDiff,
			createProvider: createLlmProvider,
			getLocale: () => vscode.env.language,
			readCommitInput: repository => gitInput.read(repository),
			confirmCommitInputReplacement: confirmCommitInputReplacement,
			writeCommitInput: (repository, message) => gitInput.write(repository, message),
			writeClipboard: async message => vscode.env.clipboard.writeText(message),
			showInformation: async message => {
				await vscode.window.showInformationMessage(message);
			},
			showError: async message => {
				await vscode.window.showErrorMessage(message);
			},
		}),
	);

	context.subscriptions.push(disposable);
}

function getWorkspaceSelection(): [string | undefined, string[]] {
	const activeDocument = vscode.window.activeTextEditor?.document.uri;
	const activeWorkspace = activeDocument
		? vscode.workspace.getWorkspaceFolder(activeDocument)?.uri.fsPath
		: undefined;
	const workspaces = vscode.workspace.workspaceFolders?.map(folder => folder.uri.fsPath) ?? [];

	return [activeWorkspace, workspaces];
}

async function confirmCommitInputReplacement(): Promise<boolean> {
	const replace = localize('replaceCommitInput');
	return vscode.window.showWarningMessage(
		localize('commitInputNotEmpty'),
		{ modal: true },
		replace,
	).then(selection => selection === replace);
}

export function deactivate(): void {}
