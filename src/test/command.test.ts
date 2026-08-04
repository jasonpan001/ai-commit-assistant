import * as assert from 'node:assert';
import { executeGenerateMessageCommand, GenerateCommandDependencies } from '../command';
import { AiCommitConfiguration } from '../config';
import { UserFacingError } from '../errors';

const configuration: AiCommitConfiguration = {
	provider: 'openai-compatible',
	baseUrl: 'https://provider.example/v1',
	apiKey: 'key',
	model: 'model',
	commitLanguage: 'zh-cn',
};

suite('Generate command workflow', () => {
	test('copies and reports a valid generated message', async () => {
		const state = createState();
		await executeGenerateMessageCommand(dependencies(state));

		assert.deepStrictEqual(state.clipboardWrites, ['fix(core): 修复暂存区生成逻辑']);
		assert.deepStrictEqual(state.informationMessages, ['Generated and copied: fix(core): 修复暂存区生成逻辑']);
		assert.deepStrictEqual(state.errorMessages, []);
		assert.strictEqual(state.repositoryRead, '/repo');
		assert.strictEqual(state.providerCalls, 1);
		assert.match(state.promptSystem ?? '', /Simplified Chinese/);
	});

	for (const failure of [
		{ name: 'empty staged diff', message: '暂存区没有变更，请先执行 Git stage。' },
		{ name: 'Git failure', message: '无法读取 Git 暂存区，请确认当前目录是有效仓库且 Git 可用。' },
	]) {
		test(`keeps the clipboard unchanged on ${failure.name}`, async () => {
			const state = createState();
			const commandDependencies = dependencies(state);
			commandDependencies.readStagedDiff = async () => {
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
});

interface CommandState {
	clipboardWrites: string[];
	informationMessages: string[];
	errorMessages: string[];
	repositoryRead: string | undefined;
	providerCalls: number;
	promptSystem: string | undefined;
}

function createState(): CommandState {
	return {
		clipboardWrites: [],
		informationMessages: [],
		errorMessages: [],
		repositoryRead: undefined,
		providerCalls: 0,
		promptSystem: undefined,
	};
}

function dependencies(state: CommandState): GenerateCommandDependencies {
	return {
		resolveRepository: () => '/repo',
		loadConfiguration: () => configuration,
		getLocale: () => 'en',
		readStagedDiff: async repository => {
			state.repositoryRead = repository;
			return 'diff';
		},
		createProvider: () => ({
			generate: async prompt => {
				state.providerCalls += 1;
				state.promptSystem = prompt.system;
				return 'fix(core): 修复暂存区生成逻辑';
			},
		}),
		writeClipboard: async message => {
			state.clipboardWrites.push(message);
		},
		showInformation: async message => {
			state.informationMessages.push(message);
		},
		showError: async message => {
			state.errorMessages.push(message);
		},
	};
}
