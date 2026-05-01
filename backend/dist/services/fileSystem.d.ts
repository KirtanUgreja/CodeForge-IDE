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
export declare class FileSystemService {
    private workspaceRoot;
    constructor(workspaceRoot: string);
    /**
     * Ensure the workspace directory exists
     */
    ensureWorkspace(): Promise<void>;
    /**
     * Get the full file tree of the workspace
     */
    getFileTree(dirPath?: string): Promise<FileNode[]>;
    /**
     * Read file content
     */
    readFile(filePath: string): Promise<FileContent>;
    /**
     * Write file content
     */
    writeFile(filePath: string, content: string): Promise<void>;
    /**
     * Write binary buffer to file
     */
    writeBuffer(filePath: string, buffer: Buffer): Promise<void>;
    /**
     * Create a new file
     */
    createFile(filePath: string): Promise<void>;
    /**
     * Create a new folder
     */
    createFolder(folderPath: string): Promise<void>;
    /**
     * Delete a file or folder
     */
    delete(itemPath: string): Promise<void>;
    /**
     * Get language identifier from file path
     */
    private getLanguageFromPath;
}
export declare function createFileSystemService(projectRoot: string): FileSystemService;
