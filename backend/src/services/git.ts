import simpleGit, { SimpleGit } from 'simple-git'
import * as fs from 'fs'
import * as path from 'path'
import os from 'os'

// Use home directory for workspaces (shared by default in Docker Desktop)
const WORKSPACE_DIR = path.resolve(process.env.WORKSPACE_DIR || path.join(os.homedir(), '.codeblocking', 'workspaces'))

/**
 * Returns the root workspace directory for a user.
 * All of the user's projects live here as subdirectories.
 * This is what gets mounted at /workspace inside their language container.
 */
export function getUserWorkspacePath(userId: string): string {
    return path.join(WORKSPACE_DIR, userId)
}

// Get project path with userId and projectId
export function getProjectPath(userId: string, projectId: string): string;
// Get project path with just projectId (uses 'projects' subdirectory)
export function getProjectPath(projectId: string): string;
export function getProjectPath(userIdOrProjectId: string, projectId?: string): string {
    if (projectId === undefined) {
        return path.join(WORKSPACE_DIR, 'projects', userIdOrProjectId)
    }
    return path.join(WORKSPACE_DIR, userIdOrProjectId, projectId)
}

export async function cloneRepository(
    repoUrl: string,
    githubToken: string,
    userId: string,
    projectId: string
): Promise<string> {
    const projectPath = getProjectPath(userId, projectId)

    // Ensure parent directory exists
    fs.mkdirSync(path.dirname(projectPath), { recursive: true })

    // Add token to URL for private repos
    const authenticatedUrl = repoUrl.replace(
        'https://github.com/',
        `https://${githubToken}@github.com/`
    )

    const git: SimpleGit = simpleGit()
    await git.clone(authenticatedUrl, projectPath)

    return projectPath
}

export async function pullRepository(projectPath: string, githubToken?: string): Promise<void> {
    const git: SimpleGit = simpleGit(projectPath)

    try {
        if (githubToken) {
            const remotes = await git.getRemotes(true)
            const origin = remotes.find(r => r.name === 'origin')
            if (origin) {
                const url = origin.refs.push;
                const authenticatedUrl = url.replace(
                    /https:\/\/([^@]+@)?github\.com\//,
                    `https://${githubToken}@github.com/`
                )
                await git.remote(['set-url', 'origin', authenticatedUrl])
            }
        }

        const status = await git.status()
        const currentBranch = status.current
        const hasLocalChanges = status.files.length > 0

        if (hasLocalChanges) {
            console.log(`[GitService] Stashing local changes before pull in ${projectPath}`)
            await git.stash()
        }

        console.log(`[GitService] Fetching all remotes for ${projectPath}`)
        await git.fetch(['--all', '--prune'])

        // If we are on 'autosave', check if we should switch back to the default branch
        if (currentBranch === 'autosave' && !hasLocalChanges) {
            try {
                const remoteInfo = await git.remote(['show', 'origin'])
                const match = remoteInfo.match(/HEAD branch: (.*)/)
                const defaultBranch = match ? match[1].trim() : 'main'

                console.log(`[GitService] On 'autosave' branch with no local changes. Switching to default branch: ${defaultBranch}`)
                await git.checkout(defaultBranch)
                await git.pull('origin', defaultBranch, ['--rebase'])
                return
            } catch (branchError) {
                console.warn(`[GitService] Failed to auto-switch from autosave:`, branchError)
            }
        }

        if (currentBranch) {
            console.log(`[GitService] Pulling latest for branch: ${currentBranch}`)
            await git.pull('origin', currentBranch, ['--rebase'])
        } else {
            await git.pull(['--rebase'])
        }

        if (hasLocalChanges) {
            console.log(`[GitService] Popping stashed changes after pull in ${projectPath}`)
            try {
                await git.stash(['pop'])
            } catch (popError) {
                console.warn(`[GitService] Conflict while popping stash in ${projectPath}:`, popError)
            }
        }
    } catch (error) {
        console.warn(`[GitService] Standard pull failed, attempting to recover branch...`)
        try {
            const status = await git.status()
            const currentBranch = status.current
            if (currentBranch) {
                await git.fetch('origin', currentBranch)
                await git.reset(['--hard', `origin/${currentBranch}`])
            }
        } catch (recoverError) {
            console.error(`[GitService] Recovery failed:`, recoverError)
        }
    }
}

export async function pushRepository(
    projectPath: string,
    message: string = 'Update from CodeBlocking IDE'
): Promise<void> {
    const git: SimpleGit = simpleGit(projectPath)
    await git.add('.')
    await git.commit(message)
    await git.push()
}

export async function createAndPushBranch(
    projectPath: string,
    branchName: string,
    githubToken?: string,
    message: string = 'Update from CodeBlocking IDE'
): Promise<void> {
    console.log(`[GitService] Starting createAndPushBranch at ${projectPath} for branch ${branchName}`)
    const git: SimpleGit = simpleGit(projectPath)

    try {
        if (githubToken) {
            const remotes = await git.getRemotes(true)
            const origin = remotes.find(r => r.name === 'origin')
            if (origin) {
                const url = origin.refs.push;
                const authenticatedUrl = url.replace(
                    /https:\/\/([^@]+@)?github\.com\//,
                    `https://${githubToken}@github.com/`
                )
                await git.remote(['set-url', 'origin', authenticatedUrl])
                console.log(`[GitService] Updated origin remote URL with provided token`)
            }
        }

        await git.add('.')

        const status = await git.status()
        console.log(`[GitService] Status: ${status.files.length} modified files`)

        if (status.files.length === 0) {
            console.log(`[GitService] No changes detected. Skipping push.`)
            return;
        }

        await git.commit(message)
        console.log(`[GitService] Committed changes`)

        await git.checkout(['-B', branchName])
        console.log(`[GitService] Checked out branch ${branchName}`)

        await git.push('origin', branchName, ['--set-upstream', '--force'])
        console.log(`[GitService] Successfully pushed to origin`)
    } catch (error: any) {
        console.error(`[GitService] Error in createAndPushBranch:`, error)
        const details = error.stderr || error.message || String(error)
        throw new Error(`Git sync failed: ${details}`)
    }
}

export async function initAndPushRepo(
    projectPath: string,
    remoteUrl: string,
    githubToken: string,
    message: string = 'Initial commit from CodeForge Hub'
): Promise<void> {
    const git: SimpleGit = simpleGit(projectPath)

    try {
        await git.init()
        await git.branch(['-M', 'main'])

        const authenticatedUrl = remoteUrl.replace(
            'https://github.com/',
            `https://${githubToken}@github.com/`
        )

        await git.addRemote('origin', authenticatedUrl)
        await git.add('.')
        await git.commit(message)
        await git.push('origin', 'main', ['--set-upstream'])
    } catch (error: any) {
        console.error(`[GitService] Error in initAndPushRepo:`, error)
        throw new Error(`Git initialization failed: ${error.message || error}`)
    }
}

export function deleteProject(userId: string, projectId: string): void {
    const projectPath = getProjectPath(userId, projectId)
    if (fs.existsSync(projectPath)) {
        fs.rmSync(projectPath, { recursive: true, force: true })
    }
}