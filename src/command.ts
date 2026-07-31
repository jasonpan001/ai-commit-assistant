import { AiCommitConfiguration } from './config';
import { buildCommitPrompt, normalizeCommitMessage } from './commitMessage';
import { getUserFacingMessage } from './errors';
import { LlmProvider } from './providers';

export interface GenerateCommandDependencies {
	resolveRepository(): string;
	loadConfiguration(): AiCommitConfiguration;
	readStagedDiff(repository: string): Promise<string>;
	createProvider(configuration: AiCommitConfiguration): LlmProvider;
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
		const rawMessage = await provider.generate(buildCommitPrompt(diff));
		const message = normalizeCommitMessage(rawMessage);

		await dependencies.writeClipboard(message);
		await dependencies.showInformation(`已生成并复制：${message}`);
	} catch (error) {
		await dependencies.showError(getUserFacingMessage(error));
	}
}
