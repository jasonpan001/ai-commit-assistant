import * as vscode from 'vscode';
import { executeGenerateMessageCommand } from './command';
import { loadConfiguration, readProvider } from './config';
import { createCredentialStore, CredentialStore } from './credentials';
import { readStagedDiff } from './git';
import { createGitInputClient } from './gitExtension';
import { localize } from './localization';
import { getProviderDefinition } from './providerCatalog';
import { createLlmProvider } from './providers';

export const GENERATE_MESSAGE_COMMAND = 'aiCommit.generateMessage';
export const SET_API_KEY_COMMAND = 'aiCommit.setApiKey';
export const CLEAR_API_KEY_COMMAND = 'aiCommit.clearApiKey';

export function activate(context: vscode.ExtensionContext): void {
	const gitInput = createGitInputClient();
	const credentials = createCredentialStore(context.secrets, {
		read: () => readLegacyApiKey(),
		clear: () => vscode.workspace.getConfiguration('aiCommit').update(
			'apiKey',
			undefined,
			vscode.ConfigurationTarget.Global,
		),
	});
	const generateMessage = vscode.commands.registerCommand(GENERATE_MESSAGE_COMMAND, () =>
		executeGenerateMessageCommand({
			resolveRepository: () => gitInput.resolveRepository(...getWorkspaceSelection()),
			loadConfiguration: async () => {
				const settings = vscode.workspace.getConfiguration('aiCommit');
				const provider = readProvider(settings);
				return loadConfiguration(settings, await credentials.get(provider));
			},
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
	const setApiKey = vscode.commands.registerCommand(SET_API_KEY_COMMAND, () =>
		executeSetApiKeyCommand(credentials),
	);
	const clearApiKey = vscode.commands.registerCommand(CLEAR_API_KEY_COMMAND, () =>
		executeClearApiKeyCommand(credentials),
	);

	context.subscriptions.push(generateMessage, setApiKey, clearApiKey);
}

async function executeSetApiKeyCommand(credentials: CredentialStore): Promise<void> {
	try {
		const provider = readProvider(vscode.workspace.getConfiguration('aiCommit'));
		const providerLabel = getProviderDefinition(provider).label;
		const apiKey = await vscode.window.showInputBox({
			prompt: localize('enterApiKey', providerLabel),
			password: true,
			ignoreFocusOut: true,
			validateInput: value => value.trim() ? undefined : localize('apiKeyEmpty'),
		});
		if (apiKey === undefined) {
			return;
		}

		await credentials.store(provider, apiKey);
		await vscode.window.showInformationMessage(localize('apiKeyStored', providerLabel));
	} catch {
		await vscode.window.showErrorMessage(localize('credentialOperationFailed'));
	}
}

async function executeClearApiKeyCommand(credentials: CredentialStore): Promise<void> {
	try {
		const provider = readProvider(vscode.workspace.getConfiguration('aiCommit'));
		const providerLabel = getProviderDefinition(provider).label;
		await credentials.delete(provider);
		await vscode.window.showInformationMessage(localize('apiKeyCleared', providerLabel));
	} catch {
		await vscode.window.showErrorMessage(localize('credentialOperationFailed'));
	}
}

function readLegacyApiKey(): string | undefined {
	const value = vscode.workspace.getConfiguration('aiCommit').inspect<unknown>('apiKey')?.globalValue;
	return typeof value === 'string' ? value : undefined;
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
