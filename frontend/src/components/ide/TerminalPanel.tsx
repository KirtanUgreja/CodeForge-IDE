"use client";

import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { useIdeStore } from "@/store/ide-store";
import { terminalSocket } from "@/lib/terminalSocket";
import { X, Terminal as TerminalIcon, Maximize2, PlugZap, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import "@xterm/xterm/css/xterm.css";

// Refined theme matching Code Forge Hub Brand
const terminalTheme = {
    background: "#0D1117", // Matches main background
    foreground: "#c9d1d9",
    cursor: "#ec4899", // Pink cursor
    selectionBackground: "#3B82F640",
    black: "#010409",
    red: "#ff7b72",
    green: "#3fb950",
    yellow: "#d29922",
    blue: "#58a6ff",
    magenta: "#bc8cff",
    cyan: "#39c5cf",
    white: "#d0d7de",
    brightBlack: "#484f58",
    brightRed: "#ffa198",
    brightGreen: "#56d364",
    brightYellow: "#e3b341",
    brightBlue: "#79c0ff",
    brightMagenta: "#d2a8ff",
    brightCyan: "#56d4dd",
    brightWhite: "#ffffff",
};

export default function TerminalPanel() {
    const containerRef = useRef<HTMLDivElement>(null);
    const terminalRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const { toggleTerminal, projectId } = useIdeStore();
    const [isConnecting, setIsConnecting] = useState(true);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (!containerRef.current) return;

        const term = new Terminal({
            cursorBlink: true,
            fontSize: 14,
            lineHeight: 1.2,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
            theme: terminalTheme,
            allowProposedApi: true,
            cursorStyle: 'bar', // Modern cursor style
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        // Open terminal with a slight delay to ensure container size is ready
        const timer = setTimeout(() => {
            if (containerRef.current) {
                term.open(containerRef.current);
                fitAddon.fit();
            }
        }, 100);

        terminalRef.current = term;
        fitAddonRef.current = fitAddon;

        // Custom Key Handling (Copy/Paste)
        term.attachCustomKeyEventHandler((event) => {
            if (event.ctrlKey && event.shiftKey && (event.code === 'KeyC' || event.key.toLowerCase() === 'c')) {
                if (event.type === 'keydown') {
                    const selection = term.getSelection();
                    if (selection) {
                        navigator.clipboard.writeText(selection);
                    }
                }
                return false;
            }

            if (event.ctrlKey && event.shiftKey && (event.code === 'KeyV' || event.key.toLowerCase() === 'v')) {
                if (event.type === 'keydown') {
                    navigator.clipboard.readText()
                        .then((text) => terminalSocket.write(text))
                        .catch(err => console.error(err));
                }
                return false;
            }
            return true;
        });

        // Branding and Initial Output
        term.writeln('');
        term.writeln(' \x1b[1;35m⚡ Code Forge Hub\x1b[0m \x1b[38;5;240mTerminal Service v2.0\x1b[0m');
        term.writeln(' \x1b[38;5;240m----------------------------------------\x1b[0m');
        term.writeln(' \x1b[34m➜\x1b[0m Initializing secure container connection...');

        // Socket Logic
        terminalSocket.onData((data) => term.write(data));

        terminalSocket.onReady(() => {
            setIsConnected(true);
            setIsConnecting(false);
            term.clear(); // Clear initial messages for a clean start
            // Fancy startup message
            term.writeln('\x1b[1;32m➜ Container Ready.\x1b[0m \x1b[90mAccess granted.\x1b[0m');
            term.writeln('\x1b[90mWelcome to your cloud workspace.\x1b[0m');
            term.writeln('');
            // Trigger a resize to ensure full width
            fitAddon.fit();
            terminalSocket.resize(term.cols, term.rows);
        });

        terminalSocket.onExit(() => {
            setIsConnected(false);
            term.writeln('\n\x1b[1;31m✖ Session Terminated\x1b[0m \x1b[90mReconnecting...\x1b[0m');
        });

        // Connect
        terminalSocket.connect();

        term.onData(data => terminalSocket.write(data));

        // Resize Observer
        const handleResize = () => {
            fitAddon.fit();
            if (terminalRef.current) {
                terminalSocket.resize(terminalRef.current.cols, terminalRef.current.rows);
            }
        };

        window.addEventListener('resize', handleResize);
        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(containerRef.current);

        return () => {
            clearTimeout(timer);
            term.dispose();
            terminalSocket.disconnect();
            window.removeEventListener('resize', handleResize);
            resizeObserver.disconnect();
        };
    }, [projectId]);

    return (
        <motion.div
            className="h-full w-full flex flex-col bg-[#0D1117] relative"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            {/* Terminal Header */}
            <div className="h-9 px-4 flex items-center justify-between border-b border-white/5 bg-[#161b22] select-none">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-[10px] font-bold text-slate-300 uppercase tracking-widest font-mono">
                        <TerminalIcon className="w-3 h-3 text-accent-purple" />
                        <span>Terminal</span>
                    </div>

                    <AnimatePresence mode="wait">
                        {isConnecting ? (
                            <motion.div
                                key="connecting"
                                className="flex items-center gap-2 text-xs text-blue-400 font-mono"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Connecting</span>
                            </motion.div>
                        ) : isConnected ? (
                            <motion.div
                                key="connected"
                                className="flex items-center gap-1.5 text-xs text-green-400 font-mono"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                <span>Online</span>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="disconnected"
                                className="flex items-center gap-1.5 text-xs text-red-400 font-mono"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <AlertCircle className="w-3 h-3" />
                                <span>Disconnected</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex items-center gap-1">
                    <motion.button
                        onClick={() => {
                            terminalRef.current?.clear();
                            terminalRef.current?.writeln('\x1b[90mConsole cleared.\x1b[0m');
                            terminalRef.current?.focus();
                        }}
                        className="p-1.5 hover:bg-white/10 rounded-md text-slate-500 hover:text-white transition-colors"
                        title="Clear Console"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                    </motion.button>
                    <motion.button
                        onClick={toggleTerminal}
                        className="p-1.5 hover:bg-white/10 rounded-md text-slate-500 hover:text-white transition-colors"
                        title="Close Panel"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <X className="w-3.5 h-3.5" />
                    </motion.button>
                </div>
            </div>

            {/* Terminal Container */}
            <div
                ref={containerRef}
                className="flex-1 p-3 overflow-hidden custom-scrollbar bg-[#0D1117] relative z-0"
                style={{
                    paddingLeft: '16px',
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace"
                }}
            >
                {/* Background glow for terminal feel */}
                <div className="absolute inset-0 bg-gradient-to-br from-accent-purple/5 to-transparent pointer-events-none opacity-20"></div>
            </div>
        </motion.div>
    );
}