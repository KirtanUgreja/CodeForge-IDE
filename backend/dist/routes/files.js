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
const fileSystem_js_1 = require("../services/fileSystem.js");
const git_js_1 = require("../services/git.js");
const auth_js_1 = require("../middleware/auth.js");
const supabase_js_1 = require("../lib/supabase.js");
const fs = __importStar(require("fs"));
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_js_1.authMiddleware);
// Helper to get file system service for a project
// Always resolves to the OWNER's workspace so collaborators see the real files
async function getFileService(req, projectId) {
    const userId = req.user.id;
    // Always look up the real owner from the database first
    const supabase = (0, supabase_js_1.createUserClient)(req.user.accessToken);
    const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('user_id')
        .eq('id', projectId)
        .single();
    if (projectError || !project) {
        console.log(`[FileService] ⚠️ Could not find project ${projectId}:`, projectError);
        // Fallback to user's own path
        const userPath = (0, git_js_1.getProjectPath)(userId, projectId);
        return (0, fileSystem_js_1.createFileSystemService)(userPath);
    }
    // Always use the OWNER's path (owner's cloned workspace has the actual files)
    const ownerPath = (0, git_js_1.getProjectPath)(project.user_id, projectId);
    console.log(`[FileService] User ${userId.slice(0, 8)} → owner ${project.user_id.slice(0, 8)}, path: ${ownerPath}, exists: ${fs.existsSync(ownerPath)}`);
    if (fs.existsSync(ownerPath)) {
        return (0, fileSystem_js_1.createFileSystemService)(ownerPath);
    }
    // If owner path doesn't exist yet, fall back to user's path
    const userPath = (0, git_js_1.getProjectPath)(userId, projectId);
    return (0, fileSystem_js_1.createFileSystemService)(userPath);
}
// Get file tree for a project
router.get('/tree/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;
        const fileService = await getFileService(req, projectId);
        await fileService.ensureWorkspace();
        const tree = await fileService.getFileTree();
        res.json({ success: true, data: tree });
    }
    catch (error) {
        console.error('Error getting file tree:', error);
        res.status(500).json({ success: false, error: 'Failed to get file tree' });
    }
});
// Read file content
router.get('/:projectId/read', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { path: filePath } = req.query;
        if (!filePath || typeof filePath !== 'string') {
            return res.status(400).json({ success: false, error: 'Path is required' });
        }
        const fileService = await getFileService(req, projectId);
        const content = await fileService.readFile(filePath);
        res.json({ success: true, data: content });
    }
    catch (error) {
        console.error('Error reading file:', error);
        const message = error instanceof Error ? error.message : 'Failed to read file';
        res.status(500).json({ success: false, error: message });
    }
});
// Write file content
router.post('/:projectId/write', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { path: filePath, content } = req.body;
        if (!filePath) {
            return res.status(400).json({ success: false, error: 'Path is required' });
        }
        const fileService = await getFileService(req, projectId);
        await fileService.writeFile(filePath, content || '');
        res.json({ success: true, message: 'File saved' });
    }
    catch (error) {
        console.error('Error writing file:', error);
        const message = error instanceof Error ? error.message : 'Failed to write file';
        res.status(500).json({ success: false, error: message });
    }
});
// Create file or folder
router.post('/:projectId/create', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { path: itemPath, type } = req.body;
        if (!itemPath) {
            return res.status(400).json({ success: false, error: 'Path is required' });
        }
        const fileService = await getFileService(req, projectId);
        if (type === 'folder') {
            await fileService.createFolder(itemPath);
        }
        else {
            await fileService.createFile(itemPath);
        }
        res.json({ success: true, message: `${type || 'file'} created` });
    }
    catch (error) {
        console.error('Error creating item:', error);
        const message = error instanceof Error ? error.message : 'Failed to create item';
        res.status(500).json({ success: false, error: message });
    }
});
// Delete file or folder
router.delete('/:projectId/delete', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { path: itemPath } = req.query;
        if (!itemPath || typeof itemPath !== 'string') {
            return res.status(400).json({ success: false, error: 'Path is required' });
        }
        const fileService = await getFileService(req, projectId);
        await fileService.delete(itemPath);
        res.json({ success: true, message: 'Item deleted' });
    }
    catch (error) {
        console.error('Error deleting item:', error);
        const message = error instanceof Error ? error.message : 'Failed to delete item';
        res.status(500).json({ success: false, error: message });
    }
});
// Upload file
router.post('/:projectId/upload', upload.single('file'), async (req, res) => {
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
    }
    catch (error) {
        console.error('Error uploading file:', error);
        const message = error instanceof Error ? error.message : 'Failed to upload file';
        res.status(500).json({ success: false, error: message });
    }
});
exports.default = router;
