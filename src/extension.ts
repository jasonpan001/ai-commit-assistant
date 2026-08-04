import * as vscode from 'vscode';
import { executeGenerateMessageCommand } from './command';
import { loadConfiguration } from './config';
import { readStagedDiff } from './git';
import { createLlmProvider } from './providers';
import { selectRepository } from './workspace';

export const GENERATE_MESSAGE_COMMAND = 'aiCommit.generateMessage';

export function activate(context: vscode.ExtensionContext): void {
	const disposable = vscode.commands.registerCommand(GENERATE_MESSAGE_COMMAND, () =>
		executeGenerateMessageCommand({
			resolveRepository: resolveVsCodeRepository,
			loadConfiguration: () => loadConfiguration(vscode.workspace.getConfiguration('aiCommit')),
			readStagedDiff,
			createProvider: createLlmProvider,
			getLocale: () => vscode.env.language,
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

function resolveVsCodeRepository(): string {
	const activeDocument = vscode.window.activeTextEditor?.document.uri;
	const activeWorkspace = activeDocument
		? vscode.workspace.getWorkspaceFolder(activeDocument)?.uri.fsPath
		: undefined;
	const workspaces = vscode.workspace.workspaceFolders?.map(folder => folder.uri.fsPath) ?? [];

	return selectRepository(activeWorkspace, workspaces);
}

export function deactivate(): void {}
