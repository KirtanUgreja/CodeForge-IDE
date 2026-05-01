"use strict";
// File System Service - Handles file operations for the IDE
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileSystemService = void 0;
exports.createFileSystemService = createFileSystemService;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
class FileSystemService {
    workspaceRoot;
    constructor(workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
    }
    /**
     * Ensure the workspace directory exists
     */
    async ensureWorkspace() {
        try {
            await promises_1.default.access(this.workspaceRoot);
        }
        catch {
            await promises_1.default.mkdir(this.workspaceRoot, { recursive: true });
        }
    }
    /**
     * Get the full file tree of the workspace
     */
    async getFileTree(dirPath = '') {
        const fullPath = path_1.default.join(this.workspaceRoot, dirPath);
        try {
            const entries = await promises_1.default.readdir(fullPath, { withFileTypes: true });
            const nodes = [];
            for (const entry of entries) {
                // Skip hidden files, node_modules, __pycache__
                if (entry.name.startsWith('.') ||
                    entry.name === 'node_modules' ||
                    entry.name === '__pycache__' ||
                    entry.name === 'target' ||
                    entry.name === 'build') {
                    continue;
                }
                const relativePath = path_1.default.join(dirPath, entry.name);
                const node = {
                    id: relativePath,
                    name: entry.name,
                    type: entry.isDirectory() ? 'folder' : 'file',
                    path: relativePath,
                };
                if (entry.isDirectory()) {
                    node.children = await this.getFileTree(relativePath);
                }
                nodes.push(node);
            }
            // Sort: folders first, then alphabetically
            return nodes.sort((a, b) => {
                if (a.type !== b.type)
                    return a.type === 'folder' ? -1 : 1;
                return a.name.localeCompare(b.name);
            });
        }
        catch (error) {
            console.error('Error reading directory:', error);
            return [];
        }
    }
    /**
     * Read file content
     */
    async readFile(filePath) {
        const fullPath = path_1.default.join(this.workspaceRoot, filePath);
        // Security: Prevent path traversal
        const normalizedPath = path_1.default.normalize(fullPath);
        if (!normalizedPath.startsWith(this.workspaceRoot)) {
            throw new Error('Access denied: Path traversal detected');
        }
        const content = await promises_1.default.readFile(fullPath, 'utf-8');
        const language = this.getLanguageFromPath(filePath);
        return {
            path: filePath,
            content,
            language,
        };
    }
    /**
     * Write file content
     */
    async writeFile(filePath, content) {
        const fullPath = path_1.default.join(this.workspaceRoot, filePath);
        const normalizedPath = path_1.default.normalize(fullPath);
        if (!normalizedPath.startsWith(this.workspaceRoot)) {
            throw new Error('Access denied: Path traversal detected');
        }
        // Ensure parent directory exists
        await promises_1.default.mkdir(path_1.default.dirname(fullPath), { recursive: true });
        await promises_1.default.writeFile(fullPath, content, 'utf-8');
    }
    /**
     * Write binary buffer to file
     */
    async writeBuffer(filePath, buffer) {
        const fullPath = path_1.default.join(this.workspaceRoot, filePath);
        const normalizedPath = path_1.default.normalize(fullPath);
        if (!normalizedPath.startsWith(this.workspaceRoot)) {
            throw new Error('Access denied: Path traversal detected');
        }
        // Ensure parent directory exists
        await promises_1.default.mkdir(path_1.default.dirname(fullPath), { recursive: true });
        await promises_1.default.writeFile(fullPath, buffer);
    }
    /**
     * Create a new file
     */
    async createFile(filePath) {
        await this.writeFile(filePath, '');
    }
    /**
     * Create a new folder
     */
    async createFolder(folderPath) {
        const fullPath = path_1.default.join(this.workspaceRoot, folderPath);
        const normalizedPath = path_1.default.normalize(fullPath);
        if (!normalizedPath.startsWith(this.workspaceRoot)) {
            throw new Error('Access denied: Path traversal detected');
        }
        await promises_1.default.mkdir(fullPath, { recursive: true });
    }
    /**
     * Delete a file or folder
     */
    async delete(itemPath) {
        const fullPath = path_1.default.join(this.workspaceRoot, itemPath);
        const normalizedPath = path_1.default.normalize(fullPath);
        if (!normalizedPath.startsWith(this.workspaceRoot)) {
            throw new Error('Access denied: Path traversal detected');
        }
        const stat = await promises_1.default.stat(fullPath);
        if (stat.isDirectory()) {
            await promises_1.default.rm(fullPath, { recursive: true });
        }
        else {
            await promises_1.default.unlink(fullPath);
        }
    }
    /**
     * Get language identifier from file path
     */
    getLanguageFromPath(filePath) {
        const ext = path_1.default.extname(filePath).toLowerCase();
        const languageMap = {
            '.ts': 'typescript',
            '.tsx': 'typescriptreact',
            '.js': 'javascript',
            '.jsx': 'javascriptreact',
            '.json': 'json',
            '.css': 'css',
            '.scss': 'scss',
            '.html': 'html',
            '.md': 'markdown',
            '.py': 'python',
            '.java': 'java',
            '.c': 'c',
            '.cpp': 'cpp',
            '.h': 'c',
            '.hpp': 'cpp',
            '.xml': 'xml',
            '.yaml': 'yaml',
            '.yml': 'yaml',
            '.sh': 'shellscript',
            '.bash': 'shellscript',
        };
        return languageMap[ext] || 'plaintext';
    }
}
exports.FileSystemService = FileSystemService;
// Factory function to create service for specific project
function createFileSystemService(projectRoot) {
    return new FileSystemService(projectRoot);
}
