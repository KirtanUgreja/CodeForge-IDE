"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, UserPlus, Mail, Github, Send, Check, Loader2, Copy, Link2 } from "lucide-react";
import { api } from "@/lib/api";
import { useIdeStore } from "@/store/ide-store";

interface AddCollaboratorModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AddCollaboratorModal({ isOpen, onClose }: AddCollaboratorModalProps) {
    const { projectId } = useIdeStore();
    const [email, setEmail] = useState("");
    const [githubUsername, setGithubUsername] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string; link?: string } | null>(null);
    const [copied, setCopied] = useState(false);

    const handleInvite = async () => {
        if (!email && !githubUsername) return;
        if (!projectId) return;

        setIsSending(true);
        setResult(null);

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001";
            
            // Get auth token from supabase
            const { createClient } = await import("@/lib/supabase/client");
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();

            const response = await fetch(`${apiUrl}/api/collaborators/${projectId}/invite`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({
                    email: email || undefined,
                    githubUsername: githubUsername || undefined,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setResult({ success: true, message: data.message, link: data.ideLink });
                setEmail("");
                setGithubUsername("");
            } else {
                setResult({ success: false, message: data.error || "Failed to send invitation" });
            }
        } catch (err) {
            setResult({ success: false, message: "Network error. Is the backend running?" });
        } finally {
            setIsSending(false);
        }
    };

    const copyLink = () => {
        if (result?.link) {
            navigator.clipboard.writeText(result.link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const getShareLink = () => {
        const frontendUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000';
        return `${frontendUrl}/ide/${projectId}`;
    };

    const copyDirectLink = () => {
        navigator.clipboard.writeText(getShareLink());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className="w-full max-w-md mx-4 bg-[#161b22] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden"
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-emerald-600/20 to-blue-600/20 border-b border-white/5 px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                    <UserPlus className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-white font-bold text-lg">Add Collaborator</h2>
                                    <p className="text-slate-400 text-xs">Invite someone to code together in real-time</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-4">
                        {/* Quick Share Link */}
                        <div className="bg-[#0D1117] border border-white/5 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Link2 className="w-4 h-4 text-blue-400" />
                                <span className="text-xs font-medium text-blue-400 uppercase tracking-wider">Quick Share Link</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 text-xs text-slate-300 bg-black/30 px-3 py-2 rounded-lg overflow-x-auto font-mono">
                                    {getShareLink()}
                                </code>
                                <button
                                    onClick={copyDirectLink}
                                    className="px-3 py-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-colors text-xs font-medium flex items-center gap-1.5"
                                >
                                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                    {copied ? "Copied" : "Copy"}
                                </button>
                            </div>
                        </div>

                        <div className="text-center text-xs text-slate-500">— or send an email invitation —</div>

                        {/* Email input */}
                        <div className="space-y-1.5">
                            <label className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                                <Mail className="w-3.5 h-3.5" /> Email Address
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="collaborator@example.com"
                                className="w-full bg-[#0D1117] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                            />
                        </div>

                        {/* GitHub username input */}
                        <div className="space-y-1.5">
                            <label className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                                <Github className="w-3.5 h-3.5" /> GitHub Username <span className="text-slate-600">(optional)</span>
                            </label>
                            <input
                                type="text"
                                value={githubUsername}
                                onChange={(e) => setGithubUsername(e.target.value)}
                                placeholder="octocat"
                                className="w-full bg-[#0D1117] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                            />
                        </div>

                        {/* Result */}
                        <AnimatePresence>
                            {result && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className={`rounded-lg px-4 py-3 text-sm flex items-center gap-2 ${
                                        result.success
                                            ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                                            : "bg-red-500/10 border border-red-500/20 text-red-400"
                                    }`}
                                >
                                    {result.success ? (
                                        <Check className="w-4 h-4 flex-shrink-0" />
                                    ) : (
                                        <X className="w-4 h-4 flex-shrink-0" />
                                    )}
                                    <span>{result.message}</span>
                                    {result.link && (
                                        <button
                                            onClick={copyLink}
                                            className="ml-auto flex-shrink-0 text-xs bg-emerald-600/20 hover:bg-emerald-600/30 px-2 py-1 rounded transition-colors"
                                        >
                                            {copied ? "Copied!" : "Copy Link"}
                                        </button>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Send Button */}
                        <motion.button
                            onClick={handleInvite}
                            disabled={isSending || (!email && !githubUsername)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-600 to-blue-600 text-white rounded-xl font-medium text-sm shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                        >
                            {isSending ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Sending Invitation...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Send Invitation Email
                                </>
                            )}
                        </motion.button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
