interface GitHubRepo {
    id: number;
    name: string;
    full_name: string;
    description: string | null;
    private: boolean;
    html_url: string;
    clone_url: string;
    default_branch: string;
    language: string | null;
    updated_at: string;
}
export declare function listUserRepos(githubToken: string): Promise<GitHubRepo[]>;
export declare function getRepo(githubToken: string, owner: string, repo: string): Promise<GitHubRepo>;
export declare function createRepo(githubToken: string, name: string, description?: string, isPrivate?: boolean): Promise<GitHubRepo>;
export {};
