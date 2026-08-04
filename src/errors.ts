import { localize } from './localization';

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

	return localize('generationFailed');
}
