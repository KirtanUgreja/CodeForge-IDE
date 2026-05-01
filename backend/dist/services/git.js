"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserWorkspacePath = getUserWorkspacePath;
exports.getProjectPath = getProjectPath;
exports.cloneRepository = cloneRepository;
exports.pullRepository = pullRepository;
exports.pushRepository = pushRepository;
exports.createAndPushBranch = createAndPushBranch;
exports.initAndPushRepo = initAndPushRepo;
exports.deleteProject = deleteProject;
const simple_git_1 = __importDefault(require("simple-git"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os_1 = __importDefault(require("os"));
// Use home directory for workspaces (shared by default in Docker Desktop)
const WORKSPACE_DIR = path.resolve(process.env.WORKSPACE_DIR || path.join(os_1.default.homedir(), '.codeblocking', 'workspaces'));
/**
 * Returns the root workspace directory for a user.
 * All of the user's projects live here as subdirectories.
 * This is what gets mounted at /workspace inside their language container.
 */
function getUserWorkspacePath(userId) {
    return path.join(WORKSPACE_DIR, userId);
}
function getProjectPath(userIdOrProjectId, projectId) {
    if (projectId === undefined) {
        return path.join(WORKSPACE_DIR, 'projects', userIdOrProjectId);
    }
    return path.join(WORKSPACE_DIR, userIdOrProjectId, projectId);
}
async function cloneRepository(repoUrl, githubToken, userId, projectId) {
    const projectPath = getProjectPath(userId, projectId);
    // Ensure parent directory exists
    fs.mkdirSync(path.dirname(projectPath), { recursive: true });
    // Add token to URL for private repos
    const authenticatedUrl = repoUrl.replace('https://github.com/', `https://${githubToken}@github.com/`);
    const git = (0, simple_git_1.default)();
    await git.clone(authenticatedUrl, projectPath);
    return projectPath;
}
async function pullRepository(projectPath, githubToken) {
    const git = (0, simple_git_1.default)(projectPath);
    try {
        if (githubToken) {
            const remotes = await git.getRemotes(true);
            const origin = remotes.find(r => r.name === 'origin');
            if (origin) {
                const url = origin.refs.push;
                const authenticatedUrl = url.replace(/https:\/\/([^@]+@)?github\.com\//, `https://${githubToken}@github.com/`);
                await git.remote(['set-url', 'origin', authenticatedUrl]);
            }
        }
        const status = await git.status();
        const currentBranch = status.current;
        const hasLocalChanges = status.files.length > 0;
        if (hasLocalChanges) {
            console.log(`[GitService] Stashing local changes before pull in ${projectPath}`);
            await git.stash();
        }
        console.log(`[GitService] Fetching all remotes for ${projectPath}`);
        await git.fetch(['--all', '--prune']);
        // If we are on 'autosave', check if we should switch back to the default branch
        if (currentBranch === 'autosave' && !hasLocalChanges) {
            try {
                const remoteInfo = await git.remote(['show', 'origin']);
                const match = remoteInfo.match(/HEAD branch: (.*)/);
                const defaultBranch = match ? match[1].trim() : 'main';
                console.log(`[GitService] On 'autosave' branch with no local changes. Switching to default branch: ${defaultBranch}`);
                await git.checkout(defaultBranch);
                await git.pull('origin', defaultBranch, ['--rebase']);
                return;
            }
            catch (branchError) {
                console.warn(`[GitService] Failed to auto-switch from autosave:`, branchError);
            }
        }
        if (currentBranch) {
            console.log(`[GitService] Pulling latest for branch: ${currentBranch}`);
            await git.pull('origin', currentBranch, ['--rebase']);
        }
        else {
            await git.pull(['--rebase']);
        }
        if (hasLocalChanges) {
            console.log(`[GitService] Popping stashed changes after pull in ${projectPath}`);
            try {
                await git.stash(['pop']);
            }
            catch (popError) {
                console.warn(`[GitService] Conflict while popping stash in ${projectPath}:`, popError);
            }
        }
    }
    catch (error) {
        console.warn(`[GitService] Standard pull failed, attempting to recover branch...`);
        try {
            const status = await git.status();
            const currentBranch = status.current;
            if (currentBranch) {
                await git.fetch('origin', currentBranch);
                await git.reset(['--hard', `origin/${currentBranch}`]);
            }
        }
        catch (recoverError) {
            console.error(`[GitService] Recovery failed:`, recoverError);
        }
    }
}
async function pushRepository(projectPath, message = 'Update from CodeBlocking IDE') {
    const git = (0, simple_git_1.default)(projectPath);
    await git.add('.');
    await git.commit(message);
    await git.push();
}
async function createAndPushBranch(projectPath, branchName, githubToken, message = 'Update from CodeBlocking IDE') {
    console.log(`[GitService] Starting createAndPushBranch at ${projectPath} for branch ${branchName}`);
    const git = (0, simple_git_1.default)(projectPath);
    try {
        if (githubToken) {
            const remotes = await git.getRemotes(true);
            const origin = remotes.find(r => r.name === 'origin');
            if (origin) {
                const url = origin.refs.push;
                const authenticatedUrl = url.replace(/https:\/\/([^@]+@)?github\.com\//, `https://${githubToken}@github.com/`);
                await git.remote(['set-url', 'origin', authenticatedUrl]);
                console.log(`[GitService] Updated origin remote URL with provided token`);
            }
        }
        await git.add('.');
        const status = await git.status();
        console.log(`[GitService] Status: ${status.files.length} modified files`);
        if (status.files.length === 0) {
            console.log(`[GitService] No changes detected. Skipping push.`);
            return;
        }
        await git.commit(message);
        console.log(`[GitService] Committed changes`);
        await git.checkout(['-B', branchName]);
        console.log(`[GitService] Checked out branch ${branchName}`);
        await git.push('origin', branchName, ['--set-upstream', '--force']);
        console.log(`[GitService] Successfully pushed to origin`);
    }
    catch (error) {
        console.error(`[GitService] Error in createAndPushBranch:`, error);
        const details = error.stderr || error.message || String(error);
        throw new Error(`Git sync failed: ${details}`);
    }
}
async function initAndPushRepo(projectPath, remoteUrl, githubToken, message = 'Initial commit from CodeForge Hub') {
    const git = (0, simple_git_1.default)(projectPath);
    try {
        await git.init();
        await git.branch(['-M', 'main']);
        const authenticatedUrl = remoteUrl.replace('https://github.com/', `https://${githubToken}@github.com/`);
        await git.addRemote('origin', authenticatedUrl);
        await git.add('.');
        await git.commit(message);
        await git.push('origin', 'main', ['--set-upstream']);
    }
    catch (error) {
        console.error(`[GitService] Error in initAndPushRepo:`, error);
        throw new Error(`Git initialization failed: ${error.message || error}`);
    }
}
function deleteProject(userId, projectId) {
    const projectPath = getProjectPath(userId, projectId);
    if (fs.existsSync(projectPath)) {
        fs.rmSync(projectPath, { recursive: true, force: true });
    }
}
