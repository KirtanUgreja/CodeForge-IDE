"use client";

import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="border-t border-white/10 bg-[#05080f] pt-16 pb-8">
            <div className="mx-auto max-w-full px-4 sm:px-6 lg:px-8">
                {/* Big Header */}
                <div className="flex flex-col items-center text-center mb-16 relative w-full overflow-hidden py-10">
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                        <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-accent-purple to-transparent"></div>
                    </div>
                    <h2 className="text-5xl sm:text-7xl font-black text-white mb-10 tracking-tighter relative z-10 font-display">
                        Your Browser is Your IDE
                        <span className="absolute -top-6 right-0 text-accent-cyan animate-pulse hidden md:block">
                            <svg fill="none" height="40" viewBox="0 0 50 50" width="40">
                                <path d="M25 0 L28 18 L42 20 L30 28 L34 42 L25 32 L16 42 L20 28 L8 20 L22 18 Z" fill="currentColor"></path>
                            </svg>
                        </span>
                    </h2>
                    <div className="relative flex items-center justify-center w-full">
                        <Link href="/login" className="relative px-16 py-8 bg-accent-purple/90 hover:bg-accent-purple text-white text-3xl font-black rounded-2xl shadow-[0_0_80px_-10px_rgba(139,92,246,0.6)] transition-all hover:scale-105 hover:shadow-[0_0_100px_-5px_rgba(139,92,246,0.8)] border border-white/20 z-10 group overflow-hidden">
                            <span className="relative z-10">Start Coding</span>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                        </Link>
                        <div className="absolute top-1/2 left-[calc(50%+180px)] -translate-y-1/2 hidden lg:block rotate-[-5deg]">
                            <div className="font-hand text-white text-2xl whitespace-nowrap relative">
                                No Credit Card Required
                                <svg className="absolute -bottom-2 left-0 w-full h-8 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 200 20">
                                    <path d="M0 10 Q 50 20 100 5 T 200 10" strokeLinecap="round"></path>
                                </svg>
                                <svg className="absolute -top-6 -right-8 w-12 h-12 text-accent-neon animate-scribble" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 50 50">
                                    <path d="M10 25 L 20 10 L 30 35 L 40 15" strokeLinecap="round" strokeLinejoin="round"></path>
                                </svg>
                            </div>
                        </div>
                        <svg className="absolute left-[10%] top-1/2 -translate-y-1/2 w-24 h-24 text-accent-cyan opacity-60 hidden md:block" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 100 100">
                            <path className="animate-pulse" d="M50 0 L 30 50 L 60 40 L 40 100" strokeLinecap="round" strokeLinejoin="round"></path>
                        </svg>
                        <svg className="absolute right-[10%] top-0 w-16 h-16 text-accent-purple opacity-60 hidden md:block" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 100 100">
                            <path className="animate-pulse" d="M40 0 L 60 50 L 30 40 L 70 100" strokeLinecap="round" strokeLinejoin="round"></path>
                        </svg>
                    </div>
                </div>

                {/* Links Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12 text-sm max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div>
                        <h4 className="font-bold text-white mb-4">Product</h4>
                        <ul className="space-y-2 text-slate-500">
                            <li><a className="hover:text-primary" href="#">Features</a></li>
                            <li><a className="hover:text-primary" href="#">Pricing</a></li>
                            <li><a className="hover:text-primary" href="#">Changelog</a></li>
                            <li><a className="hover:text-primary" href="#">Docs</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold text-white mb-4">Resources</h4>
                        <ul className="space-y-2 text-slate-500">
                            <li><a className="hover:text-primary" href="#">Community</a></li>
                            <li><a className="hover:text-primary" href="#">Help Center</a></li>
                            <li><a className="hover:text-primary" href="#">Status</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold text-white mb-4">Company</h4>
                        <ul className="space-y-2 text-slate-500">
                            <li><a className="hover:text-primary" href="#">About</a></li>
                            <li><a className="hover:text-primary" href="#">Blog</a></li>
                            <li><a className="hover:text-primary" href="#">Careers</a></li>
                            <li><a className="hover:text-primary" href="#">Contact</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold text-white mb-4">Social</h4>
                        <div className="flex gap-4">
                            <a className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-colors" href="#">
                                <span className="material-symbols-outlined text-[20px]">chat</span>
                            </a>
                            <a className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-colors" href="#">
                                <span className="material-symbols-outlined text-[20px]">code</span>
                            </a>
                            <a className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-colors" href="#">
                                <span className="material-symbols-outlined text-[20px]">alternate_email</span>
                            </a>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-600 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/20 text-primary">
                            <span className="material-symbols-outlined text-[14px]">terminal</span>
                        </div>
                        <span>© 2026 CodeBlocking Inc.</span>
                    </div>
                    <div className="flex gap-6">
                        <a className="hover:text-slate-400" href="#">Privacy Policy</a>
                        <a className="hover:text-slate-400" href="#">Terms of Service</a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
