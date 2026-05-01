'use client'

import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { motion } from 'framer-motion'
import { Terminal, Github, Sparkles } from 'lucide-react'

function LoginContent() {
    const searchParams = useSearchParams()
    const error = searchParams.get('error')

    const handleGitHubLogin = async () => {
        const supabase = createClient()

        await supabase.auth.signInWithOAuth({
            provider: 'github',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
                scopes: 'read:user user:email repo',
            },
        })
    }

    return (
        <div className="min-h-screen bg-background-dark relative overflow-hidden font-sans selection:bg-primary selection:text-white">
            {/* Background decorations matching Landing Page */}
            <div className="absolute inset-0 bg-grid opacity-[0.05] pointer-events-none"></div>
            <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-accent-blue/20 blur-[120px] rounded-full pointer-events-none animate-float"></div>
            <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-accent-purple/10 blur-[100px] rounded-full pointer-events-none animate-float-delayed"></div>

            <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="w-full max-w-md"
                >
                    {/* Brand Header */}
                    <div className="text-center mb-10 relative">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                            className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/20 mb-6 relative group"
                        >
                            <div className="absolute inset-0 bg-primary/20 blur-lg rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <Terminal className="w-10 h-10 text-primary relative z-10" />
                            <motion.div
                                className="absolute -top-2 -right-2 text-accent-neon"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                            >
                                <Sparkles className="w-5 h-5" />
                            </motion.div>
                        </motion.div>

                        <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight font-display mb-3">
                            Code Forge Hub
                        </h1>
                        <p className="text-lg text-slate-400 font-sans">
                            Your cloud-native development environment.
                        </p>
                    </div>

                    {/* Login Card */}
                    <div className="glass-card rounded-2xl p-8 sm:p-10 border border-white/10 shadow-2xl relative overflow-hidden">
                        {/* Card Glow Effect */}
                        <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/20 blur-3xl rounded-full pointer-events-none"></div>

                        <div className="relative z-10">
                            <div className="text-center mb-8">
                                <h2 className="text-xl font-bold text-white font-display mb-2">Welcome Back</h2>
                                <p className="text-slate-400 text-sm">Sign in to continue building</p>
                            </div>

                            {error && (
                                <motion.div
                                    className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                >
                                    <span className="material-symbols-outlined text-[18px]">error</span>
                                    Authentication failed. Please try again.
                                </motion.div>
                            )}

                            <button
                                onClick={handleGitHubLogin}
                                className="w-full group relative flex items-center justify-center gap-3 bg-[#24292e] hover:bg-[#2f363d] text-white px-6 py-4 rounded-xl font-bold transition-all duration-200 border border-white/10 hover:border-white/20 hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <Github className="w-5 h-5 group-hover:text-primary transition-colors" />
                                <span>Continue with GitHub</span>
                                <div className="absolute inset-0 rounded-xl ring-2 ring-white/5 group-hover:ring-primary/20 transition-all duration-300"></div>
                            </button>

                            <div className="mt-8 text-center">
                                <p className="text-xs text-slate-500">
                                    By signing in, you agree to our{' '}
                                    <a href="#" className="text-primary hover:text-accent-blue transition-colors underline decoration-primary/30 underline-offset-4">Terms of Service</a>
                                    {' '}and{' '}
                                    <a href="#" className="text-primary hover:text-accent-blue transition-colors underline decoration-primary/30 underline-offset-4">Privacy Policy</a>.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Footer decoration */}
                    <div className="mt-10 text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5 text-xs text-slate-500 font-mono">
                            <span className="w-2 h-2 rounded-full bg-accent-neon animate-pulse"></span>
                            All systems operational
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-background-dark flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                    <p className="text-slate-400 font-mono text-sm animate-pulse">Loading environment...</p>
                </div>
            </div>
        }>
            <LoginContent />
        </Suspense>
    )
}