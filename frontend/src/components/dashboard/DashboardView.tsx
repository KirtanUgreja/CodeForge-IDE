'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Terminal, Laptop, FolderUp, Check, AlertCircle, Loader2, X } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001'

interface Project {
    id: string
    name: string
    repo_url: string
    repo_full_name: string
    environment: string
    is_private: boolean
    created_at: string
    last_opened: string
}

interface GitHubRepo {
    id: number
    name: string
    fullName: string
    description: string | null
    isPrivate: boolean
    htmlUrl: string
    cloneUrl: string
    language: string | null
    updatedAt: string
}

interface DashboardViewProps {
    user: User
}

export default function DashboardView({ user }: DashboardViewProps) {
    const router = useRouter()
    const [projects, setProjects] = useState<Project[]>([])
    const [repos, setRepos] = useState<GitHubRepo[]>([])
    const [loading, setLoading] = useState(true)
    const [showImportModal, setShowImportModal] = useState(false)
    const [showNewProjectModal, setShowNewProjectModal] = useState(false)
    const [showLocalImportModal, setShowLocalImportModal] = useState(false)
    const [importLoading, setImportLoading] = useState(false)
    const [importProgress, setImportProgress] = useState('')

    // For local import
    const [localFiles, setLocalFiles] = useState<File[]>([])
    const [localProjectName, setLocalProjectName] = useState('')
    const [localProjectEnv, setLocalProjectEnv] = useState('base')
    const [localProjectPrivate, setLocalProjectPrivate] = useState(false)
    const folderInputRef = useRef<HTMLInputElement>(null)

    const [loadingRepos, setLoadingRepos] = useState(false)
    const [importing, setImporting] = useState<string | null>(null)
    const [creating, setCreating] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [newRepoName, setNewRepoName] = useState('')
    const [newRepoDescription, setNewRepoDescription] = useState('')
    const [newRepoPrivate, setNewRepoPrivate] = useState(false)
    const [newRepoEnvironment, setNewRepoEnvironment] = useState('base')

    const avatarUrl = user.user_metadata?.avatar_url
    const username = user.user_metadata?.user_name || user.user_metadata?.preferred_username || user.email?.split('@')[0]
    const fullName = user.user_metadata?.full_name || username

    const getTokens = async () => {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        return {
            accessToken: session?.access_token,
            providerToken: session?.provider_token
        }
    }

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const { accessToken } = await getTokens()
                if (!accessToken) return

                const res = await fetch(`${API_URL}/api/projects`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                })

                if (res.ok) {
                    const data = await res.json()
                    setProjects(data.projects || [])
                }
            } catch (error) {
                console.error('Error fetching projects:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchProjects()
    }, [])

    const fetchRepos = async () => {
        setLoadingRepos(true)
        try {
            const { accessToken, providerToken } = await getTokens()
            if (!accessToken) return

            const res = await fetch(`${API_URL}/api/github/repos`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'X-GitHub-Token': providerToken || ''
                }
            })

            if (res.ok) {
                const data = await res.json()
                setRepos(data.repos || [])
            }
        } catch (error) {
            console.error('Error fetching repos:', error)
        } finally {
            setLoadingRepos(false)
        }
    }

    const handleOpenImport = () => {
        setShowImportModal(true)
        if (repos.length === 0) {
            fetchRepos()
        }
    }

    const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const fileList = Array.from(files);
        setLocalFiles(fileList);

        // Auto-create project name from folder name
        // webkitRelativePath is like "folder/file.js"
        const folderName = fileList[0].webkitRelativePath?.split('/')[0] || 'my-project';
        setLocalProjectName(folderName);
        setShowLocalImportModal(true);
    };

    const handleLocalImport = async () => {
        if (!localProjectName) return;

        setImportLoading(true);
        setImportProgress('Creating GitHub repository...');

        try {
            const { api } = await import('@/lib/api');
            const { accessToken, providerToken } = await getTokens();

            if (!accessToken) {
                alert('Authentication required. Please log in again.');
                setImportLoading(false);
                return;
            }

            api.setAuthToken(accessToken);
            api.setGithubToken(providerToken || null);

            const response = await api.importProject(
                localProjectName,
                localProjectEnv,
                localProjectPrivate,
                localFiles
            );

            if (response.success) {
                setImportProgress('Project imported successfully!');
                setTimeout(() => {
                    setShowLocalImportModal(false);
                    window.location.reload();
                }, 1500);
            } else {
                alert(`Import failed: ${response.error || 'Unknown error'}`);
                setImportProgress('');
                setImportLoading(false);
            }
        } catch (error: any) {
            console.error('Import error:', error);
            alert(`Import error: ${error.message}`);
            setImportLoading(false);
        }
    };

    const handleFolderUploadClick = () => {
        if (folderInputRef.current) {
            folderInputRef.current.click();
        }
    };

    const handleImportRepo = async (repo: GitHubRepo) => {
        setImporting(repo.fullName)
        try {
            const { accessToken, providerToken } = await getTokens()
            if (!accessToken) return

            const res = await fetch(`${API_URL}/api/projects`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'X-GitHub-Token': providerToken || '',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    repoUrl: repo.cloneUrl,
                    repoFullName: repo.fullName,
                    name: repo.name,
                    isPrivate: repo.isPrivate
                })
            })

            if (res.ok) {
                const data = await res.json()
                setProjects(prev => [data.project, ...prev])
                setShowImportModal(false)
            } else {
                const errorData = await res.json().catch(() => ({}))
                console.error('Failed to import repo', errorData)
                alert(`Failed to import repo: ${errorData.error || 'Unknown error'}`)
            }
        } catch (error) {
            console.error('Error importing repo:', error)
        } finally {
            setImporting(null)
        }
    }

    const handleDeleteProject = async (projectId: string) => {
        if (!confirm('Are you sure you want to delete this project?')) return

        try {
            const { accessToken } = await getTokens()
            if (!accessToken) return

            const res = await fetch(`${API_URL}/api/projects/${projectId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${accessToken}` }
            })

            if (res.ok) {
                setProjects(prev => prev.filter(p => p.id !== projectId))
            }
        } catch (error) {
            console.error('Error deleting project:', error)
        }
    }

    const handleCreateRepo = async () => {
        if (!newRepoName.trim()) return
        setCreating(true)
        try {
            const { accessToken, providerToken } = await getTokens()
            if (!accessToken || !providerToken) {
                alert('Authentication required. Please log in again.')
                return
            }

            const createRes = await fetch('https://api.github.com/user/repos', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${providerToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: newRepoName.trim(),
                    description: newRepoDescription,
                    private: newRepoPrivate,
                    auto_init: true
                })
            })

            if (!createRes.ok) {
                const error = await createRes.json()
                alert(`Failed to create repo: ${error.message || 'Unknown error'}`)
                return
            }

            const newRepo = await createRes.json()

            const res = await fetch(`${API_URL}/api/projects`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'X-GitHub-Token': providerToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    repoUrl: newRepo.clone_url,
                    repoFullName: newRepo.full_name,
                    name: newRepo.name,
                    isPrivate: newRepo.private,
                    environment: newRepoEnvironment
                })
            })

            if (res.ok) {
                const data = await res.json()
                setProjects(prev => [data.project, ...prev])
                setShowNewProjectModal(false)
                setNewRepoName('')
                setNewRepoDescription('')
                setNewRepoPrivate(false)
                setNewRepoEnvironment('base')
                router.push(`/ide/${data.project.id}`)
            }
        } catch (error) {
            console.error('Error creating repo:', error)
            alert(`Error creating repo: ${error instanceof Error ? error.message : 'Unknown error'}`)
        } finally {
            setCreating(false)
        }
    }

    const handleLogout = async () => {
        const supabase = createClient()
        const { data: sessionData } = await supabase.auth.getSession()
        const session = sessionData?.session

        if (session) {
            // Trigger auto-save for all projects currently in state 
            // This is a "best effort" before logout
            console.log('Triggering bulk auto-save before logout...')

            try {
                // We map through projects that have been recently opened.
                // We'll trigger save for the top 5 most recent ones to be safe and fast.
                const recentlyOpened = projects.slice(0, 5)

                await Promise.all(recentlyOpened.map(project =>
                    fetch(`${API_URL}/api/projects/${project.id}/save`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session.access_token}`,
                            'X-GitHub-Token': session.provider_token || ''
                        },
                        body: JSON.stringify({
                            branchName: 'autosave',
                            message: 'Automatic save before logout'
                        })
                    }).catch(err => console.error(`Failed to auto-save project ${project.id}`, err))
                ))
            } catch (error) {
                console.error('Error during bulk auto-save:', error)
            }
        }

        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    const filteredRepos = repos.filter(repo =>
        repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        repo.fullName.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const EnvironmentBadge = ({ env }: { env: string }) => {
        const colors: Record<string, string> = {
            python: 'bg-[#ffbd2e]/20 text-[#ffbd2e] border-[#ffbd2e]/30',
            node: 'bg-[#39ff14]/20 text-[#39ff14] border-[#39ff14]/30',
            java: 'bg-[#ff7b72]/20 text-[#ff7b72] border-[#ff7b72]/30',
            go: 'bg-[#00add8]/20 text-[#00add8] border-[#00add8]/30',
            rust: 'bg-[#dea584]/20 text-[#dea584] border-[#dea584]/30',
            cpp: 'bg-[#00599c]/20 text-[#00599c] border-[#00599c]/30',
            php: 'bg-[#4f5b93]/20 text-[#4f5b93] border-[#4f5b93]/30',
            ruby: 'bg-[#cc342d]/20 text-[#cc342d] border-[#cc342d]/30',
            base: 'bg-slate-500/20 text-slate-300 border-slate-500/30'
        }
        return (
            <span className={`px-2 py-0.5 text-xs rounded-full border ${colors[env] || colors.base}`}>
                {env}
            </span>
        )
    }

    return (
        <div className="min-h-screen bg-background-dark font-sans text-foreground relative overflow-hidden">
            {/* Background Decorations matching Landing Page */}
            <div className="absolute inset-0 bg-grid opacity-[0.03] pointer-events-none"></div>
            <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-accent-blue/10 blur-[120px] rounded-full pointer-events-none"></div>
            <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-accent-purple/5 blur-[100px] rounded-full pointer-events-none"></div>

            {/* Navbar */}
            <nav className="border-b border-white/5 bg-surface-dark/80 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                                <Terminal className="w-5 h-5" />
                            </div>
                            <span className="text-lg font-bold font-display tracking-tight text-white">Code Forge Hub</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-xs text-slate-400">
                                <span className="w-2 h-2 rounded-full bg-accent-neon animate-pulse"></span>
                                <span>v1.0.0</span>
                            </div>
                            <div className="flex items-center gap-3 pl-4 border-l border-white/5">
                                <div className="hidden sm:block text-right">
                                    <p className="text-sm font-medium text-white">{fullName}</p>
                                    <p className="text-xs text-slate-400">@{username}</p>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-accent-purple to-accent-blue p-[1px]">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt={username} className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full rounded-full bg-surface-dark flex items-center justify-center">
                                            <span className="text-xs font-bold text-white">
                                                {user?.email?.[0].toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <motion.button
                                    onClick={handleLogout}
                                    className="p-2 text-slate-400 hover:text-white transition-colors"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                </motion.button>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                {/* Header Section */}
                <motion.div
                    className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <div>
                        <h1 className="text-3xl font-bold text-white font-display mb-2">My Projects</h1>
                        <p className="text-slate-400">Manage and deploy your cloud environments.</p>
                    </div>
                    <div className="flex gap-4">
                        <input
                            type="file"
                            ref={folderInputRef}
                            className="hidden"
                            {...({ webkitdirectory: "", directory: "" } as any)}
                            onChange={handleFolderSelect}
                        />
                        <motion.button
                            onClick={handleFolderUploadClick}
                            className="flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg transition-all text-sm font-medium"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Laptop className="w-5 h-5 opacity-70" />
                            Import from PC
                        </motion.button>
                        <motion.button
                            onClick={handleOpenImport}
                            className="flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg transition-all text-sm font-medium"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Import Repository
                        </motion.button>
                        <motion.button
                            onClick={() => setShowNewProjectModal(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-accent-blue text-white rounded-lg shadow-lg shadow-primary/25 transition-all text-sm font-medium animate-pulse-glow"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            New Project
                        </motion.button>
                    </div>
                </motion.div>

                {/* Projects Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                >
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <motion.div
                                className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            />
                            <p className="text-slate-500 font-mono text-sm">Loading projects...</p>
                        </div>
                    ) : projects.length === 0 ? (
                        <div className="glass-card rounded-2xl p-16 text-center border-dashed border-2 border-white/5 bg-transparent">
                            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white/5 flex items-center justify-center">
                                <Terminal className="w-10 h-10 text-slate-600" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2 font-display">No projects yet</h3>
                            <p className="text-slate-400 mb-8 max-w-md mx-auto">Start by creating a new project or importing an existing repository from your GitHub account.</p>
                            <motion.button
                                onClick={() => setShowNewProjectModal(true)}
                                className="px-8 py-3 bg-white text-black font-bold rounded-lg hover:bg-slate-200 transition-colors inline-flex items-center gap-2"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Create Your First Project
                            </motion.button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {projects.map((project, index) => (
                                <motion.div
                                    key={project.id}
                                    className="group glass-card rounded-xl p-6 hover:border-primary/50 transition-all duration-300 relative overflow-hidden"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4, delay: index * 0.1 }}
                                    whileHover={{ y: -5 }}
                                    onClick={() => router.push(`/ide/${project.id}`)}
                                >
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full group-hover:bg-primary/10 transition-colors"></div>

                                    <div className="relative z-10">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="w-12 h-12 rounded-lg bg-background-dark border border-white/5 flex items-center justify-center text-2xl shadow-inner">
                                                {project.environment === 'python' ? '🐍' :
                                                    project.environment === 'node' ? '⬢' :
                                                        project.environment === 'java' ? '☕' :
                                                            project.environment === 'go' ? '🐹' :
                                                                project.environment === 'rust' ? '🦀' :
                                                                    project.environment === 'cpp' ? '💎' :
                                                                        project.environment === 'php' ? '🐘' :
                                                                            project.environment === 'ruby' ? '💎' : '📦'}
                                            </div>
                                            <EnvironmentBadge env={project.environment} />
                                        </div>

                                        <h3 className="text-lg font-bold text-white mb-1 group-hover:text-primary transition-colors font-display truncate">
                                            {project.name}
                                        </h3>
                                        <p className="text-xs text-slate-500 mb-4 truncate font-mono">
                                            {project.repo_full_name}
                                        </p>

                                        <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-2">
                                            <span className="text-xs text-slate-500">
                                                Active {new Date(project.last_opened).toLocaleDateString()}
                                            </span>
                                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={() => router.push(`/ide/${project.id}`)}
                                                    className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                                    title="Open IDE"
                                                >
                                                    <Terminal className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteProject(project.id)}
                                                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    title="Delete Project"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </motion.div>
            </main>

            {/* Import Modal */}
            <AnimatePresence>
                {showImportModal && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowImportModal(false)}
                    >
                        <motion.div
                            className="w-full max-w-2xl glass-panel bg-[#0D1117] rounded-2xl shadow-2xl overflow-hidden border border-white/10"
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between p-6 border-b border-white/10">
                                <h2 className="text-xl font-bold text-white font-display">Import from GitHub</h2>
                                <button
                                    onClick={() => setShowImportModal(false)}
                                    className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="p-4 border-b border-white/10 bg-white/2">
                                <div className="relative">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <input
                                        type="text"
                                        placeholder="Search repositories..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-[#010409] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div className="max-h-[400px] overflow-y-auto p-4 custom-scrollbar">
                                {loadingRepos ? (
                                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                                        <motion.div
                                            className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                        />
                                        <p className="text-sm text-slate-500">Fetching repositories...</p>
                                    </div>
                                ) : filteredRepos.length === 0 ? (
                                    <div className="text-center py-12">
                                        <p className="text-slate-500">No repositories found matching "{searchQuery}"</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {filteredRepos.map((repo, index) => (
                                            <motion.button
                                                key={repo.id}
                                                onClick={() => handleImportRepo(repo)}
                                                disabled={importing !== null || projects.some(p => p.repo_full_name === repo.fullName)}
                                                className="w-full flex items-center justify-between p-4 glass-card hover:border-primary/50 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group text-left"
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.03 }}
                                            >
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-bold text-white group-hover:text-primary transition-colors">{repo.name}</span>
                                                        {repo.isPrivate && (
                                                            <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded">private</span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-slate-500 font-mono">{repo.fullName}</p>
                                                    {repo.description && <p className="text-sm text-slate-400 mt-2 line-clamp-1">{repo.description}</p>}
                                                </div>
                                                {importing === repo.fullName ? (
                                                    <motion.div
                                                        className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full"
                                                        animate={{ rotate: 360 }}
                                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                                    />
                                                ) : projects.some(p => p.repo_full_name === repo.fullName) ? (
                                                    <span className="text-xs font-medium text-slate-500 bg-white/5 px-2 py-1 rounded">Imported</span>
                                                ) : (
                                                    <span className="text-sm font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">Import</span>
                                                )}
                                            </motion.button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* New Project Modal */}
            <AnimatePresence>
                {showNewProjectModal && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowNewProjectModal(false)}
                    >
                        <motion.div
                            className="w-full max-w-lg glass-panel bg-[#0D1117] rounded-2xl shadow-2xl overflow-hidden border border-white/10"
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between p-6 border-b border-white/10">
                                <h2 className="text-xl font-bold text-white font-display">Create New Project</h2>
                                <button
                                    onClick={() => setShowNewProjectModal(false)}
                                    className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="p-6 space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Repository Name <span className="text-red-400">*</span></label>
                                    <input
                                        type="text"
                                        value={newRepoName}
                                        onChange={(e) => setNewRepoName(e.target.value)}
                                        placeholder="e.g. my-awesome-project"
                                        className="w-full px-4 py-3 bg-[#010409] border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Description <span className="text-slate-500">(Optional)</span></label>
                                    <input
                                        type="text"
                                        value={newRepoDescription}
                                        onChange={(e) => setNewRepoDescription(e.target.value)}
                                        placeholder="A brief description of your project"
                                        className="w-full px-4 py-3 bg-[#010409] border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div
                                        onClick={() => setNewRepoPrivate(false)}
                                        className={`p-4 rounded-xl border cursor-pointer transition-all ${!newRepoPrivate ? 'bg-primary/10 border-primary/50 ring-1 ring-primary/50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 ${!newRepoPrivate ? 'text-primary' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className={`font-bold ${!newRepoPrivate ? 'text-white' : 'text-slate-300'}`}>Public</span>
                                        </div>
                                        <p className="text-xs text-slate-500">Anyone can see this repository</p>
                                    </div>
                                    <div
                                        onClick={() => setNewRepoPrivate(true)}
                                        className={`p-4 rounded-xl border cursor-pointer transition-all ${newRepoPrivate ? 'bg-primary/10 border-primary/50 ring-1 ring-primary/50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 ${newRepoPrivate ? 'text-primary' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                            <span className={`font-bold ${newRepoPrivate ? 'text-white' : 'text-slate-300'}`}>Private</span>
                                        </div>
                                        <p className="text-xs text-slate-500">You choose who can see this</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Environment</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {[
                                            { id: 'python', label: 'Python', icon: '🐍' },
                                            { id: 'node', label: 'Node', icon: '⬢' },
                                            { id: 'java', label: 'Java', icon: '☕' },
                                            { id: 'go', label: 'Go', icon: '🐹' },
                                            { id: 'rust', label: 'Rust', icon: '🦀' },
                                            { id: 'cpp', label: 'C++', icon: 'C' },
                                            { id: 'php', label: 'PHP', icon: '🐘' },
                                            { id: 'ruby', label: 'Ruby', icon: '💎' },
                                            { id: 'base', label: 'Base', icon: '📦' }
                                        ].map(env => (
                                            <button
                                                key={env.id}
                                                onClick={() => setNewRepoEnvironment(env.id)}
                                                className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-1 ${newRepoEnvironment === env.id
                                                    ? 'bg-primary/10 border-primary/50 ring-1 ring-primary/50 text-white'
                                                    : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                                                    }`}
                                            >
                                                <span className="text-2xl">{env.icon}</span>
                                                <span className="text-xs font-medium">{env.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <motion.button
                                    onClick={handleCreateRepo}
                                    disabled={!newRepoName.trim() || creating}
                                    className="w-full py-4 bg-primary hover:bg-accent-blue text-white font-bold rounded-xl shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4 animate-pulse-glow"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {creating ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            Creating...
                                        </>
                                    ) : (
                                        'Create Repository'
                                    )}
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Local Project Import Modal */}
            <AnimatePresence>
                {showLocalImportModal && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="w-full max-w-lg glass-panel bg-[#0D1117] rounded-2xl shadow-2xl overflow-hidden border border-white/10"
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        >
                            <div className="flex items-center justify-between p-6 border-b border-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/20 rounded-lg">
                                        <FolderUp className="w-5 h-5 text-primary" />
                                    </div>
                                    <h2 className="text-xl font-bold text-white font-display">Import Local Project</h2>
                                </div>
                                <button
                                    onClick={() => !importLoading && setShowLocalImportModal(false)}
                                    className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                    disabled={importLoading}
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
                                    <Check className="w-5 h-5 text-primary mt-0.5" />
                                    <div>
                                        <p className="text-sm text-slate-200 font-medium">
                                            {localFiles.length} files selected
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            We'll create a new GitHub repository and push these files.
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Project Name</label>
                                    <input
                                        type="text"
                                        value={localProjectName}
                                        onChange={(e) => setLocalProjectName(e.target.value)}
                                        placeholder="Project Name"
                                        className="w-full px-4 py-3 bg-[#010409] border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-mono"
                                        disabled={importLoading}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Environment</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { id: 'node', name: 'Node.js', icon: '⬢' },
                                            { id: 'python', name: 'Python', icon: '🐍' },
                                            { id: 'java', name: 'Java', icon: '☕' },
                                            { id: 'base', name: 'Other', icon: '📦' }
                                        ].map((env) => (
                                            <div
                                                key={env.id}
                                                onClick={() => !importLoading && setLocalProjectEnv(env.id)}
                                                className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${localProjectEnv === env.id ? 'bg-primary/10 border-primary/50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                                            >
                                                <span className="text-lg">{env.icon}</span>
                                                <span className="text-sm font-medium text-slate-200">{env.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                                    <div>
                                        <p className="text-sm font-medium text-white flex items-center gap-2">
                                            Private Repository
                                        </p>
                                        <p className="text-xs text-slate-500">Only you can access this repo on GitHub</p>
                                    </div>
                                    <button
                                        onClick={() => !importLoading && setLocalProjectPrivate(!localProjectPrivate)}
                                        className={`w-12 h-6 rounded-full transition-all relative ${localProjectPrivate ? 'bg-primary' : 'bg-slate-700'}`}
                                        disabled={importLoading}
                                    >
                                        <motion.div
                                            className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full"
                                            animate={{ x: localProjectPrivate ? 24 : 0 }}
                                        />
                                    </button>
                                </div>

                                {importLoading && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 text-primary">
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span className="text-sm font-medium">{importProgress}</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full bg-primary"
                                                initial={{ width: "0%" }}
                                                animate={{ width: "100%" }}
                                                transition={{ duration: 15, ease: "linear" }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-6 border-t border-white/10 flex gap-3">
                                <button
                                    onClick={() => setShowLocalImportModal(false)}
                                    className="flex-1 px-4 py-3 bg-white/5 text-slate-300 font-bold rounded-xl hover:bg-white/10 transition-colors"
                                    disabled={importLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleLocalImport}
                                    className="flex-1 px-4 py-3 bg-primary text-white font-bold rounded-xl hover:bg-accent-blue transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                                    disabled={importLoading || !localProjectName}
                                >
                                    {importLoading ? 'Importing...' : 'Start Import'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}