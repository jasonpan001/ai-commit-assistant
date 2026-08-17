import { AiCommitConfiguration } from './config';
import { buildCommitPrompt, normalizeCommitMessage } from './commitMessage';
import { getUserFacingMessage, MissingApiKeyError } from './errors';
import { resolveCommitLanguage } from './localization';
import { LlmProvider } from './providers';

export interface GenerateCommandDependencies {
	resolveRepository(): string | Promise<string>;
	loadConfiguration(): AiCommitConfiguration | Promise<AiCommitConfiguration>;
	readGitDiff(repository: string): Promise<string>;
	createProvider(configuration: AiCommitConfiguration): LlmProvider;
	getLocale(): string;
	readCommitInput(repository: string): Promise<string>;
	writeCommitInput(repository: string, message: string): Promise<void>;
	writeClipboard(message: string): Promise<void>;
	showError(message: string): Promise<void>;
	showMissingApiKey(message: string): Promise<void>;
}

export async function executeGenerateMessageCommand(dependencies: GenerateCommandDependencies): Promise<void> {
	try {
		const repository = await dependencies.resolveRepository();
		const existingMessage = await dependencies.readCommitInput(repository);
		const configuration = await dependencies.loadConfiguration();
		const diff = await dependencies.readGitDiff(repository);
		const provider = dependencies.createProvider(configuration);
		const outputLanguage = resolveCommitLanguage(
			dependencies.getLocale(),
			configuration.commitLanguage,
		);
		const rawMessage = await provider.generate(buildCommitPrompt(diff, outputLanguage));
		const message = normalizeCommitMessage(rawMessage);
		const latestMessage = await dependencies.readCommitInput(repository);
		if (latestMessage !== existingMessage) {
			return;
		}

		await dependencies.writeCommitInput(repository, message);
		await dependencies.writeClipboard(message);
	} catch (error) {
		if (error instanceof MissingApiKeyError) {
			await dependencies.showMissingApiKey(error.message);
			return;
		}
		await dependencies.showError(getUserFacingMessage(error));
	}
}
