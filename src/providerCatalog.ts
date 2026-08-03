export type ProviderProtocol = 'openai-chat' | 'anthropic-messages' | 'gemini-generate-content';

export type AuthenticationStrategy =
	| 'bearer'
	| 'optional-bearer'
	| 'anthropic-key'
	| 'gemini-key'
	| 'azure-key';

export interface ProviderDefinition {
	id: string;
	label: string;
	description: string;
	protocol: ProviderProtocol;
	authentication: AuthenticationStrategy;
	defaultBaseUrl?: string;
	requiresApiKey: boolean;
}

export const PROVIDER_DEFINITIONS = [
	{
		id: 'anthropic',
		label: 'Anthropic',
		description: 'Anthropic Messages API',
		protocol: 'anthropic-messages',
		authentication: 'anthropic-key',
		defaultBaseUrl: 'https://api.anthropic.com',
		requiresApiKey: true,
	},
	{
		id: 'openai',
		label: 'OpenAI',
		description: 'OpenAI Chat Completions API',
		protocol: 'openai-chat',
		authentication: 'bearer',
		defaultBaseUrl: 'https://api.openai.com/v1',
		requiresApiKey: true,
	},
	{
		id: 'openai-compatible',
		label: 'OpenAI Compatible',
		description: 'Custom OpenAI-compatible Chat Completions API',
		protocol: 'openai-chat',
		authentication: 'bearer',
		defaultBaseUrl: 'https://api.openai.com/v1',
		requiresApiKey: true,
	},
	{
		id: 'gemini',
		label: 'Google Gemini',
		description: 'Google Gemini Generate Content API',
		protocol: 'gemini-generate-content',
		authentication: 'gemini-key',
		defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
		requiresApiKey: true,
	},
	{
		id: 'azure-openai',
		label: 'Azure OpenAI',
		description: 'Azure OpenAI Chat Completions API',
		protocol: 'openai-chat',
		authentication: 'azure-key',
		requiresApiKey: true,
	},
	{
		id: 'deepseek',
		label: 'DeepSeek',
		description: 'DeepSeek OpenAI-compatible API',
		protocol: 'openai-chat',
		authentication: 'bearer',
		defaultBaseUrl: 'https://api.deepseek.com',
		requiresApiKey: true,
	},
	{
		id: 'openrouter',
		label: 'OpenRouter',
		description: 'OpenRouter unified OpenAI-compatible API',
		protocol: 'openai-chat',
		authentication: 'bearer',
		defaultBaseUrl: 'https://openrouter.ai/api/v1',
		requiresApiKey: true,
	},
	{
		id: 'groq',
		label: 'Groq',
		description: 'Groq OpenAI-compatible API',
		protocol: 'openai-chat',
		authentication: 'bearer',
		defaultBaseUrl: 'https://api.groq.com/openai/v1',
		requiresApiKey: true,
	},
	{
		id: 'xai',
		label: 'xAI',
		description: 'xAI OpenAI-compatible API',
		protocol: 'openai-chat',
		authentication: 'bearer',
		defaultBaseUrl: 'https://api.x.ai/v1',
		requiresApiKey: true,
	},
	{
		id: 'mistral',
		label: 'Mistral AI',
		description: 'Mistral OpenAI-compatible API',
		protocol: 'openai-chat',
		authentication: 'bearer',
		defaultBaseUrl: 'https://api.mistral.ai/v1',
		requiresApiKey: true,
	},
	{
		id: 'together',
		label: 'Together AI',
		description: 'Together AI OpenAI-compatible API',
		protocol: 'openai-chat',
		authentication: 'bearer',
		defaultBaseUrl: 'https://api.together.xyz/v1',
		requiresApiKey: true,
	},
	{
		id: 'ollama',
		label: 'Ollama',
		description: 'Local Ollama OpenAI-compatible API',
		protocol: 'openai-chat',
		authentication: 'optional-bearer',
		defaultBaseUrl: 'http://localhost:11434/v1',
		requiresApiKey: false,
	},
	{
		id: 'lm-studio',
		label: 'LM Studio',
		description: 'Local LM Studio OpenAI-compatible API',
		protocol: 'openai-chat',
		authentication: 'optional-bearer',
		defaultBaseUrl: 'http://localhost:1234/v1',
		requiresApiKey: false,
	},
] as const satisfies readonly ProviderDefinition[];

export type ProviderName = typeof PROVIDER_DEFINITIONS[number]['id'];

export const SUPPORTED_PROVIDERS: readonly ProviderName[] = PROVIDER_DEFINITIONS.map(
	provider => provider.id,
);

export function isProviderName(value: string): value is ProviderName {
	return SUPPORTED_PROVIDERS.some(provider => provider === value);
}

export function getProviderDefinition(provider: ProviderName): ProviderDefinition {
	return PROVIDER_DEFINITIONS.find(definition => definition.id === provider) as ProviderDefinition;
}
