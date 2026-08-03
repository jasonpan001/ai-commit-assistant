import { UserFacingError } from './errors';
import { localize } from './localization';

export function selectRepository(activeWorkspace: string | undefined, workspaces: readonly string[]): string {
	if (activeWorkspace) {
		return activeWorkspace;
	}

	if (workspaces.length === 1) {
		return workspaces[0];
	}

	if (workspaces.length === 0) {
		throw new UserFacingError(localize('noWorkspace'));
	}

	throw new UserFacingError(localize('ambiguousWorkspace'));
}
