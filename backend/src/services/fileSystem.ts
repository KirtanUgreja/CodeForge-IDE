// File System Service - Handles file operations for the IDE

import fs from 'fs/promises';
import path from 'path';

export interface FileNode {
    id: string;
    name: string;
    type: 'file' | 'folder';
    path: string;
    children?: FileNode[];
}

export interface FileContent {
    path: string;
    content: string;
    language: string;
}

export class FileSystemService {
    private workspaceRoot: string;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
    }

    /**
     * Ensure the workspace directory exists
     */
    async ensureWorkspace(): Promise<void> {
        try {
            await fs.access(this.workspaceRoot);
        } catch {
            await fs.mkdir(this.workspaceRoot, { recursive: true });
        }
    }

    /**
     * Get the full file tree of the workspace
     */
    async getFileTree(dirPath: string = ''): Promise<FileNode[]> {
        const fullPath = path.join(this.workspaceRoot, dirPath);

        try {
            const entries = await fs.readdir(fullPath, { withFileTypes: true });
            const nodes: FileNode[] = [];

            for (const entry of entries) {
                // Skip hidden files, node_modules, __pycache__
                if (entry.name.startsWith('.') ||
                    entry.name === 'node_modules' ||
                    entry.name === '__pycache__' ||
                    entry.name === 'target' ||
                    entry.name === 'build') {
                    continue;
                }

                const relativePath = path.join(dirPath, entry.name);
                const node: FileNode = {
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
                if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
                return a.name.localeCompare(b.name);
            });
        } catch (error) {
            console.error('Error reading directory:', error);
            return [];
        }
    }

    /**
     * Read file content
     */
    async readFile(filePath: string): Promise<FileContent> {
        const fullPath = path.join(this.workspaceRoot, filePath);

        // Security: Prevent path traversal
        const normalizedPath = path.normalize(fullPath);
        if (!normalizedPath.startsWith(this.workspaceRoot)) {
            throw new Error('Access denied: Path traversal detected');
        }

        const content = await fs.readFile(fullPath, 'utf-8');
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
    async writeFile(filePath: string, content: string): Promise<void> {
        const fullPath = path.join(this.workspaceRoot, filePath);

        const normalizedPath = path.normalize(fullPath);
        if (!normalizedPath.startsWith(this.workspaceRoot)) {
            throw new Error('Access denied: Path traversal detected');
        }

        // Ensure parent directory exists
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, content, 'utf-8');
    }

    /**
     * Write binary buffer to file
     */
    async writeBuffer(filePath: string, buffer: Buffer): Promise<void> {
        const fullPath = path.join(this.workspaceRoot, filePath);

        const normalizedPath = path.normalize(fullPath);
        if (!normalizedPath.startsWith(this.workspaceRoot)) {
            throw new Error('Access denied: Path traversal detected');
        }

        // Ensure parent directory exists
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, buffer);
    }

    /**
     * Create a new file
     */
    async createFile(filePath: string): Promise<void> {
        await this.writeFile(filePath, '');
    }

    /**
     * Create a new folder
     */
    async createFolder(folderPath: string): Promise<void> {
        const fullPath = path.join(this.workspaceRoot, folderPath);

        const normalizedPath = path.normalize(fullPath);
        if (!normalizedPath.startsWith(this.workspaceRoot)) {
            throw new Error('Access denied: Path traversal detected');
        }

        await fs.mkdir(fullPath, { recursive: true });
    }

    /**
     * Delete a file or folder
     */
    async delete(itemPath: string): Promise<void> {
        const fullPath = path.join(this.workspaceRoot, itemPath);

        const normalizedPath = path.normalize(fullPath);
        if (!normalizedPath.startsWith(this.workspaceRoot)) {
            throw new Error('Access denied: Path traversal detected');
        }

        const stat = await fs.stat(fullPath);
        if (stat.isDirectory()) {
            await fs.rm(fullPath, { recursive: true });
        } else {
            await fs.unlink(fullPath);
        }
    }

    /**
     * Get language identifier from file path
     */
    private getLanguageFromPath(filePath: string): string {
        const ext = path.extname(filePath).toLowerCase();
        const languageMap: Record<string, string> = {
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

// Factory function to create service for specific project
export function createFileSystemService(projectRoot: string): FileSystemService {
    return new FileSystemService(projectRoot);
}
