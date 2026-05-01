// API client for communicating with the backend

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

interface FileNode {
    id: string;
    name: string;
    type: 'file' | 'folder';
    path: string;
    children?: FileNode[];
}

interface FileContent {
    path: string;
    content: string;
    language: string;
}

class ApiClient {
    private baseUrl: string;
    private authToken: string | null = null;
    private githubToken: string | null = null;

    constructor(baseUrl: string = API_BASE) {
        this.baseUrl = baseUrl;
    }

    setAuthToken(token: string | null): void {
        this.authToken = token;
    }

    setGithubToken(token: string | null): void {
        this.githubToken = token;
    }

    private async fetch<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                ...options?.headers as Record<string, string>,
            };

            if (this.authToken) {
                headers['Authorization'] = `Bearer ${this.authToken}`;
            }

            if (this.githubToken) {
                headers['X-GitHub-Token'] = this.githubToken;
            }

            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                ...options,
                headers,
            });

            const text = await response.text();
            let data: any;
            try {
                data = JSON.parse(text);
            } catch (e) {
                return {
                    success: response.ok,
                    error: response.ok ? undefined : (response.statusText || 'Server Error'),
                    message: text.slice(0, 100)
                };
            }

            if (!response.ok) {
                const errorStr = data.error ? (typeof data.error === 'string' ? data.error : JSON.stringify(data.error)) : (response.statusText || 'Unknown Error');
                const messageStr = typeof data.details === 'string' ? data.details : (typeof data.message === 'string' ? data.message : '');

                return {
                    success: false,
                    error: errorStr,
                    message: messageStr
                };
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            return { success: false, error: 'Network Connection Error' };
        }
    }

    // File System API (project-specific)

    async getFileTree(projectId: string): Promise<ApiResponse<FileNode[]>> {
        return this.fetch<FileNode[]>(`/api/files/tree/${projectId}`);
    }

    async readFile(projectId: string, path: string): Promise<ApiResponse<FileContent>> {
        return this.fetch<FileContent>(`/api/files/${projectId}/read?path=${encodeURIComponent(path)}`);
    }

    async writeFile(projectId: string, path: string, content: string): Promise<ApiResponse<void>> {
        return this.fetch<void>(`/api/files/${projectId}/write`, {
            method: 'POST',
            body: JSON.stringify({ path, content }),
        });
    }

    async createFile(projectId: string, path: string): Promise<ApiResponse<void>> {
        return this.fetch<void>(`/api/files/${projectId}/create`, {
            method: 'POST',
            body: JSON.stringify({ path, type: 'file' }),
        });
    }

    async createFolder(projectId: string, path: string): Promise<ApiResponse<void>> {
        return this.fetch<void>(`/api/files/${projectId}/create`, {
            method: 'POST',
            body: JSON.stringify({ path, type: 'folder' }),
        });
    }

    async deleteItem(projectId: string, path: string): Promise<ApiResponse<void>> {
        return this.fetch<void>(`/api/files/${projectId}/delete?path=${encodeURIComponent(path)}`, {
            method: 'DELETE',
        });
    }

    async uploadFile(projectId: string, dirPath: string, file: File): Promise<ApiResponse<void>> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', dirPath);

        // We use raw fetch here because this.fetch expects JSON headers
        try {
            const headers: Record<string, string> = {};
            if (this.authToken) {
                headers['Authorization'] = `Bearer ${this.authToken}`;
            }

            const response = await fetch(`${this.baseUrl}/api/files/${projectId}/upload`, {
                method: 'POST',
                headers,
                body: formData,
            });
            return await response.json();
        } catch (error) {
            console.error('Upload Error:', error);
            return { success: false, error: 'Upload failed' };
        }
    }

    async importProject(name: string, environment: string, isPrivate: boolean, files: File[]): Promise<ApiResponse<any>> {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('environment', environment);
        formData.append('isPrivate', String(isPrivate));

        for (const file of files) {
            // Use webkitRelativePath if available, otherwise just name
            // Note: webkitRelativePath is often what we want for folder upload
            const relativePath = (file as any).webkitRelativePath || file.name;
            formData.append('files', file, relativePath);
        }

        try {
            const headers: Record<string, string> = {};
            if (this.authToken) {
                headers['Authorization'] = `Bearer ${this.authToken}`;
            }
            if (this.githubToken) {
                headers['X-GitHub-Token'] = this.githubToken;
            }

            const response = await fetch(`${this.baseUrl}/api/projects/import`, {
                method: 'POST',
                headers,
                body: formData,
            });
            const data = await response.json();
            if (!response.ok) {
                return {
                    success: false,
                    error: data.error || 'Import failed',
                    message: data.details || ''
                };
            }
            return { success: true, data };
        } catch (error: any) {
            console.error('Import Error:', error);
            return { success: false, error: error.message || 'Import failed' };
        }
    }

    async saveToGithub(projectId: string, branchName?: string, message?: string): Promise<ApiResponse<{ branch: string }>> {
        return this.fetch<{ branch: string }>(`/api/projects/${projectId}/save`, {
            method: 'POST',
            body: JSON.stringify({ branchName, message }),
        });
    }

    // Health check
    async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string; terminals: number }>> {
        return this.fetch('/api/health');
    }
}

export const api = new ApiClient();
export type { FileNode, FileContent, ApiResponse };
