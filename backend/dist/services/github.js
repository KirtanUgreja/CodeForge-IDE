"use strict";
// GitHub API Service
// Uses the user's GitHub OAuth token to interact with GitHub API
Object.defineProperty(exports, "__esModule", { value: true });
exports.listUserRepos = listUserRepos;
exports.getRepo = getRepo;
exports.createRepo = createRepo;
function normalizeRepoName(name) {
    return name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9._-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
}
async function listUserRepos(githubToken) {
    const repos = [];
    let page = 1;
    const perPage = 100;
    while (true) {
        const response = await fetch(`https://api.github.com/user/repos?per_page=${perPage}&page=${page}&sort=updated`, {
            headers: {
                'Authorization': `Bearer ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'CodeBlocking-IDE'
            }
        });
        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }
        const pageRepos = await response.json();
        repos.push(...pageRepos);
        // Stop if we got less than perPage (no more repos)
        if (pageRepos.length < perPage)
            break;
        page++;
        // Limit to 500 repos max
        if (repos.length >= 500)
            break;
    }
    return repos;
}
async function getRepo(githubToken, owner, repo) {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'CodeBlocking-IDE'
        }
    });
    if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
    }
    return await response.json();
}
async function createRepo(githubToken, name, description = '', isPrivate = false) {
    const repoName = normalizeRepoName(name);
    if (!repoName) {
        throw new Error('Repository name must contain at least one letter or number');
    }
    const response = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'CodeBlocking-IDE'
        },
        body: JSON.stringify({
            name: repoName,
            description,
            private: isPrivate,
            auto_init: false // We will push our own files
        })
    });
    if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = errorText || `GitHub API error: ${response.status}`;
        try {
            const error = JSON.parse(errorText);
            const details = Array.isArray(error.errors)
                ? error.errors.map((entry) => entry?.message || entry?.code || JSON.stringify(entry)).filter(Boolean).join('; ')
                : '';
            errorMessage = error.message || errorMessage;
            if (details) {
                errorMessage = `${errorMessage}${errorMessage.endsWith('.') ? '' : '.'} ${details}`;
            }
        }
        catch {
            // Fall back to the raw response body when GitHub returns non-JSON payloads.
        }
        throw new Error(errorMessage);
    }
    return await response.json();
}
