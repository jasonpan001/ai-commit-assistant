export class UserFacingError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'UserFacingError';
	}
}

export function getUserFacingMessage(error: unknown): string {
	if (error instanceof UserFacingError) {
		return error.message;
	}

	return '生成提交信息失败，请检查配置和网络后重试。';
}
