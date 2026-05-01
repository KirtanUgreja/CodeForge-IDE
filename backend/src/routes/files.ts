import { Router, Response } from 'express';
import multer from 'multer';
import { createFileSystemService } from '../services/fileSystem.js';
import { getProjectPath } from '../services/git.js';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth.js';
import { createUserClient } from '../lib/supabase.js';
import * as fs from 'fs';

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Helper to get file system service for a project
// Always resolves to the OWNER's workspace so collaborators see the real files
async function getFileService(req: AuthenticatedRequest, projectId: string) {
    const userId = req.user!.id;

    // Always look up the real owner from the database first
    const supabase = createUserClient(req.user!.accessToken);
    const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('user_id')
        .eq('id', projectId)
        .single();

    if (projectError || !project) {
        console.log(`[FileService] ⚠️ Could not find project ${projectId}:`, projectError);
        // Fallback to user's own path
        const userPath = getProjectPath(userId, projectId);
        return createFileSystemService(userPath);
    }

    // Always use the OWNER's path (owner's cloned workspace has the actual files)
    const ownerPath = getProjectPath(project.user_id, projectId);
    console.log(`[FileService] User ${userId.slice(0, 8)} → owner ${project.user_id.slice(0, 8)}, path: ${ownerPath}, exists: ${fs.existsSync(ownerPath)}`);

    if (fs.existsSync(ownerPath)) {
        return createFileSystemService(ownerPath);
    }

    // If owner path doesn't exist yet, fall back to user's path
    const userPath = getProjectPath(userId, projectId);
    return createFileSystemService(userPath);
}

// Get file tree for a project
router.get('/tree/:projectId', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { projectId } = req.params;
        const fileService = await getFileService(req, projectId);
        await fileService.ensureWorkspace();
        const tree = await fileService.getFileTree();

        res.json({ success: true, data: tree });
    } catch (error) {
        console.error('Error getting file tree:', error);
        res.status(500).json({ success: false, error: 'Failed to get file tree' });
    }
});

// Read file content
router.get('/:projectId/read', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { projectId } = req.params;
        const { path: filePath } = req.query;

        if (!filePath || typeof filePath !== 'string') {
            return res.status(400).json({ success: false, error: 'Path is required' });
        }

        const fileService = await getFileService(req, projectId);
        const content = await fileService.readFile(filePath);

        res.json({ success: true, data: content });
    } catch (error: unknown) {
        console.error('Error reading file:', error);
        const message = error instanceof Error ? error.message : 'Failed to read file';
        res.status(500).json({ success: false, error: message });
    }
});

// Write file content
router.post('/:projectId/write', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { projectId } = req.params;
        const { path: filePath, content } = req.body;

        if (!filePath) {
            return res.status(400).json({ success: false, error: 'Path is required' });
        }

        const fileService = await getFileService(req, projectId);
        await fileService.writeFile(filePath, content || '');

        res.json({ success: true, message: 'File saved' });
    } catch (error: unknown) {
        console.error('Error writing file:', error);
        const message = error instanceof Error ? error.message : 'Failed to write file';
        res.status(500).json({ success: false, error: message });
    }
});

// Create file or folder
router.post('/:projectId/create', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { projectId } = req.params;
        const { path: itemPath, type } = req.body;

        if (!itemPath) {
            return res.status(400).json({ success: false, error: 'Path is required' });
        }

        const fileService = await getFileService(req, projectId);

        if (type === 'folder') {
            await fileService.createFolder(itemPath);
        } else {
            await fileService.createFile(itemPath);
        }

        res.json({ success: true, message: `${type || 'file'} created` });
    } catch (error: unknown) {
        console.error('Error creating item:', error);
        const message = error instanceof Error ? error.message : 'Failed to create item';
        res.status(500).json({ success: false, error: message });
    }
});

// Delete file or folder
router.delete('/:projectId/delete', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { projectId } = req.params;
        const { path: itemPath } = req.query;

        if (!itemPath || typeof itemPath !== 'string') {
            return res.status(400).json({ success: false, error: 'Path is required' });
        }

        const fileService = await getFileService(req, projectId);
        await fileService.delete(itemPath);

        res.json({ success: true, message: 'Item deleted' });
    } catch (error: unknown) {
        console.error('Error deleting item:', error);
        const message = error instanceof Error ? error.message : 'Failed to delete item';
        res.status(500).json({ success: false, error: message });
    }
});

// Upload file
router.post('/:projectId/upload', upload.single('file'), async (req: any, res: Response) => {
    try {
        const { projectId } = req.params;
        const { path: dirPath } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        const fileService = await getFileService(req, projectId);
        const filePath = dirPath ? `${dirPath}/${file.originalname}` : file.originalname;

        await fileService.writeBuffer(filePath, file.buffer);

        res.json({ success: true, message: 'File uploaded successfully' });
    } catch (error: unknown) {
        console.error('Error uploading file:', error);
        const message = error instanceof Error ? error.message : 'Failed to upload file';
        res.status(500).json({ success: false, error: message });
    }
});

export default router;
