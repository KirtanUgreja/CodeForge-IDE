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
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const auth_js_1 = require("../middleware/auth.js");
const supabase_js_1 = require("../lib/supabase.js");
const git_js_1 = require("../services/git.js");
const github_js_1 = require("../services/github.js");
const fs = __importStar(require("fs"));
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_js_1.authMiddleware);
// GET /api/projects - List user's projects
router.get('/', async (req, res) => {
    try {
        const supabase = (0, supabase_js_1.createUserClient)(req.user.accessToken);
        // 1. Fetch strictly owned projects
        const { data: ownedProjects, error: ownedError } = await supabase
            .from('projects')
            .select('*')
            .eq('user_id', req.user.id)
            .order('last_opened', { ascending: false });
        // 2. Fetch projects you explicitly collaborate on
        const { data: collabRecords } = await supabase
            .from('project_collaborators')
            .select('project_id')
            .eq('user_id', req.user.id);
        let collabProjects = [];
        if (collabRecords && collabRecords.length > 0) {
            const { data: cProjects } = await supabase
                .from('projects')
                .select('*')
                .in('id', collabRecords.map(c => c.project_id));
            collabProjects = cProjects || [];
        }
        // Merge arrays
        const rawProjects = [...(ownedProjects || []), ...collabProjects];
        // Remove exact duplicates
        const uniqueKeys = new Set();
        const projects = rawProjects.filter(p => {
            if (uniqueKeys.has(p.id))
                return false;
            uniqueKeys.add(p.id);
            return true;
        }).sort((a, b) => new Date(b.last_opened).getTime() - new Date(a.last_opened).getTime());
        const error = ownedError;
        if (error) {
            console.error('Error fetching projects:', error);
            return res.status(500).json({ error: 'Failed to fetch projects' });
        }
        return res.json({ projects });
    }
    catch (error) {
        console.error('Error in GET /projects:', error);
        return res.status(500).json({ error: 'Failed to fetch projects' });
    }
});
// POST /api/projects - Create a new project from GitHub repo
router.post('/', async (req, res) => {
    try {
        const { repoUrl, repoFullName, name, isPrivate, environment } = req.body;
        if (!repoUrl || !repoFullName || !name) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        // Validate environment
        const validEnvironments = ['python', 'node', 'java', 'go', 'rust', 'cpp', 'php', 'ruby', 'base'];
        const selectedEnvironment = validEnvironments.includes(environment) ? environment : 'base';
        const githubToken = req.user?.providerToken;
        if (!githubToken) {
            return res.status(400).json({ error: 'GitHub token not available' });
        }
        const supabase = (0, supabase_js_1.createUserClient)(req.user.accessToken);
        // Create project in database with selected environment
        const { data: project, error: createError } = await supabase
            .from('projects')
            .insert({
            user_id: req.user.id,
            name,
            repo_url: repoUrl,
            repo_full_name: repoFullName,
            is_private: isPrivate || false,
            environment: selectedEnvironment
        })
            .select()
            .single();
        if (createError || !project) {
            console.error('Error creating project:', createError);
            return res.status(500).json({ error: 'Failed to create project', details: createError });
        }
        // Clone the repository
        try {
            await (0, git_js_1.cloneRepository)(repoUrl, githubToken, req.user.id, project.id);
        }
        catch (cloneError) {
            console.error('Error cloning repository:', cloneError);
            // Delete the project record if clone failed
            await supabase.from('projects').delete().eq('id', project.id);
            return res.status(500).json({ error: 'Failed to clone repository', details: cloneError?.message || cloneError });
        }
        return res.status(201).json({ project });
    }
    catch (error) {
        console.error('Error in POST /projects:', error);
        return res.status(500).json({ error: 'Failed to create project', details: error?.message || error });
    }
});
// DELETE /api/projects/:id - Delete a project
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const supabase = (0, supabase_js_1.createUserClient)(req.user.accessToken);
        // Delete from database (RLS will ensure user owns it)
        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', id);
        if (error) {
            console.error('Error deleting project:', error);
            return res.status(500).json({ error: 'Failed to delete project' });
        }
        // Delete local files
        (0, git_js_1.deleteProject)(req.user.id, id);
        return res.json({ success: true });
    }
    catch (error) {
        console.error('Error in DELETE /projects/:id:', error);
        return res.status(500).json({ error: 'Failed to delete project' });
    }
});
// GET /api/projects/:id/open - Open a project (update last_opened, ensure cloned)
router.get('/:id/open', async (req, res) => {
    try {
        const { id } = req.params;
        const supabase = (0, supabase_js_1.createUserClient)(req.user.accessToken);
        // Get project
        const { data: project, error } = await supabase
            .from('projects')
            .select('*')
            .eq('id', id)
            .single();
        if (error || !project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        // Check if project is cloned locally by the OWNER first (collaborators share the owner's clone)
        const ownerPath = (0, git_js_1.getProjectPath)(project.user_id, id);
        const userPath = (0, git_js_1.getProjectPath)(req.user.id, id);
        const isOwnerCloned = fs.existsSync(ownerPath);
        const isUserCloned = fs.existsSync(userPath);
        // Determine the actual project path to use
        let projectPath = ownerPath;
        if (!isOwnerCloned) {
            if (req.user.id === project.user_id) {
                // Owner hasn't cloned yet, so clone it
                const githubToken = req.user?.providerToken;
                if (!githubToken) {
                    return res.status(400).json({ error: 'GitHub token not available. Please log out and log back in with GitHub.' });
                }
                await (0, git_js_1.cloneRepository)(project.repo_url, githubToken, req.user.id, id);
            }
            else {
                // Owner hasn't cloned yet; collaborator can't clone for them
                return res.status(400).json({ error: 'The project owner has not opened this project yet. Ask them to open it first.' });
            }
        }
        else {
            // Project is already cloned, attempt to pull latest changes
            try {
                const githubToken = req.user?.providerToken;
                await pullRepository(projectPath, githubToken);
                console.log(`[GitService] Auto-pulled latest changes for project ${id} (User: ${req.user.id})`);
            }
            catch (pullError) {
                console.error(`[GitService] Auto-pull failed for project ${id}:`, pullError);
                // Continue anyway so the user can at least see the local files
            }
        }
        // Update last_opened
        await supabase
            .from('projects')
            .update({ last_opened: new Date().toISOString() })
            .eq('id', id);
        return res.json({
            project,
            path: projectPath
        });
    }
    catch (error) {
        console.error('Error in GET /projects/:id/open:', error);
        return res.status(500).json({ error: 'Failed to open project' });
    }
});
// POST /api/projects/:id/save - Save changes to a new branch on GitHub
router.post('/:id/save', async (req, res) => {
    try {
        const { id } = req.params;
        const { branchName, message } = req.body;
        const userId = req.user.id;
        // Default branch name if not provided
        const finalBranchName = branchName || `auto-save-${new Date().getTime()}`;
        const finalMessage = message || 'Automatic save from CodeForge Hub';
        const projectPath = (0, git_js_1.getProjectPath)(userId, id);
        if (!fs.existsSync(projectPath)) {
            return res.status(404).json({ error: 'Project files not found' });
        }
        await (0, git_js_1.createAndPushBranch)(projectPath, finalBranchName, req.user.providerToken, finalMessage);
        return res.json({
            success: true,
            data: { branch: finalBranchName }
        });
    }
    catch (error) {
        console.error('Error in POST /projects/:id/save:', error);
        return res.status(500).json({
            error: 'Failed to save to GitHub',
            details: error?.message || error
        });
    }
});
// POST /api/projects/import - Import project from local files
router.post('/import', upload.array('files'), async (req, res) => {
    try {
        const { name, isPrivate, environment } = req.body;
        const files = req.files;
        if (!name || !files || files.length === 0) {
            return res.status(400).json({ error: 'Missing required fields or files' });
        }
        const githubToken = req.user?.providerToken;
        if (!githubToken) {
            return res.status(400).json({ error: 'GitHub token not available' });
        }
        const supabase = (0, supabase_js_1.createUserClient)(req.user.accessToken);
        // 1. Create GitHub Repo
        let repo;
        try {
            repo = await (0, github_js_1.createRepo)(githubToken, name, 'Project imported from local files', isPrivate === 'true');
        }
        catch (repoError) {
            console.error('Error creating GitHub repo:', repoError);
            return res.status(500).json({ error: 'Failed to create GitHub repository', details: repoError.message });
        }
        // 2. Create project in database
        const { data: project, error: createError } = await supabase
            .from('projects')
            .insert({
            user_id: req.user.id,
            name,
            repo_url: repo.html_url,
            repo_full_name: repo.full_name,
            is_private: repo.private,
            environment: environment || 'base'
        })
            .select()
            .single();
        if (createError || !project) {
            console.error('Error creating project in DB:', createError);
            return res.status(500).json({ error: 'Failed to create project record', details: createError });
        }
        // 3. Save files to local workspace
        const projectPath = (0, git_js_1.getProjectPath)(req.user.id, project.id);
        fs.mkdirSync(projectPath, { recursive: true });
        for (const file of files) {
            // Reconstruct path from originalname (which we expect to contain the relative path if passed correctly from frontend)
            // Or use a custom header/body field for the path
            const relativePath = file.originalname;
            const fullPath = path_1.default.join(projectPath, relativePath);
            fs.mkdirSync(path_1.default.dirname(fullPath), { recursive: true });
            fs.writeFileSync(fullPath, file.buffer);
        }
        // 4. Initialize Git and Push
        try {
            await (0, git_js_1.initAndPushRepo)(projectPath, repo.html_url, githubToken);
        }
        catch (gitError) {
            console.error('Error initializing git repo:', gitError);
            return res.status(500).json({ error: 'Failed to initialize git repository', details: gitError.message });
        }
        return res.status(201).json({ project });
    }
    catch (error) {
        console.error('Error in POST /import:', error);
        return res.status(500).json({ error: 'Failed to import project', details: error?.message || error });
    }
});
exports.default = router;
