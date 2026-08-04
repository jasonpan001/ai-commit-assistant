import { AiCommitConfiguration } from './config';
import { buildCommitPrompt, normalizeCommitMessage } from './commitMessage';
import { getUserFacingMessage } from './errors';
import { localize, resolveCommitLanguage } from './localization';
import { LlmProvider } from './providers';

export interface GenerateCommandDependencies {
	resolveRepository(): string;
	loadConfiguration(): AiCommitConfiguration;
	readStagedDiff(repository: string): Promise<string>;
	createProvider(configuration: AiCommitConfiguration): LlmProvider;
	getLocale(): string;
	writeClipboard(message: string): Promise<void>;
	showInformation(message: string): Promise<void>;
	showError(message: string): Promise<void>;
}

export async function executeGenerateMessageCommand(dependencies: GenerateCommandDependencies): Promise<void> {
	try {
		const repository = dependencies.resolveRepository();
		const configuration = dependencies.loadConfiguration();
		const diff = await dependencies.readStagedDiff(repository);
		const provider = dependencies.createProvider(configuration);
		const outputLanguage = resolveCommitLanguage(dependencies.getLocale());
		const rawMessage = await provider.generate(buildCommitPrompt(diff, outputLanguage));
		const message = normalizeCommitMessage(rawMessage);

		await dependencies.writeClipboard(message);
		await dependencies.showInformation(localize('generatedAndCopied', message));
	} catch (error) {
		await dependencies.showError(getUserFacingMessage(error));
	}
}
