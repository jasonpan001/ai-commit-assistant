import * as assert from 'node:assert';
import { executeGenerateMessageCommand, GenerateCommandDependencies } from '../command';
import { AiCommitConfiguration } from '../config';
import { MissingApiKeyError, UserFacingError } from '../errors';

const configuration: AiCommitConfiguration = {
	provider: 'openai-compatible',
	baseUrl: 'https://provider.example/v1',
	apiKey: 'key',
	model: 'model',
	commitLanguage: 'zh-cn',
};

suite('Generate command workflow', () => {
	test('writes and copies a valid generated message without a success notification', async () => {
		const state = createState();
		await executeGenerateMessageCommand(dependencies(state));

		assert.deepStrictEqual(state.clipboardWrites, ['fix(core): 修复暂存区生成逻辑']);
		assert.deepStrictEqual(state.commitInputWrites, [{ repository: '/repo', message: 'fix(core): 修复暂存区生成逻辑' }]);
		assert.deepStrictEqual(state.errorMessages, []);
		assert.strictEqual(state.repositoryRead, '/repo');
		assert.strictEqual(state.providerCalls, 1);
		assert.match(state.promptSystem ?? '', /Simplified Chinese/);
	});

	test('replaces an existing message without confirmation', async () => {
		const state = createState();
		state.existingCommitInput = 'hand-written message';

		await executeGenerateMessageCommand(dependencies(state));

		assert.strictEqual(state.providerCalls, 1);
		assert.strictEqual(state.commitInputWrites.length, 1);
	});

	test('does not overwrite text entered while the provider request is running', async () => {
		const state = createState();
		state.commitInputDuringGeneration = 'typed while waiting';

		await executeGenerateMessageCommand(dependencies(state));

		assert.strictEqual(state.providerCalls, 1);
		assert.deepStrictEqual(state.commitInputWrites, []);
		assert.deepStrictEqual(state.clipboardWrites, []);
	});

	for (const failure of [
		{ name: 'empty Git diff', message: '仓库没有已暂存、未暂存或未跟踪的文本变更。' },
		{ name: 'Git failure', message: '无法读取 Git 变更，请确认当前目录是有效仓库且 Git 可用。' },
	]) {
		test(`keeps the clipboard unchanged on ${failure.name}`, async () => {
			const state = createState();
			const commandDependencies = dependencies(state);
			commandDependencies.readGitDiff = async () => {
				throw new UserFacingError(failure.message);
			};

			await executeGenerateMessageCommand(commandDependencies);

			assert.deepStrictEqual(state.clipboardWrites, []);
			assert.deepStrictEqual(state.errorMessages, [failure.message]);
			assert.strictEqual(state.providerCalls, 0);
		});
	}

	test('keeps the clipboard unchanged on invalid provider output', async () => {
		const state = createState();
		const commandDependencies = dependencies(state);
		commandDependencies.createProvider = () => ({ generate: async () => 'invalid output' });

		await executeGenerateMessageCommand(commandDependencies);

		assert.deepStrictEqual(state.clipboardWrites, []);
		assert.match(state.errorMessages[0], /invalid commit message format/);
	});

	test('reports repository resolution failures before reading Git', async () => {
		const state = createState();
		const commandDependencies = dependencies(state);
		commandDependencies.resolveRepository = () => {
			throw new UserFacingError('无法确定仓库。');
		};

		await executeGenerateMessageCommand(commandDependencies);

		assert.strictEqual(state.repositoryRead, undefined);
		assert.deepStrictEqual(state.clipboardWrites, []);
		assert.deepStrictEqual(state.errorMessages, ['无法确定仓库。']);
	});

	test('offers the API key setup action when a required key is missing', async () => {
		const state = createState();
		const commandDependencies = dependencies(state);
		commandDependencies.loadConfiguration = () => {
			throw new MissingApiKeyError('No API key is stored for OpenAI.');
		};

		await executeGenerateMessageCommand(commandDependencies);

		assert.deepStrictEqual(state.missingApiKeyMessages, ['No API key is stored for OpenAI.']);
		assert.deepStrictEqual(state.errorMessages, []);
		assert.strictEqual(state.providerCalls, 0);
	});
});

interface CommandState {
	clipboardWrites: string[];
	errorMessages: string[];
	missingApiKeyMessages: string[];
	repositoryRead: string | undefined;
	providerCalls: number;
	promptSystem: string | undefined;
	existingCommitInput: string;
	commitInputWrites: Array<{ repository: string; message: string }>;
	commitInputDuringGeneration: string | undefined;
}

function createState(): CommandState {
	return {
		clipboardWrites: [],
		errorMessages: [],
		missingApiKeyMessages: [],
		repositoryRead: undefined,
		providerCalls: 0,
		promptSystem: undefined,
		existingCommitInput: '',
		commitInputWrites: [],
		commitInputDuringGeneration: undefined,
	};
}

function dependencies(state: CommandState): GenerateCommandDependencies {
	return {
		resolveRepository: () => '/repo',
		loadConfiguration: () => configuration,
		getLocale: () => 'en',
		readCommitInput: async () => state.existingCommitInput,
		writeCommitInput: async (repository, message) => {
			state.commitInputWrites.push({ repository, message });
		},
		readGitDiff: async repository => {
			state.repositoryRead = repository;
			return 'diff';
		},
		createProvider: () => ({
			generate: async prompt => {
				state.providerCalls += 1;
				state.promptSystem = prompt.system;
				if (state.commitInputDuringGeneration !== undefined) {
					state.existingCommitInput = state.commitInputDuringGeneration;
				}
				return 'fix(core): 修复暂存区生成逻辑';
			},
		}),
		writeClipboard: async message => {
			state.clipboardWrites.push(message);
		},
		showError: async message => {
			state.errorMessages.push(message);
		},
		showMissingApiKey: async message => {
			state.missingApiKeyMessages.push(message);
		},
	};
}
