/**
 * Returns the root workspace directory for a user.
 * All of the user's projects live here as subdirectories.
 * This is what gets mounted at /workspace inside their language container.
 */
export declare function getUserWorkspacePath(userId: string): string;
export declare function getProjectPath(userId: string, projectId: string): string;
export declare function getProjectPath(projectId: string): string;
export declare function cloneRepository(repoUrl: string, githubToken: string, userId: string, projectId: string): Promise<string>;
export declare function pullRepository(projectPath: string, githubToken?: string): Promise<void>;
export declare function pushRepository(projectPath: string, message?: string): Promise<void>;
export declare function createAndPushBranch(projectPath: string, branchName: string, githubToken?: string, message?: string): Promise<void>;
export declare function initAndPushRepo(projectPath: string, remoteUrl: string, githubToken: string, message?: string): Promise<void>;
export declare function deleteProject(userId: string, projectId: string): void;
