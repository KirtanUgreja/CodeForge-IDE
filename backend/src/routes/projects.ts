import { Router, Response } from 'express'
import multer from 'multer'
import path from 'path'
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth.js'
import { createUserClient } from '../lib/supabase.js'
import { cloneRepository, deleteProject, getProjectPath, createAndPushBranch, initAndPushRepo } from '../services/git.js'
import { createRepo } from '../services/github.js'
import { detectEnvironment } from '../services/environment.js'
import * as fs from 'fs'

const upload = multer({ storage: multer.memoryStorage() })

const router = Router()

// All routes require authentication
router.use(authMiddleware)

// GET /api/projects - List user's projects
router.get('/', async (req: AuthenticatedRequest, res) => {
    try {
        const supabase = createUserClient(req.user!.accessToken)

        // 1. Fetch strictly owned projects
        const { data: ownedProjects, error: ownedError } = await supabase
            .from('projects')
            .select('*')
            .eq('user_id', req.user!.id)
            .order('last_opened', { ascending: false })

        // 2. Fetch projects you explicitly collaborate on
        const { data: collabRecords } = await supabase
            .from('project_collaborators')
            .select('project_id')
            .eq('user_id', req.user!.id)

        let collabProjects: any[] = []
        if (collabRecords && collabRecords.length > 0) {
            const { data: cProjects } = await supabase
                .from('projects')
                .select('*')
                .in('id', collabRecords.map(c => c.project_id))
            collabProjects = cProjects || []
        }

        // Merge arrays
        const rawProjects = [...(ownedProjects || []), ...collabProjects]

        // Remove exact duplicates
        const uniqueKeys = new Set()
        const projects = rawProjects.filter(p => {
            if (uniqueKeys.has(p.id)) return false
            uniqueKeys.add(p.id)
            return true
        }).sort((a, b) => new Date(b.last_opened).getTime() - new Date(a.last_opened).getTime())

        const error = ownedError

        if (error) {
            console.error('Error fetching projects:', error)
            return res.status(500).json({ error: 'Failed to fetch projects' })
        }

        return res.json({ projects })
    } catch (error) {
        console.error('Error in GET /projects:', error)
        return res.status(500).json({ error: 'Failed to fetch projects' })
    }
})

// POST /api/projects - Create a new project from GitHub repo
router.post('/', async (req: AuthenticatedRequest, res) => {
    try {
        const { repoUrl, repoFullName, name, isPrivate, environment } = req.body

        if (!repoUrl || !repoFullName || !name) {
            return res.status(400).json({ error: 'Missing required fields' })
        }

        // Validate environment
        const validEnvironments = ['python', 'node', 'java', 'go', 'rust', 'cpp', 'php', 'ruby', 'base']
        const selectedEnvironment = validEnvironments.includes(environment) ? environment : 'base'

        const githubToken = req.user?.providerToken
        if (!githubToken) {
            return res.status(400).json({ error: 'GitHub token not available' })
        }

        const supabase = createUserClient(req.user!.accessToken)

        // Create project in database with selected environment
        const { data: project, error: createError } = await supabase
            .from('projects')
            .insert({
                user_id: req.user!.id,
                name,
                repo_url: repoUrl,
                repo_full_name: repoFullName,
                is_private: isPrivate || false,
                environment: selectedEnvironment
            })
            .select()
            .single()

        if (createError || !project) {
            console.error('Error creating project:', createError)
            return res.status(500).json({ error: 'Failed to create project', details: createError })
        }

        // Clone the repository
        try {
            await cloneRepository(
                repoUrl,
                githubToken,
                req.user!.id,
                project.id
            )
        } catch (cloneError: any) {
            console.error('Error cloning repository:', cloneError)
            // Delete the project record if clone failed
            await supabase.from('projects').delete().eq('id', project.id)
            return res.status(500).json({ error: 'Failed to clone repository', details: cloneError?.message || cloneError })
        }

        return res.status(201).json({ project })
    } catch (error: any) {
        console.error('Error in POST /projects:', error)
        return res.status(500).json({ error: 'Failed to create project', details: error?.message || error })
    }
})

// DELETE /api/projects/:id - Delete a project
router.delete('/:id', async (req: AuthenticatedRequest, res) => {
    try {
        const { id } = req.params
        const supabase = createUserClient(req.user!.accessToken)

        // Delete from database (RLS will ensure user owns it)
        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting project:', error)
            return res.status(500).json({ error: 'Failed to delete project' })
        }

        // Delete local files
        deleteProject(req.user!.id, id)

        return res.json({ success: true })
    } catch (error) {
        console.error('Error in DELETE /projects/:id:', error)
        return res.status(500).json({ error: 'Failed to delete project' })
    }
})

// GET /api/projects/:id/open - Open a project (update last_opened, ensure cloned)
router.get('/:id/open', async (req: AuthenticatedRequest, res) => {
    try {
        const { id } = req.params
        const supabase = createUserClient(req.user!.accessToken)

        // Get project
        const { data: project, error } = await supabase
            .from('projects')
            .select('*')
            .eq('id', id)
            .single()

        if (error || !project) {
            return res.status(404).json({ error: 'Project not found' })
        }

        // Check if project is cloned locally by the OWNER first (collaborators share the owner's clone)
        const ownerPath = getProjectPath(project.user_id, id)
        const userPath = getProjectPath(req.user!.id, id)
        const isOwnerCloned = fs.existsSync(ownerPath)
        const isUserCloned = fs.existsSync(userPath)

        // Determine the actual project path to use
        let projectPath = ownerPath

        if (!isOwnerCloned) {
            if (req.user!.id === project.user_id) {
                // Owner hasn't cloned yet, so clone it
                const githubToken = req.user?.providerToken
                if (!githubToken) {
                    return res.status(400).json({ error: 'GitHub token not available. Please log out and log back in with GitHub.' })
                }
                await cloneRepository(project.repo_url, githubToken, req.user!.id, id)
            } else {
                // Owner hasn't cloned yet; collaborator can't clone for them
                return res.status(400).json({ error: 'The project owner has not opened this project yet. Ask them to open it first.' })
            }
        } else {
            // Project is already cloned, attempt to pull latest changes
            try {
                const githubToken = req.user?.providerToken
                await pullRepository(projectPath, githubToken)
                console.log(`[GitService] Auto-pulled latest changes for project ${id} (User: ${req.user!.id})`)
            } catch (pullError) {
                console.error(`[GitService] Auto-pull failed for project ${id}:`, pullError)
                // Continue anyway so the user can at least see the local files
            }
        }

        // Update last_opened
        await supabase
            .from('projects')
            .update({ last_opened: new Date().toISOString() })
            .eq('id', id)

        return res.json({
            project,
            path: projectPath
        })
    } catch (error) {
        console.error('Error in GET /projects/:id/open:', error)
        return res.status(500).json({ error: 'Failed to open project' })
    }
})

// POST /api/projects/:id/save - Save changes to a new branch on GitHub
router.post('/:id/save', async (req: AuthenticatedRequest, res) => {
    try {
        const { id } = req.params
        const { branchName, message } = req.body
        const userId = req.user!.id

        // Default branch name if not provided
        const finalBranchName = branchName || `auto-save-${new Date().getTime()}`
        const finalMessage = message || 'Automatic save from CodeForge Hub'

        const projectPath = getProjectPath(userId, id)
        if (!fs.existsSync(projectPath)) {
            return res.status(404).json({ error: 'Project files not found' })
        }

        await createAndPushBranch(projectPath, finalBranchName, req.user!.providerToken, finalMessage)

        return res.json({
            success: true,
            data: { branch: finalBranchName }
        })
    } catch (error: any) {
        console.error('Error in POST /projects/:id/save:', error)
        return res.status(500).json({
            error: 'Failed to save to GitHub',
            details: error?.message || error
        })
    }
})

// POST /api/projects/import - Import project from local files
router.post('/import', upload.array('files'), async (req: any, res: Response) => {
    try {
        const { name, isPrivate, environment } = req.body
        const files = req.files as any[]

        if (!name || !files || files.length === 0) {
            return res.status(400).json({ error: 'Missing required fields or files' })
        }

        const githubToken = req.user?.providerToken
        if (!githubToken) {
            return res.status(400).json({ error: 'GitHub token not available' })
        }

        const supabase = createUserClient(req.user!.accessToken)

        // 1. Create GitHub Repo
        let repo: any
        try {
            repo = await createRepo(githubToken, name, 'Project imported from local files', isPrivate === 'true')
        } catch (repoError: any) {
            console.error('Error creating GitHub repo:', repoError)
            return res.status(500).json({ error: 'Failed to create GitHub repository', details: repoError.message })
        }

        // 2. Create project in database
        const { data: project, error: createError } = await supabase
            .from('projects')
            .insert({
                user_id: req.user!.id,
                name,
                repo_url: repo.html_url,
                repo_full_name: repo.full_name,
                is_private: repo.private,
                environment: environment || 'base'
            })
            .select()
            .single()

        if (createError || !project) {
            console.error('Error creating project in DB:', createError)
            return res.status(500).json({ error: 'Failed to create project record', details: createError })
        }

        // 3. Save files to local workspace
        const projectPath = getProjectPath(req.user!.id, project.id)
        fs.mkdirSync(projectPath, { recursive: true })

        for (const file of files) {
            // Reconstruct path from originalname (which we expect to contain the relative path if passed correctly from frontend)
            // Or use a custom header/body field for the path
            const relativePath = file.originalname
            const fullPath = path.join(projectPath, relativePath)

            fs.mkdirSync(path.dirname(fullPath), { recursive: true })
            fs.writeFileSync(fullPath, file.buffer)
        }

        // 4. Initialize Git and Push
        try {
            await initAndPushRepo(projectPath, repo.html_url, githubToken)
        } catch (gitError: any) {
            console.error('Error initializing git repo:', gitError)
            return res.status(500).json({ error: 'Failed to initialize git repository', details: gitError.message })
        }

        return res.status(201).json({ project })
    } catch (error: any) {
        console.error('Error in POST /import:', error)
        return res.status(500).json({ error: 'Failed to import project', details: error?.message || error })
    }
})

export default router
