import { AiCommitConfiguration } from './config';
import { buildCommitPrompt, normalizeCommitMessage } from './commitMessage';
import { getUserFacingMessage } from './errors';
import { localize, resolveCommitLanguage } from './localization';
import { LlmProvider } from './providers';

export interface GenerateCommandDependencies {
	resolveRepository(): string | Promise<string>;
	loadConfiguration(): AiCommitConfiguration;
	readStagedDiff(repository: string): Promise<string>;
	createProvider(configuration: AiCommitConfiguration): LlmProvider;
	getLocale(): string;
	readCommitInput(repository: string): Promise<string>;
	confirmCommitInputReplacement(): Promise<boolean>;
	writeCommitInput(repository: string, message: string): Promise<void>;
	writeClipboard(message: string): Promise<void>;
	showInformation(message: string): Promise<void>;
	showError(message: string): Promise<void>;
}

export async function executeGenerateMessageCommand(dependencies: GenerateCommandDependencies): Promise<void> {
	try {
		const repository = await dependencies.resolveRepository();
		const existingMessage = await dependencies.readCommitInput(repository);
		if (existingMessage.trim() && !await dependencies.confirmCommitInputReplacement()) {
			return;
		}
		const configuration = dependencies.loadConfiguration();
		const diff = await dependencies.readStagedDiff(repository);
		const provider = dependencies.createProvider(configuration);
		const outputLanguage = resolveCommitLanguage(
			dependencies.getLocale(),
			configuration.commitLanguage,
		);
		const rawMessage = await provider.generate(buildCommitPrompt(diff, outputLanguage));
		const message = normalizeCommitMessage(rawMessage);
		const latestMessage = await dependencies.readCommitInput(repository);
		if (latestMessage !== existingMessage
			&& latestMessage.trim()
			&& !await dependencies.confirmCommitInputReplacement()) {
			return;
		}

		await dependencies.writeCommitInput(repository, message);
		await dependencies.writeClipboard(message);
		await dependencies.showInformation(localize('generatedAndInserted', message));
	} catch (error) {
		await dependencies.showError(getUserFacingMessage(error));
	}
}
