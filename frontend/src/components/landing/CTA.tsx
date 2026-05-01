"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from 'next/link';

export default function CTA() {


    useEffect(() => {
        gsap.registerPlugin(ScrollTrigger);
    }, []);

    return (
        <section className="py-20 bg-gradient-to-b from-background-dark to-[#05080f]">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6">Powered by the best</h3>
                        <div className="flex flex-wrap gap-8 items-center">
                            <div className="group flex items-center gap-2 grayscale hover:grayscale-0 transition-all opacity-60 hover:opacity-100 cursor-default">
                                <div className="text-2xl font-bold text-white">Next.js</div>
                            </div>
                            <div className="group flex items-center gap-2 grayscale hover:grayscale-0 transition-all opacity-60 hover:opacity-100 cursor-default">
                                <div className="text-2xl font-bold text-[#61DAFB]">React</div>
                            </div>
                            <div className="group flex items-center gap-2 grayscale hover:grayscale-0 transition-all opacity-60 hover:opacity-100 cursor-default">
                                <div className="text-2xl font-bold text-[#2496ED]">Docker</div>
                            </div>
                            <div className="group flex items-center gap-2 grayscale hover:grayscale-0 transition-all opacity-60 hover:opacity-100 cursor-default">
                                <div className="text-2xl font-bold text-[#3ECF8E]">Supabase</div>
                            </div>
                            <div className="group flex items-center gap-2 grayscale hover:grayscale-0 transition-all opacity-60 hover:opacity-100 cursor-default relative">
                                <div className="text-2xl font-bold text-white">Socket.IO</div>
                                <div className="absolute -top-4 -right-8 font-hand text-accent-cyan text-xs transform rotate-12 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Lightning fast!</div>
                            </div>
                        </div>

                        <div className="mt-12 bg-surface-dark border border-white/5 rounded-xl p-8 flex flex-col sm:flex-row gap-6 items-center relative">
                            <div className="absolute -top-4 -right-2 rotate-12 hidden sm:block">
                                <svg fill="none" height="40" stroke="#ef4444" strokeWidth="2" viewBox="0 0 50 50" width="40">
                                    <path d="M25 45 C 5 25, 5 5, 25 15 C 45 5, 45 25, 25 45" strokeLinecap="round" strokeLinejoin="round"></path>
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-2xl font-bold text-white mb-2 font-display">Self-Hostable</h3>
                                <p className="text-slate-400">Your data, your infrastructure. Deploy CodeBlocking on your own Kubernetes cluster or VPS.</p>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                                    <span className="material-symbols-outlined text-yellow-400">star</span>
                                    <span className="text-white font-bold">12.4k</span>
                                </div>
                                <div className="font-hand text-white text-lg flex items-center gap-1">
                                    Open Source
                                    <span className="material-symbols-outlined text-red-500 text-sm">favorite</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                        <span className="material-symbols-outlined text-6xl text-accent-purple mb-4">rocket_launch</span>
                        <h3 className="text-2xl font-bold text-white mb-2 font-display">Ready to ship?</h3>
                        <p className="text-slate-400 mb-8">Join 50,000+ developers building the future.</p>
                        <div className="relative inline-block w-full">
                            {/* Added Arrow pointing to button */}
                            <svg className="absolute -top-16 -left-16 w-20 h-20 text-white/50 rotate-[-45deg] pointer-events-none hidden md:block" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M10 10 Q 50 30 80 80" strokeLinecap="round" strokeDasharray="5 5" />
                                <path d="M70 70 L 80 80 L 85 65" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <Link href="/login" className="block w-full py-3 bg-white text-black font-bold rounded-lg hover:bg-slate-200 transition-colors relative z-10">
                                Get Started Free
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
