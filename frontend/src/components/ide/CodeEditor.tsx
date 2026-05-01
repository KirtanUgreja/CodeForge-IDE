"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import Editor, { useMonaco } from "@monaco-editor/react";
import { useIdeStore } from "@/store/ide-store";
import { X, Circle, Save, Check, Loader2, Sparkles, Code2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import * as Y from 'yjs';
import type { WebsocketProvider } from 'y-websocket';
import type { MonacoBinding } from 'y-monaco';

// Detect if user is on Mac
const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
const modKey = isMac ? '⌘' : 'Ctrl';

const TabBar = () => {
    const { openFiles, activeFile, setActiveFile, closeFile, unsavedFiles, fetchFileContent } = useIdeStore();

    if (openFiles.length === 0) return null;

    const handleTabClick = async (fileId: string) => {
        setActiveFile(fileId);
        await fetchFileContent(fileId);
    };

    const getFileName = (path: string) => {
        const parts = path.split('/');
        return parts[parts.length - 1];
    };

    return (
        <div className="flex bg-[#0D1117] border-b border-white/5 overflow-x-auto hide-scrollbar">
            <AnimatePresence>
                {openFiles.map((fileId, index) => (
                    <motion.div
                        key={fileId}
                        onClick={() => handleTabClick(fileId)}
                        className={cn(
                            "group flex items-center min-w-[140px] max-w-[220px] h-10 px-4 border-r border-white/5 text-xs cursor-pointer select-none transition-all duration-200 relative overflow-hidden",
                            activeFile === fileId
                                ? "bg-[#161b22] text-white"
                                : "text-slate-400 hover:bg-[#161b22]/50 hover:text-slate-200"
                        )}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                    >
                        {activeFile === fileId && (
                            <motion.div
                                layoutId="activeTabIndicator"
                                className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-accent-purple to-accent-blue"
                            />
                        )}

                        <div className="flex items-center gap-2.5 flex-1 overflow-hidden z-10 font-mono">
                            <span className={cn(
                                "w-3 h-3 shrink-0",
                                fileId.endsWith('ts') || fileId.endsWith('tsx') ? 'text-accent-blue' :
                                    fileId.endsWith('py') ? 'text-accent-yellow' :
                                        fileId.endsWith('java') ? 'text-accent-red' :
                                            fileId.endsWith('css') ? 'text-accent-cyan' : 'text-slate-400'
                            )}>
                                {fileId.endsWith('tsx') || fileId.endsWith('jsx') ? '⚛' : '#'}
                            </span>
                            <span className="truncate">{getFileName(fileId)}</span>
                        </div>

                        <motion.button
                            onClick={(e) => {
                                e.stopPropagation();
                                closeFile(fileId);
                            }}
                            className={cn(
                                "ml-2 p-0.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all text-slate-400 hover:text-white z-10",
                                unsavedFiles.has(fileId) && "opacity-100"
                            )}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                        >
                            {unsavedFiles.has(fileId) ? (
                                <Circle className="w-2 h-2 fill-current text-primary" />
                            ) : (
                                <X className="w-3 h-3" />
                            )}
                        </motion.button>

                        {/* Tab hover glow */}
                        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};

export default function CodeEditor() {
    const {
        activeFile,
        activeFileContent,
        activeFileLanguage,
        setActiveFileContent,
        saveActiveFile,
        unsavedFiles
    } = useIdeStore();

    const monaco = useMonaco();
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showSaved, setShowSaved] = useState(false);

    const providerRef = useRef<WebsocketProvider | null>(null);
    const bindingRef = useRef<MonacoBinding | null>(null);
    const ydocRef = useRef<Y.Doc | null>(null);
    const editorRef = useRef<any>(null);

    // AI Assistant Code Insertion
    useEffect(() => {
        const handleInsertCode = (e: any) => {
            const editor = editorRef.current;
            if (editor) {
                const text = e.detail.code;
                const model = editor.getModel();
                if (!model) return;

                // Heuristic: If the code starts with imports or is significantly similar in structure to a full file,
                // we treat it as a full file replacement.
                const isFullFile = 
                    (text.includes('import ') && (text.includes('export ') || text.includes('export default'))) ||
                    (text.includes('package ') && text.includes('public class ')) || // Java
                    (text.includes('package main') && text.includes('func main()')); // Go

                if (isFullFile) {
                    console.log("[IDE] Detected full file replacement from AI");
                    const fullRange = model.getFullModelRange();
                    editor.executeEdits("ai-assistant", [{ 
                        range: fullRange, 
                        text: text, 
                        forceMoveMarkers: true 
                    }]);
                } else {
                    console.log("[IDE] Inserting snippet at cursor");
                    const selection = editor.getSelection();
                    editor.executeEdits("ai-assistant", [{ 
                        range: selection, 
                        text: text, 
                        forceMoveMarkers: true 
                    }]);
                }
                editor.focus();
            }
        };
        window.addEventListener('ide:insert-code', handleInsertCode);
        return () => window.removeEventListener('ide:insert-code', handleInsertCode);
    }, []);

    // Safe cleanup helper — suppress harmless Yjs warnings during destroy
    const cleanupCollab = () => {
        const { setCollabProvider } = useIdeStore.getState();
        setCollabProvider(null);

        const origLog = console.log;
        const origWarn = console.warn;
        const origError = console.error;

        const suppressor = (orig: any) => (...args: any[]) => {
            if (typeof args[0] === 'string' && args[0].includes('[yjs]')) return;
            orig.apply(console, args);
        };

        console.log = suppressor(origLog);
        console.warn = suppressor(origWarn);
        console.error = suppressor(origError);

        try { bindingRef.current?.destroy(); } catch {}
        try { providerRef.current?.destroy(); } catch {}

        console.log = origLog;
        console.warn = origWarn;
        console.error = origError;

        bindingRef.current = null;
        providerRef.current = null;
        ydocRef.current = null;
    };

    useEffect(() => {
        return () => { cleanupCollab(); };
    }, [activeFile]);

    const handleEditorDidMount = async (editor: any) => {
        editorRef.current = editor;
        if (!activeFile) return;

        const { projectId } = useIdeStore.getState();
        if (!projectId) return;

        // Clean up previous collaboration session
        cleanupCollab();

        const { WebsocketProvider } = await import('y-websocket');
        const { MonacoBinding } = await import('y-monaco');

        const ydoc = new Y.Doc();
        ydocRef.current = ydoc;

        const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001";
        const wsUrl = NEXT_PUBLIC_API_URL.replace(/^http/, 'ws') + '/socket/collaboration';

        // Room name MUST include projectId so both collaborators join the SAME room for the same file
        const roomName = `${projectId}:${activeFile}`.replace(/[^a-zA-Z0-9:._-]/g, '-');
        console.log(`[Collab] Joining room: ${roomName} via ${wsUrl}`);
        
        const provider = new WebsocketProvider(wsUrl, roomName, ydoc) as unknown as WebsocketProvider;
        providerRef.current = provider;

        // Log connection status
        provider.on('status', (event: { status: string }) => {
            console.log(`[Collab] WebSocket status: ${event.status}`);
        });

        // Store provider in IDE store for OnlineCollaborators component
        const { setCollabProvider } = useIdeStore.getState();
        setCollabProvider(provider);

        const ytext = ydoc.getText('monaco');

        // CRITICAL: Wait for initial sync, then seed Y.Text with file content if room is new
        const currentContent = editor.getModel()?.getValue() || '';
        
        await new Promise<void>((resolve) => {
            if ((provider as any).synced) {
                resolve();
            } else {
                provider.once('sync', () => resolve());
                // Timeout after 3s in case server doesn't respond
                setTimeout(() => resolve(), 3000);
            }
        });

        // If after sync the Y.Text is still empty BUT the editor has content,
        // this is a new room — seed it with the file's actual content
        if (ytext.length === 0 && currentContent.length > 0) {
            console.log(`[Collab] New room — seeding with file content (${currentContent.length} chars)`);
            ytext.insert(0, currentContent);
        }

        // Bind Yjs to Monaco
        const binding = new MonacoBinding(
            ytext,
            editor.getModel(),
            new Set([editor]),
            provider.awareness
        ) as unknown as MonacoBinding;
        bindingRef.current = binding;

        // Get real user info from Supabase for awareness
        const colors = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#34d399', '#22d3ee', '#818cf8', '#c084fc', '#f472b6'];
        const userColor = colors[Math.floor(Math.random() * colors.length)];
        
        try {
            const { createClient } = await import('@/lib/supabase/client');
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            
            provider.awareness.setLocalStateField('user', {
                name: user?.user_metadata?.user_name || user?.user_metadata?.full_name || user?.email || 'Anonymous',
                color: userColor,
                avatar: user?.user_metadata?.avatar_url || null,
            });
        } catch {
            provider.awareness.setLocalStateField('user', {
                name: 'User ' + Math.floor(Math.random() * 1000),
                color: userColor,
            });
        }
    };

    useEffect(() => {
        if (monaco) {
            monaco.editor.defineTheme("codeforgehub-dark", {
                base: "vs-dark",
                inherit: true,
                rules: [
                    { token: 'keyword', foreground: 'ff7b72', fontStyle: 'bold' },
                    { token: 'string', foreground: 'a5d6ff' },
                    { token: 'comment', foreground: '8b949e', fontStyle: 'italic' },
                    { token: 'number', foreground: 'ffbd2e' },
                    { token: 'function', foreground: 'd2a8ff' },
                    { token: 'type', foreground: '79c0ff' },
                    { token: 'delimiter', foreground: 'c9d1d9' },
                ],
                colors: {
                    "editor.background": "#0D1117",
                    "editor.foreground": "#c9d1d9",
                    "editor.lineHighlightBackground": "#161b22",
                    "editor.selectionBackground": "#3B82F640",
                    "editorCursor.foreground": "#ec4899", // Pink cursor
                    "editorWhitespace.foreground": "#21262d",
                    "editorIndentGuide.background": "#21262d",
                    "editorIndentGuide.activeBackground": "#3c3cf6",
                    "editor.lineNumberForeground": "#484f58",
                },
            });
            monaco.editor.setTheme("codeforgehub-dark");
        }
    }, [monaco]);

    // Copilot-style Inline Autocomplete
    useEffect(() => {
        if (!monaco) return;

        const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001";

        const provider = monaco.languages.registerInlineCompletionsProvider({
            pattern: '**',
            provideInlineCompletions: async (model, position, context, token) => {
                // Delay to avoid spamming while typing
                await new Promise(resolve => setTimeout(resolve, 300));
                if (token.isCancellationRequested) return { items: [] };

                const lineContent = model.getLineContent(position.lineNumber);
                if (lineContent.trim().length === 0) return { items: [] };

                // Get prefix and suffix
                const prefix = model.getValueInRange({
                    startLineNumber: Math.max(1, position.lineNumber - 50),
                    startColumn: 1,
                    endLineNumber: position.lineNumber,
                    endColumn: position.column
                });

                const suffix = model.getValueInRange({
                    startLineNumber: position.lineNumber,
                    startColumn: position.column,
                    endLineNumber: Math.min(model.getLineCount(), position.lineNumber + 50),
                    endColumn: model.getLineMaxColumn(Math.min(model.getLineCount(), position.lineNumber + 50))
                });

                // Get token from supabase for auth
                let accessToken = '';
                try {
                    const { createClient } = await import('@/lib/supabase/client');
                    const supabase = createClient();
                    const { data: { session } } = await supabase.auth.getSession();
                    accessToken = session?.access_token || '';
                } catch {}

                try {
                    const response = await fetch(`${NEXT_PUBLIC_API_URL}/api/ai/autocomplete`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${accessToken}`
                        },
                        body: JSON.stringify({
                            prefix,
                            suffix,
                            filename: model.uri.path
                        }),
                        signal: token.isCancellationRequested ? undefined : undefined // Monaco handles cancellation via token
                    });

                    const data = await response.json();
                    if (data.success && data.suggestion) {
                        return {
                            items: [{
                                insertText: data.suggestion,
                                range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column)
                            }]
                        };
                    }
                } catch (err) {
                    console.error('[Autocomplete] Fetch error:', err);
                }

                return { items: [] };
            },
            freeInlineCompletions: () => {}
        });

        return () => provider.dispose();
    }, [monaco]);

    const performSave = useCallback(async () => {
        setIsSaving(true);
        await saveActiveFile();
        setIsSaving(false);
        setShowSaved(true);
        setTimeout(() => setShowSaved(false), 2000);
    }, [saveActiveFile]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 's') {
            e.preventDefault();
            performSave();
        }
    }, [performSave]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    const handleEditorChange = useCallback((value: string | undefined) => {
        if (value !== undefined) {
            setActiveFileContent(value);

            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
            }

            autoSaveTimerRef.current = setTimeout(async () => {
                setIsSaving(true);
                await saveActiveFile();
                setIsSaving(false);
                setShowSaved(true);
                setTimeout(() => setShowSaved(false), 2000);
            }, 1500);
        }
    }, [setActiveFileContent, saveActiveFile]);

    useEffect(() => {
        return () => {
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
            }
        };
    }, []);

    if (!activeFile) {
        return (
            <motion.div
                className="h-full w-full flex items-center justify-center bg-background-dark relative overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
            >
                {/* Decoration */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 blur-[100px] rounded-full pointer-events-none"></div>

                <div className="flex flex-col items-center gap-6 relative z-10">
                    <motion.div
                        className="w-24 h-24 rounded-3xl bg-surface-dark border border-white/10 flex items-center justify-center shadow-2xl relative group"
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 300 }}
                    >
                        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <Code2 className="w-10 h-10 text-primary relative z-10" />
                        <motion.div
                            className="absolute -top-3 -right-3 text-accent-neon"
                            animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                        >
                            <Sparkles className="w-6 h-6" />
                        </motion.div>
                    </motion.div>

                    <div className="text-center">
                        <h3 className="text-xl font-bold text-white font-display mb-2">Ready to Forge</h3>
                        <p className="text-slate-400 font-sans max-w-xs mx-auto">
                            Select a file from the explorer or create a new one to start crafting your code.
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/5 text-xs text-slate-500 font-mono">
                            {modKey} + P to search
                        </div>
                        <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/5 text-xs text-slate-500 font-mono">
                            {modKey} + ` to terminal
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    }

    const getLanguage = (filename: string) => {
        if (activeFileLanguage && activeFileLanguage !== 'plaintext') return activeFileLanguage;
        if (filename.endsWith(".tsx")) return "typescriptreact";
        if (filename.endsWith(".ts")) return "typescript";
        if (filename.endsWith(".jsx")) return "javascriptreact";
        if (filename.endsWith(".js")) return "javascript";
        if (filename.endsWith(".css")) return "css";
        if (filename.endsWith(".json")) return "json";
        if (filename.endsWith(".html")) return "html";
        if (filename.endsWith(".md")) return "markdown";
        if (filename.endsWith(".py")) return "python";
        if (filename.endsWith(".java")) return "java";
        return "plaintext";
    };

    return (
        <motion.div
            className="h-full w-full flex flex-col bg-background-dark min-w-0 min-h-0 relative"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            <TabBar />

            {/* Save status indicator - updated style */}
            <AnimatePresence>
                <div className="absolute top-14 right-6 z-10 pointer-events-none">
                    {isSaving && (
                        <motion.div
                            className="flex items-center gap-2 px-3 py-1.5 bg-surface-dark/90 backdrop-blur-md border border-white/10 rounded-lg text-xs text-slate-300 shadow-xl"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                        >
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                            <span className="font-mono">Saving...</span>
                        </motion.div>
                    )}
                    {showSaved && !isSaving && (
                        <motion.div
                            className="flex items-center gap-2 px-3 py-1.5 bg-accent-neon/10 backdrop-blur-md border border-accent-neon/20 rounded-lg text-xs text-accent-neon shadow-xl"
                            initial={{ opacity: 0, x: 20, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 20, scale: 0.9 }}
                        >
                            <Check className="w-3.5 h-3.5" />
                            <span className="font-mono">Saved</span>
                        </motion.div>
                    )}
                </div>
            </AnimatePresence>

            <div className="flex-1 relative">
                <Editor
                    height="100%"
                    path={activeFile}
                    language={getLanguage(activeFile)}
                    value={activeFileContent}
                    theme="codeforgehub-dark"
                    onChange={handleEditorChange}
                    onMount={handleEditorDidMount}
                    options={{
                        minimap: { enabled: true, side: 'right' },
                        fontSize: 14,
                        lineHeight: 22,
                        padding: { top: 20, bottom: 20 },
                        fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                        fontLigatures: true,
                        scrollBeyondLastLine: false,
                        smoothScrolling: true,
                        cursorBlinking: "smooth",
                        cursorSmoothCaretAnimation: "on",
                        autoClosingBrackets: "always",
                        formatOnPaste: true,
                        bracketPairColorization: { enabled: true },
                        guides: { bracketPairs: true, indentation: true },
                        inlineSuggest: { enabled: true, mode: 'always' },
                        suggest: { preview: true }
                    }}
                />
            </div>
        </motion.div>
    );
}
