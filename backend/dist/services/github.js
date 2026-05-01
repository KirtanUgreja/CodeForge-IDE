"use strict";
// GitHub API Service
// Uses the user's GitHub OAuth token to interact with GitHub API
Object.defineProperty(exports, "__esModule", { value: true });
exports.listUserRepos = listUserRepos;
exports.getRepo = getRepo;
exports.createRepo = createRepo;
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
    const response = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'CodeBlocking-IDE'
        },
        body: JSON.stringify({
            name,
            description,
            private: isPrivate,
            auto_init: false // We will push our own files
        })
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `GitHub API error: ${response.status}`);
    }
    return await response.json();
}
