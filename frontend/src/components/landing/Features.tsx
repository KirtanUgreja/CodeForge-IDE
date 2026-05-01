"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const features = [
    {
        title: "Real Terminal Access",
        description: "Full Linux shell access with sudo privileges. Install any package, run any command.",
        icon: "terminal",
        colSpan: "md:col-span-2",
        customContent: (
            <div className="bg-black/50 rounded-lg p-4 font-mono text-sm border border-white/5 h-32 overflow-hidden relative z-10 mt-6">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500/0 via-green-500/50 to-green-500/0 opacity-50"></div>
                <p className="text-green-500">root@dev-box:~# <span className="text-white">apt-get update</span></p>
                <p className="text-slate-500">Hit:1 http://archive.ubuntu.com/ubuntu focal InRelease</p>
                <p className="text-slate-500">Get:2 http://security.ubuntu.com/ubuntu focal-security InRelease</p>
                <p className="text-green-500">root@dev-box:~# <span className="text-white">docker-compose up -d</span></p>
                <p className="text-slate-300">Creating network &quot;app_default&quot; with the default driver</p>
            </div>
        ),
        badge: "Lightning fast!",
        badgeClass: "font-hand text-accent-neon rotate-12 opacity-80 whitespace-nowrap text-sm absolute -right-10 -bottom-8"
    },
    {
        title: "Docker Isolation",
        description: "Every environment is a sandboxed container. Secure by default, customizable by you.",
        icon: "lock_open",
        colSpan: "md:col-span-1",
        customContent: (
            <div className="mt-4 flex gap-2">
                <div className="h-8 w-8 rounded bg-[#2496ed] flex items-center justify-center text-white text-xs font-bold">
                    <span className="material-symbols-outlined text-[18px]">deployed_code</span>
                </div>
                <div className="h-8 w-8 rounded bg-white/10 flex items-center justify-center text-white text-xs font-bold animate-pulse">
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                </div>
            </div>
        )
    },
    {
        title: "GitHub Sync",
        description: "Seamless push/pull workflow. Visual conflict resolution built right in.",
        icon: "sync_alt",
        colSpan: "md:row-span-2",
        customContent: (
            <>
                <div className="space-y-3 mt-8">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-green-400">check_circle</span>
                            <div className="text-sm">
                                <div className="text-white font-medium">feat: update api</div>
                                <div className="text-slate-500 text-xs">2 mins ago</div>
                            </div>
                        </div>
                        <span className="text-xs bg-white/10 px-2 py-1 rounded text-white">main</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 opacity-60">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-slate-400">history</span>
                            <div className="text-sm">
                                <div className="text-white font-medium">fix: mobile layout</div>
                                <div className="text-slate-500 text-xs">1 hour ago</div>
                            </div>
                        </div>
                        <span className="text-xs bg-white/10 px-2 py-1 rounded text-white">dev</span>
                    </div>
                </div>
                <div className="mt-8 bg-black/40 rounded-xl p-4 border border-white/10 relative">
                    <div className="absolute -right-4 -top-8 font-hand text-accent-purple rotate-6 opacity-80 text-sm">Always in sync!</div>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-slate-400 font-bold uppercase">Auto-Sync</span>
                        <div className="w-10 h-5 bg-primary rounded-full relative cursor-pointer">
                            <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                        </div>
                    </div>
                    <p className="text-[10px] text-slate-500">Automatically push changes to remote every 5 mins.</p>
                </div>
            </>
        )
    },
    {
        title: "VS Code Experience",
        description: "Powered by Monaco Editor. IntelliSense, extensions, and debugging out of the box.",
        icon: "code",
        colSpan: "md:col-span-2",
        customContent: (
            <div className="mt-6 bg-[#1e1e1e] rounded-lg p-4 font-code text-xs border border-white/10 shadow-inner relative group cursor-text h-40 overflow-hidden">
                <div className="absolute top-12 left-28 bg-[#252526] border border-[#454545] rounded shadow-2xl z-10 w-48 hidden group-hover:block animate-in fade-in zoom-in duration-200">
                    <div className="flex items-center gap-2 px-2 py-1 bg-[#04395e] text-white">
                        <span className="bg-primary px-1 text-[10px] rounded">method</span>
                        <span>map</span>
                    </div>
                    <div className="px-2 py-1 text-slate-300 hover:bg-[#2a2d2e] cursor-pointer">filter</div>
                    <div className="px-2 py-1 text-slate-300 hover:bg-[#2a2d2e] cursor-pointer">reduce</div>
                </div>
                <div className="text-slate-300">
                    <span className="text-[#569cd6]">const</span> data = [<span className="text-[#b5cea8]">1</span>, <span className="text-[#b5cea8]">2</span>, <span className="text-[#b5cea8]">3</span>];<br />
                    <span className="text-[#569cd6]">const</span> doubled = data.<span className="text-[#dcdcaa] border-b border-dotted border-slate-500">map</span>((x) =&gt; x * <span className="text-[#b5cea8]">2</span>);<br /><br />
                    {/* React Component Example */}<br />
                    <span className="text-[#569cd6]">export default function</span> <span className="text-[#4ec9b0]">App</span>() {"{"}<br />
                    &nbsp;&nbsp;<span className="text-[#c586c0]">return</span> (<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;&lt;<span className="text-[#4ec9b0]">div</span> className=<span className="text-[#ce9178]">&quot;p-4&quot;</span>&gt;<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{"{doubled}"}<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;&lt;/<span className="text-[#4ec9b0]">div</span>&gt;<br />
                    &nbsp;&nbsp;);<br />
                    {"}"}<span className="inline-block w-2 h-4 bg-accent-blue ml-1 align-middle animate-cursor-blink"></span>
                </div>
            </div>
        )
    },
    {
        title: "Multiplayer Mode",
        description: "Code together in real-time. Share your localhost with a unique URL for instant feedback.",
        icon: null,
        colSpan: "md:col-span-2",
        customContent: (
            <div className="flex -space-x-3 mr-4 z-10 relative">
                <div className="w-10 h-10 rounded-full border-2 border-[#161b22] bg-blue-500 flex items-center justify-center text-white text-xs font-bold relative z-10">JD</div>
                <div className="w-10 h-10 rounded-full border-2 border-[#161b22] bg-purple-500 flex items-center justify-center text-white text-xs font-bold relative z-10">AS</div>
                <div className="w-10 h-10 rounded-full border-2 border-[#161b22] bg-green-500 flex items-center justify-center text-white text-xs font-bold relative z-10">MK</div>
                <div className="w-10 h-10 rounded-full border-2 border-[#161b22] bg-slate-700 flex items-center justify-center text-white text-xs font-bold relative z-10">+5</div>
            </div>
        )
    }
];

export default function Features() {
    const sectionRef = useRef(null);

    useEffect(() => {
        gsap.registerPlugin(ScrollTrigger);

        gsap.fromTo(".feature-card",
            { y: 50, opacity: 0 },
            {
                y: 0,
                opacity: 1,
                stagger: 0.1,
                duration: 0.8,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: sectionRef.current,
                    start: "top 80%",
                }
            }
        );
    }, []);

    return (
        <section id="features" ref={sectionRef} className="py-20 relative">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mb-12 relative">
                    <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl inline-block font-display">
                        Power Features
                    </h2>
                    <svg className="absolute -top-4 -right-8 w-8 h-8 text-accent-blue" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 50 50">
                        <path d="M25 0 L32 18 L50 25 L32 32 L25 50 L18 32 L0 25 L18 18 Z"></path>
                    </svg>
                    <p className="mt-4 text-lg text-slate-400">Everything you need for production-ready development.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(250px,auto)]">
                    {/* Real Terminal Access */}
                    <div className="feature-card glass-card rounded-2xl p-6 md:col-span-2 relative overflow-hidden group h-full">
                        <div className="absolute top-0 right-0 p-4 opacity-70 group-hover:opacity-100 transition-opacity z-10">
                            <div className="relative">
                                <span className="material-symbols-outlined text-green-400 text-4xl relative z-10">terminal</span>
                                <div className="absolute -right-10 -bottom-8 font-hand text-accent-neon rotate-12 opacity-80 whitespace-nowrap text-sm">Lightning fast!</div>
                                {/* Added Circle Doodle */}
                                <svg className="absolute -top-2 -left-3 w-16 h-16 text-white/20 -rotate-12 pointer-events-none" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M50 10 C 20 10, 10 40, 10 50 C 10 90, 80 90, 80 50 C 80 20, 50 20, 40 30" strokeLinecap="round" strokeDasharray="5 5" />
                                </svg>
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2 relative z-10">
                            Real Terminal Access
                            {/* Added Underline Doodle */}
                            <svg className="absolute -bottom-1 left-0 w-32 h-2 text-green-500/50 pointer-events-none" viewBox="0 0 100 10" preserveAspectRatio="none">
                                <path d="M0 5 Q 50 10 100 2" stroke="currentColor" strokeWidth="2" fill="none" />
                            </svg>
                        </h3>
                        <p className="text-slate-400 mb-6 max-w-sm relative z-10">
                            Full linux shell access with sudo privileges. Install any package, run any command.
                            {/* Added Arrow Doodle */}
                            <svg className="absolute top-0 right-[-20px] w-12 h-12 text-slate-600 rotate-45 pointer-events-none hidden md:block" viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M10 25 Q 25 25 40 10" strokeLinecap="round" />
                                <path d="M35 10 L 40 10 L 38 15" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </p>
                        {features[0].customContent}
                    </div>

                    {/* Docker Isolation */}
                    <div className="feature-card glass-card rounded-2xl p-6 relative flex flex-col justify-between overflow-hidden h-full">
                        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-accent-blue/20 rounded-full blur-2xl"></div>
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <span className="p-2 bg-white/5 rounded-lg text-white relative">
                                    <span className="material-symbols-outlined relative z-10">lock_open</span>
                                    {/* Added Box Doodle */}
                                    <svg className="absolute -inset-2 w-[140%] h-[140%] text-accent-blue/40 pointer-events-none" viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="1">
                                        <path d="M5 5 L 45 5 L 45 45 L 5 45 Z" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 3" />
                                    </svg>
                                </span>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Docker Isolation</h3>
                            <p className="text-slate-400 text-sm">Every environment is a sandboxed container. Secure by default, customizable by you.</p>
                        </div>
                        {features[1].customContent}
                    </div>

                    {/* GitHub Sync */}
                    <div className="feature-card glass-card rounded-2xl p-6 md:row-span-2 relative overflow-hidden h-full">
                        {/* Added Corner Squiggle */}
                        <svg className="absolute top-2 right-2 w-8 h-8 text-white/10 pointer-events-none" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                            <path d="M2 2 S 5 8 10 2 S 15 8 18 2" strokeLinecap="round" />
                            <path d="M2 6 S 5 12 10 6 S 15 12 18 6" strokeLinecap="round" opacity="0.5" />
                        </svg>

                        <div className="mb-6">
                            <div className="p-2 bg-white/5 w-fit rounded-lg mb-4 text-white relative">
                                <span className="material-symbols-outlined relative z-10">sync_alt</span>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">GitHub Sync</h3>
                            <p className="text-slate-400 text-sm">Seamless push/pull workflow. Visual conflict resolution built right in.</p>
                        </div>
                        {features[2].customContent}
                    </div>

                    {/* VS Code Experience */}
                    <div className="feature-card glass-card rounded-2xl p-6 md:col-span-2 relative overflow-hidden h-full">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold text-white mb-2">
                                    VS Code Experience
                                    {/* Added Highlight Doodle */}
                                    <svg className="absolute -top-4 -left-6 w-12 h-12 text-yellow-400/20 pointer-events-none" viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M25 5 L 30 15 L 45 15 L 35 25 L 40 40 L 25 30 L 10 40 L 15 25 L 5 15 L 20 15 Z" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </h3>
                                <p className="text-slate-400 max-w-sm">Powered by Monaco Editor. IntelliSense, extensions, and debugging out of the box.</p>
                            </div>
                            <div className="bg-[#007acc] p-2 rounded text-white shadow-lg shadow-blue-500/20 relative">
                                <span className="material-symbols-outlined relative z-10">code</span>
                            </div>
                        </div>
                        {features[3].customContent}
                    </div>

                    {/* Multiplayer Mode */}
                    <div className="feature-card glass-card rounded-2xl p-6 md:col-span-2 relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 h-full">
                        <div className="z-10 relative">
                            {/* Added Arrow Pointing to Users */}
                            <svg className="absolute -top-8 -right-12 w-16 h-16 text-white/20 rotate-12 pointer-events-none hidden sm:block" viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M10 40 Q 25 10 40 25" strokeLinecap="round" />
                                <path d="M35 25 L 40 25 L 38 30" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <h3 className="text-xl font-bold text-white mb-2 relative inline-block">
                                Multiplayer Mode
                                <svg className="absolute -bottom-1 left-0 w-full text-accent-purple opacity-70" preserveAspectRatio="none" viewBox="0 0 100 5">
                                    <path d="M0 2 Q 50 5 100 0" fill="none" stroke="currentColor" strokeWidth="2"></path>
                                </svg>
                            </h3>
                            <p className="text-slate-400 text-sm max-w-xs">Code together in real-time. Share your localhost with a unique URL for instant feedback.</p>
                        </div>
                        {features[4].customContent}
                    </div>
                </div>
            </div>
        </section>
    );
}
