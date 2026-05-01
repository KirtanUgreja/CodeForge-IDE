"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { useIdeStore } from "@/store/ide-store";
import { Terminal, Code2, Wifi, Save, LogOut, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

import FileExplorer from "@/components/ide/FileExplorer";
import CodeEditor from "@/components/ide/CodeEditor";
import TerminalPanel from "@/components/ide/TerminalPanel";
import AddCollaboratorModal from "@/components/ide/AddCollaboratorModal";
import OnlineCollaborators from "@/components/ide/OnlineCollaborators";
import AiAssistant from "@/components/ide/AiAssistant";
import { Sparkles } from "lucide-react";

export default function IdeLayout() {
    const { 
        isSidebarOpen, 
        isTerminalOpen, 
        toggleTerminal, 
        saveToGithub, 
        projectId, 
        collabProvider,
        isAiOpen,
        toggleAi
    } = useIdeStore();
    const router = useRouter();

    // Panel sizes as percentages
    const [sidebarWidth, setSidebarWidth] = useState(20);
    const [terminalHeight, setTerminalHeight] = useState(30);
    const [isSaving, setIsSaving] = useState(false);
    const [showCollabModal, setShowCollabModal] = useState(false);
    const authTokenRef = useRef<string | null>(null);
    const providerTokenRef = useRef<string | null>(null);

    // Get session on mount
    useEffect(() => {
        const supabase = createClient();
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.access_token) {
                authTokenRef.current = session.access_token;
                providerTokenRef.current = session.provider_token || null;
            }
        });
    }, []);

    // Refs for drag handling
    const isDraggingSidebar = useRef(false);
    const isDraggingTerminal = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const lastSaveRef = useRef<number>(0);

    // Auto-save on exit
    useEffect(() => {
        const triggerAutoSave = () => {
            const now = Date.now();
            if (now - lastSaveRef.current < 5000) return; // Debounce 5s

            if (projectId && authTokenRef.current) {
                lastSaveRef.current = now;
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';
                fetch(`${apiUrl}/api/projects/${projectId}/save`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authTokenRef.current}`,
                        'X-GitHub-Token': providerTokenRef.current || ''
                    },
                    body: JSON.stringify({
                        branchName: 'autosave', // Fixed branch as requested
                        message: 'Automatic save on exit'
                    }),
                    keepalive: true
                });
            }
        };

        const handleBeforeUnload = () => {
            triggerAutoSave();
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                triggerAutoSave();
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [projectId]);

    const handleSaveAndExit = async () => {
        if (!providerTokenRef.current) {
            const proceed = confirm("GitHub session expired or not found. We will try using the saved repository credentials, but this might fail. We recommend logging in again if it fails. Proceed anyway?");
            if (!proceed) return;
        }

        const branchName = prompt("Enter branch name (leave empty for automatic name):");
        if (branchName === null) return; // Cancelled

        setIsSaving(true);
        const result = await saveToGithub(branchName || undefined);

        if (result.success) {
            alert(`✅ Changes saved successfully to branch: ${result.branch}`);
            router.push('/dashboard');
        } else {
            // Show more detailed error message if available
            const detailedError = result.error || "Unknown error";
            alert(`⚠️ Failed to save: ${detailedError}\n\nTip: If it's an authentication error, try logging out and back in to refresh your GitHub token.`);
            setIsSaving(false);
        }
    };

    // Store handlers in refs - updated in effect
    const handlersRef = useRef({
        handleMouseMove: (e: MouseEvent) => { },
        handleMouseUp: () => { }
    });

    // Set up handlers in effect to avoid ref access during render
    useEffect(() => {
        handlersRef.current.handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;

            const rect = containerRef.current.getBoundingClientRect();

            if (isDraggingSidebar.current) {
                const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
                setSidebarWidth(Math.max(10, Math.min(80, newWidth)));
            }

            if (isDraggingTerminal.current) {
                const mainAreaHeight = rect.height;
                const terminalTop = e.clientY - rect.top;
                const newHeight = ((mainAreaHeight - terminalTop) / mainAreaHeight) * 100;
                setTerminalHeight(Math.max(10, Math.min(80, newHeight)));
            }
        };

        handlersRef.current.handleMouseUp = () => {
            isDraggingSidebar.current = false;
            isDraggingTerminal.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            window.removeEventListener('mousemove', handlersRef.current.handleMouseMove);
            window.removeEventListener('mouseup', handlersRef.current.handleMouseUp);
        };

        // Cleanup on unmount
        return () => {
            window.removeEventListener('mousemove', handlersRef.current.handleMouseMove);
            window.removeEventListener('mouseup', handlersRef.current.handleMouseUp);
        }
    }, []);

    // Start sidebar drag
    const startSidebarDrag = (e: React.MouseEvent) => {
        e.preventDefault();
        isDraggingSidebar.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        window.addEventListener('mousemove', handlersRef.current.handleMouseMove);
        window.addEventListener('mouseup', handlersRef.current.handleMouseUp);
    };

    // Start terminal drag
    const startTerminalDrag = (e: React.MouseEvent) => {
        e.preventDefault();
        isDraggingTerminal.current = true;
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';
        window.addEventListener('mousemove', handlersRef.current.handleMouseMove);
        window.addEventListener('mouseup', handlersRef.current.handleMouseUp);
    };

    return (
        <div ref={containerRef} className="h-screen w-full bg-background-dark text-foreground overflow-hidden flex flex-col font-sans">
            {/* Background Decorations */}
            <div className="absolute inset-0 bg-grid opacity-[0.02] pointer-events-none"></div>

            {/* Top Navigation Bar */}
            <header className="h-12 bg-surface-dark border-b border-white/5 flex items-center justify-between px-4 z-40 relative backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center text-primary">
                            <Code2 className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold text-white tracking-tight">Code Forge Hub</span>
                    </div>
                    <div className="h-4 w-[1px] bg-white/10"></div>
                    <span className="text-xs text-slate-400 font-mono">Project: {projectId?.slice(0, 8) || 'Unknown'}</span>
                </div>

                <div className="flex items-center gap-3">
                    {/* Online Collaborators */}
                    {collabProvider && <OnlineCollaborators provider={collabProvider} />}

                    {/* Add Collaborator Button */}
                    <motion.button
                        onClick={() => setShowCollabModal(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-600/30 hover:border-emerald-500/30 transition-all"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        title="Invite Collaborator"
                    >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Invite</span>
                    </motion.button>

                    <motion.button
                        onClick={toggleAi}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                            isAiOpen 
                                ? "bg-primary text-white shadow-lg shadow-primary/20" 
                                : "bg-white/5 text-slate-300 border border-white/5 hover:bg-white/10"
                        )}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        title="AI Assistant"
                    >
                        <Sparkles className={cn("w-3.5 h-3.5", isAiOpen && "animate-pulse")} />
                        <span className="hidden lg:inline">AI Assistant</span>
                    </motion.button>

                    <motion.button
                        onClick={handleSaveAndExit}
                        disabled={isSaving}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                            "bg-primary hover:bg-accent-blue text-white shadow-lg shadow-primary/20",
                            "disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        {isSaving ? (
                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <Save className="w-3 h-3" />
                        )}
                        <span>Save & Exit</span>
                    </motion.button>

                    <button
                        onClick={() => router.push('/dashboard')}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-white/10"
                        title="Back to Dashboard"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </header>

            {/* Add Collaborator Modal */}
            <AddCollaboratorModal isOpen={showCollabModal} onClose={() => setShowCollabModal(false)} />

            <div className="flex-1 flex overflow-hidden relative z-10">
                {/* Sidebar */}
                {isSidebarOpen && (
                    <>
                        <div
                            className="h-full bg-surface-dark/95 border-r border-white/5 overflow-hidden backdrop-blur-sm"
                            style={{ width: `${sidebarWidth}%` }}
                        >
                            <FileExplorer />
                        </div>

                        {/* Sidebar Resize Handle */}
                        <div
                            className="w-1 h-full bg-transparent hover:bg-primary/50 active:bg-primary cursor-col-resize transition-colors flex-shrink-0 z-20"
                            onMouseDown={startSidebarDrag}
                        />
                    </>
                )}

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col overflow-hidden bg-background-dark/50">
                    {/* Editor */}
                    <div
                        className="overflow-hidden relative"
                        style={{ height: isTerminalOpen ? `${100 - terminalHeight}%` : '100%' }}
                    >
                        <CodeEditor />
                    </div>

                    {/* Terminal */}
                    {isTerminalOpen && (
                        <>
                            {/* Terminal Resize Handle */}
                            <div
                                className="h-1 w-full bg-white/5 hover:bg-primary/50 active:bg-primary cursor-row-resize transition-colors flex-shrink-0 z-20"
                                onMouseDown={startTerminalDrag}
                            />

                            <div
                                className="overflow-hidden bg-surface-dark border-t border-white/5 shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.5)]"
                                style={{ height: `${terminalHeight}%` }}
                            >
                                <TerminalPanel />
                            </div>
                        </>
                    )}
                </div>

                {/* AI Assistant Sidebar */}
                {isAiOpen && (
                    <motion.div 
                        initial={{ x: 300, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 300, opacity: 0 }}
                        className="w-80 h-full flex-shrink-0"
                    >
                        <AiAssistant />
                    </motion.div>
                )}
            </div>

            {/* Status Bar */}
            <div className="h-7 bg-surface-dark border-t border-white/5 flex items-center px-4 text-[11px] text-slate-400 select-none justify-between flex-shrink-0 z-30 font-mono backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        <span className="font-bold">Code Forge Hub</span>
                    </span>

                    {/* Terminal Toggle Button */}
                    <button
                        onClick={toggleTerminal}
                        className={cn(
                            "flex items-center gap-1.5 px-2 py-0.5 rounded transition-all duration-200 border",
                            isTerminalOpen
                                ? "bg-white/5 text-white border-white/10"
                                : "text-slate-500 hover:text-white border-transparent hover:bg-white/5"
                        )}
                        title={isTerminalOpen ? "Close Terminal" : "Open Terminal"}
                    >
                        <Terminal className="w-3 h-3" />
                        <span>Terminal</span>
                    </button>

                    <span className="h-3 w-[1px] bg-white/10 mx-1"></span>

                    <span className="flex items-center gap-1.5 text-slate-500">
                        <Code2 className="w-3 h-3" />
                        main*
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-neon animate-pulse"></span>
                        <span className="text-slate-300">Ready</span>
                    </span>
                    <div className="h-3 w-[1px] bg-white/10"></div>
                    <span className="text-slate-500">Ln 1, Col 1</span>
                    <span className="text-slate-500">UTF-8</span>
                    <span className="text-primary font-medium">TypeScript</span>
                </div>
            </div>
        </div>
    );
}
