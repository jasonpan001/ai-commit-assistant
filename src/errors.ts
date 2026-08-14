import { localize } from './localization';

export class UserFacingError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'UserFacingError';
	}
}

export class MissingApiKeyError extends UserFacingError {
	constructor(message: string) {
		super(message);
		this.name = 'MissingApiKeyError';
	}
}

export function getUserFacingMessage(error: unknown): string {
	if (error instanceof UserFacingError) {
		return error.message;
	}

	return localize('generationFailed');
}
