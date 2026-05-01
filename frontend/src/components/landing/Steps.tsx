"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default function Steps() {


    useEffect(() => {
        gsap.registerPlugin(ScrollTrigger);
    }, []);

    return (
        <section className="py-24 bg-surface-dark border-y border-white/5 relative overflow-hidden">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-accent-blue/5 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-20 left-0 w-[500px] h-[500px] bg-accent-purple/5 rounded-full blur-[100px]"></div>
            </div>
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center mb-24 relative">
                    <h2 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight font-display">
                        From zero to coding in
                        <span className="relative inline-block text-accent-blue mx-2">
                            seconds
                            <svg className="absolute -bottom-2 left-0 w-full h-3 text-white opacity-60" fill="none" preserveAspectRatio="none" viewBox="0 0 100 10">
                                <path d="M2 5 Q 50 12 98 3" stroke="currentColor" strokeLinecap="round" strokeWidth="3"></path>
                            </svg>
                        </span>
                    </h2>
                </div>
                <div className="relative flex flex-col gap-32">
                    {/* Spark Path SVG */}
                    <svg className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none hidden md:block" style={{ maxWidth: '600px', height: '100%', overflow: 'visible' }} viewBox="0 0 100 800" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <linearGradient gradientUnits="userSpaceOnUse" id="pathGradient" x1="50" x2="50" y1="0" y2="800">
                                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0"></stop>
                                <stop offset="10%" stopColor="#3B82F6" stopOpacity="0.5"></stop>
                                <stop offset="90%" stopColor="#8B5CF6" stopOpacity="0.5"></stop>
                                <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0"></stop>
                            </linearGradient>
                        </defs>
                        <path className="spark-path" d="M 50 0 C 50 50, 50 100, 50 150 C 50 200, -100 200, -100 300 S 200 400, 200 500 S 50 600, 50 800" fill="none" stroke="url(#pathGradient)" strokeLinecap="round" strokeWidth="2"></path>
                        <circle fill="#fff" r="3">
                            <animateMotion dur="4s" path="M 50 0 C 50 50, 50 100, 50 150 C 50 200, -100 200, -100 300 S 200 400, 200 500 S 50 600, 50 800" repeatCount="indefinite"></animateMotion>
                        </circle>
                        <circle fill="#8B5CF6" r="3">
                            <animateMotion begin="2s" dur="4s" path="M 50 0 C 50 50, 50 100, 50 150 C 50 200, -100 200, -100 300 S 200 400, 200 500 S 50 600, 50 800" repeatCount="indefinite"></animateMotion>
                        </circle>
                    </svg>

                    {/* Step 1 */}
                    <div className="relative grid md:grid-cols-2 gap-12 items-center group">
                        <div className="order-2 md:order-1 md:text-right relative">
                            <div className="absolute -right-20 top-1/2 -translate-y-1/2 w-4 h-4 bg-accent-blue rounded-full shadow-[0_0_20px_rgba(59,130,246,0.8)] z-20 hidden md:block"></div>
                            <h3 className="text-3xl font-bold text-white mb-4 font-display relative inline-block">
                                1. Login with GitHub
                                {/* Circle Doodle around number */}
                                <svg className="absolute -top-2 -left-4 w-12 h-12 text-accent-blue/50 pointer-events-none" viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M25 5 A 20 20 0 1 1 20 44" strokeLinecap="round" strokeDasharray="4 2" />
                                </svg>
                            </h3>
                            <p className="text-lg text-slate-400 relative">
                                Instantly authenticate. We securely fetch your public keys and configure your environment variables automatically.
                                {/* Scribble arrow */}
                                <svg className="absolute -bottom-8 right-0 w-16 h-8 text-white/10 pointer-events-none -rotate-12 hidden md:block" viewBox="0 0 100 50" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M10 10 Q 50 40 90 20" strokeLinecap="round" />
                                    <path d="M80 15 L 90 20 L 85 28" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </p>
                        </div>
                        <div className="order-1 md:order-2 relative">
                            {/* ... kept existing card ... */}
                            <div className="glass-card w-full max-w-md mx-auto aspect-video rounded-2xl relative overflow-hidden flex items-center justify-center p-8 border-accent-blue/30 group-hover:border-accent-blue/60 transition-colors">
                                <div className="absolute inset-0 bg-gradient-to-br from-accent-blue/10 to-transparent opacity-50"></div>
                                <div className="relative w-full h-full flex items-center justify-center">
                                    <div className="absolute right-4 top-4 w-32 h-20 bg-white/5 backdrop-blur-md rounded-lg border border-white/10 p-3 transform rotate-6 animate-float">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-6 h-6 rounded-full bg-slate-500"></div>
                                            <div className="h-2 w-12 bg-slate-600 rounded"></div>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-700 rounded mb-1"></div>
                                        <div className="h-1.5 w-2/3 bg-slate-700 rounded"></div>
                                    </div>
                                    <svg className="w-48 h-48 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" fill="none" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 100 100">
                                        <path d="M30 50 L50 50" strokeDasharray="4 4"></path>
                                        <path className="animate-pulse" d="M20 50 C20 45 25 45 25 50 C25 55 20 55 20 50 Z M25 50 L55 50 M45 50 L45 55 M50 50 L50 55"></path>
                                        <rect height="30" rx="2" width="40" x="60" y="35"></rect>
                                        <path d="M70 35 V25 A10 10 0 0 1 90 25 V35"></path>
                                        <circle cx="80" cy="50" fill="white" r="3"></circle>
                                        <path d="M80 50 L80 58" strokeWidth="3"></path>
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className="relative grid md:grid-cols-2 gap-12 items-center group">
                        <div className="order-1 relative">
                            {/* ... kept existing card ... */}
                            <div className="glass-card w-full max-w-md mx-auto aspect-video rounded-2xl relative overflow-hidden flex items-center justify-center p-8 border-accent-purple/30 group-hover:border-accent-purple/60 transition-colors">
                                <div className="absolute inset-0 bg-gradient-to-bl from-accent-purple/10 to-transparent opacity-50"></div>
                                <div className="relative w-full h-full flex items-center justify-center">
                                    <span className="absolute top-10 left-10 font-mono text-xs text-green-400 bg-black/40 px-2 py-1 rounded animate-float-delayed backdrop-blur-sm border border-white/5">npm install</span>
                                    <span className="absolute bottom-10 right-10 font-mono text-xs text-blue-400 bg-black/40 px-2 py-1 rounded animate-float backdrop-blur-sm border border-white/5">docker run</span>
                                    <svg className="w-48 h-48 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] transform -rotate-12 group-hover:rotate-0 transition-transform duration-700" fill="none" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 100 100">
                                        <path d="M50 20 Q 65 50 65 70 L 35 70 Q 35 50 50 20 Z"></path>
                                        <circle cx="50" cy="50" r="5"></circle>
                                        <path d="M35 70 L 25 80 L 35 75"></path>
                                        <path d="M65 70 L 75 80 L 65 75"></path>
                                        <path className="animate-pulse" d="M40 70 L 40 85 M 50 70 L 50 90 M 60 70 L 60 85" stroke="#F59E0B"></path>
                                        <path d="M40 95 L 35 105" opacity="0.6" stroke="white"></path>
                                        <path d="M50 95 L 50 110" opacity="0.8" stroke="white"></path>
                                        <path d="M60 95 L 65 105" opacity="0.6" stroke="white"></path>
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div className="order-2 relative">
                            <div className="absolute -left-20 top-1/2 -translate-y-1/2 w-4 h-4 bg-accent-purple rounded-full shadow-[0_0_20px_rgba(139,92,246,0.8)] z-20 hidden md:block"></div>
                            <h3 className="text-3xl font-bold text-white mb-4 font-display relative inline-block">
                                2. Container Spin Up
                                {/* Underline Doodle */}
                                <svg className="absolute -bottom-2 left-0 w-full h-4 text-accent-purple/60 pointer-events-none" viewBox="0 0 100 10" preserveAspectRatio="none" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M0 5 Q 50 8 100 2" strokeLinecap="round" />
                                </svg>
                            </h3>
                            <p className="text-lg text-slate-400">We provision a dedicated Docker container with your project&apos;s dependencies pre-installed in seconds, not minutes.</p>
                        </div>
                    </div>

                    {/* Step 3 */}
                    <div className="relative grid md:grid-cols-2 gap-12 items-center group">
                        <div className="order-2 md:order-1 md:text-right relative">
                            <div className="absolute -right-20 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-[0_0_20px_rgba(255,255,255,0.8)] z-20 hidden md:block"></div>
                            <h3 className="text-3xl font-bold text-white mb-4 font-display relative inline-block">
                                3. Start Coding
                                {/* "GO!" Doodle */}
                                <svg className="absolute -right-12 -top-4 w-10 h-10 text-green-400/80 pointer-events-none rotate-12" viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M10 25 C 10 10, 40 10, 40 25 C 40 40, 10 40, 10 25" strokeLinecap="round" />
                                    <path d="M20 25 L 30 25" strokeWidth="3" />
                                </svg>
                            </h3>
                            <p className="text-lg text-slate-400">Your full IDE interface loads instantly. Access terminal, localhost preview, and git commands right from the browser.</p>
                        </div>
                        <div className="order-1 md:order-2 relative">
                            <div className="glass-card w-full max-w-md mx-auto aspect-video rounded-2xl relative overflow-hidden flex items-center justify-center p-8 border-white/20 group-hover:border-white/40 transition-colors">
                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-50"></div>
                                <div className="relative w-full h-full flex items-center justify-center">
                                    <svg className="w-64 h-64 drop-shadow-[0_0_15px_rgba(255,255,255,0.15)]" fill="none" viewBox="0 0 200 200">
                                        <path d="M60 100 C 60 70, 80 50, 100 50" stroke="rgba(255,255,255,0.3)" strokeLinecap="round" strokeWidth="2"></path>
                                        <path d="M60 100 C 60 130, 80 150, 100 150" stroke="rgba(255,255,255,0.3)" strokeLinecap="round" strokeWidth="2"></path>
                                        <path d="M70 100 L 90 100" stroke="#8B5CF6" strokeWidth="2"></path>
                                        <circle cx="70" cy="100" fill="#8B5CF6" r="3"></circle>
                                        <path d="M80 80 L 100 80" stroke="#3B82F6" strokeWidth="2"></path>
                                        <circle cx="80" cy="80" fill="#3B82F6" r="2"></circle>
                                        <path d="M80 120 L 100 120" stroke="#3B82F6" strokeWidth="2"></path>
                                        <circle cx="80" cy="120" fill="#3B82F6" r="2"></circle>
                                        <path d="M100 50 L 140 50" stroke="white" strokeDasharray="4 4" strokeWidth="2"></path>
                                        <path d="M100 150 L 140 150" stroke="white" strokeDasharray="4 4" strokeWidth="2"></path>
                                        <rect fill="rgba(0,0,0,0.4)" height="80" rx="4" stroke="white" strokeWidth="2" width="70" x="120" y="60"></rect>
                                        <line stroke="#3B82F6" strokeWidth="2" x1="130" x2="160" y1="75" y2="75"></line>
                                        <line stroke="rgba(255,255,255,0.5)" strokeWidth="2" x1="130" x2="180" y1="85" y2="85"></line>
                                        <line stroke="rgba(255,255,255,0.5)" strokeWidth="2" x1="130" x2="150" y1="95" y2="95"></line>
                                        <line stroke="#8B5CF6" strokeWidth="2" x1="130" x2="170" y1="110" y2="110"></line>
                                        <line stroke="rgba(255,255,255,0.5)" strokeWidth="2" x1="130" x2="140" y1="120" y2="120"></line>
                                        <path className="animate-pulse" d="M110 40 L 112 45 L 117 47 L 112 49 L 110 54 L 108 49 L 103 47 L 108 45 Z" fill="white"></path>
                                        <path className="animate-pulse" d="M180 130 L 181 133 L 184 134 L 181 135 L 180 138 L 179 135 L 176 134 L 179 133 Z" fill="#3B82F6" style={{ animationDelay: '0.5s' }}></path>
                                        <path d="M75 130 C 70 160, 110 170, 140 155" opacity="0.5" stroke="white" strokeDasharray="2 2" strokeWidth="1.5"></path>
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
