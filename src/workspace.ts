import { UserFacingError } from './errors';

export function selectRepository(activeWorkspace: string | undefined, workspaces: readonly string[]): string {
	if (activeWorkspace) {
		return activeWorkspace;
	}

	if (workspaces.length === 1) {
		return workspaces[0];
	}

	if (workspaces.length === 0) {
		throw new UserFacingError('未找到工作区，请先打开一个 Git 仓库。');
	}

	throw new UserFacingError('无法确定仓库，请先聚焦目标工作区中的文件后重试。');
}
