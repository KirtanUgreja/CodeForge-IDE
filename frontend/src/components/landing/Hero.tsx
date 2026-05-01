"use client";

import { useEffect, useRef, useState } from "react";
import { ContainerScroll } from "@/components/landing/ui/container-scroll-animation";
import Link from 'next/link';

export default function Hero() {
    const cursorRef = useRef(null);

    const codeString = `import fast_api from fastapi import random

# Initialize the application
app = fast_api.FastAPI()

@app.get("/")
async def root():
    # Returns a random quote
    quotes = ["Code anywhere", "Build everything"]
    return {"message": random.choice(quotes)}

if __name__ == "__main__":
    print("Server starting on port 8000...")`;



    return (
        <section className="relative overflow-hidden min-h-screen bg-slate-950">
            {/* Background decorations form HTML */}
            <div className="absolute inset-0 bg-grid opacity-[0.03] pointer-events-none"></div>
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-accent-blue/20 blur-[120px] rounded-full pointer-events-none"></div>
            <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-accent-purple/10 blur-[100px] rounded-full pointer-events-none"></div>

            <ContainerScroll
                titleComponent={
                    <div className="flex flex-col items-center justify-center relative z-10 mb-20">
                        {/* Play Icon Pulse from HTML */}
                        <div className="absolute -top-20 right-[15%] hidden lg:block opacity-60">
                            <svg className="animate-pulse" fill="none" height="40" stroke="white" strokeLinecap="round" strokeWidth="1.5" viewBox="0 0 50 50" width="40">
                                <path d="M25 5 L28 18 L42 20 L30 28 L34 42 L25 32 L16 42 L20 28 L8 20 L22 18 Z"></path>
                            </svg>
                        </div>

                        <h1 className="mx-auto max-w-4xl text-5xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl relative font-display">
                            Code Anywhere. <br />
                            <span className="relative inline-block mt-2">
                                <span>Build </span>
                                <span className="relative inline-block">
                                    <span className="text-sky-400">Everything.</span>
                                    <svg className="absolute -bottom-3 left-0 w-full h-4 text-accent-purple opacity-90" fill="none" preserveAspectRatio="none" viewBox="0 0 100 10">
                                        <path className="scribble-path" d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeLinecap="round" strokeWidth="3"></path>
                                    </svg>
                                </span>
                            </span>
                        </h1>
                        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
                            Instant dev environments in your
                            <span className="relative inline-block text-slate-300 mx-1">
                                browser
                                <svg className="absolute -bottom-1 left-0 w-full h-3 text-white opacity-60" fill="none" preserveAspectRatio="none" viewBox="0 0 100 10">
                                    <path d="M5 2 Q 50 8 95 2" stroke="currentColor" strokeLinecap="round" strokeWidth="2"></path>
                                </svg>
                            </span>.
                            Powered by real Linux kernels, secured by Docker containers, and synchronized with your Git workflow.
                        </p>

                        <div className="mt-10 flex flex-wrap justify-center gap-6 relative items-center">
                            <div className="absolute -left-16 top-2 hidden md:block rotate-[-20deg]">
                                <span className="font-hand text-white text-lg block mb-1">It&apos;s free!</span>
                                <svg fill="none" height="30" stroke="white" strokeWidth="1.5" viewBox="0 0 60 30" width="60">
                                    <path d="M10 5 C 20 20, 40 20, 50 15 M 50 15 L 40 10 M 50 15 L 42 22" strokeLinecap="round" strokeLinejoin="round"></path>
                                </svg>
                            </div>

                            <Link href="/login" className="flex items-center gap-2 rounded-lg bg-primary px-8 py-4 text-lg font-bold text-white transition-all animate-pulse-glow hover:scale-105 cursor-pointer">
                                Start Coding Free
                                <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            </Link>

                            <button className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-6 py-3 text-base font-bold text-white hover:bg-white/10 transition-all backdrop-blur-sm cursor-pointer">
                                <span className="material-symbols-outlined text-sm">play_circle</span>
                                View Demo
                            </button>
                        </div>
                    </div>
                }
            >
                {/* Visual Content inside the Scroll Card */}
                <div className="w-full h-full bg-[#0d1117] relative">
                    {/* Window Controls */}
                    <div className="flex items-center justify-between border-b border-white/5 bg-[#010409] px-4 py-3 h-[50px]">
                        <div className="flex gap-2">
                            <div className="h-3 w-3 rounded-full bg-[#ff5f56]"></div>
                            <div className="h-3 w-3 rounded-full bg-[#ffbd2e]"></div>
                            <div className="h-3 w-3 rounded-full bg-[#27c93f]"></div>
                        </div>
                        <div className="flex w-1/2 items-center justify-center rounded-md bg-[#0d1117] py-1 text-xs text-slate-400 font-mono border border-white/5">
                            <span className="material-symbols-outlined mr-2 text-[14px]">lock</span>
                            codeblocking.dev/project/my-app
                        </div>
                        <div className="w-16"></div>
                    </div>

                    {/* Code Content Layout */}
                    <div className="grid grid-cols-[250px_1fr] h-[calc(100%-50px)] text-left">
                        {/* Sidebar */}
                        <div className="border-r border-white/5 bg-[#0d1117] p-4 hidden sm:block h-full">
                            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Explorer</div>
                            <div className="flex flex-col gap-2 font-mono text-sm text-slate-400">
                                <div className="flex items-center gap-2 hover:text-white cursor-pointer"><span className="material-symbols-outlined text-[16px]">folder</span> src</div>
                                <div className="flex items-center gap-2 pl-4 hover:text-white cursor-pointer text-white bg-primary/10 rounded px-1 -ml-1"><span className="material-symbols-outlined text-[16px] text-yellow-400">javascript</span> app.py</div>
                                <div className="flex items-center gap-2 pl-4 hover:text-white cursor-pointer"><span className="material-symbols-outlined text-[16px] text-blue-400">css</span> styles.css</div>
                                <div className="flex items-center gap-2 hover:text-white cursor-pointer"><span className="material-symbols-outlined text-[16px]">folder</span> public</div>
                                <div className="flex items-center gap-2 hover:text-white cursor-pointer"><span className="material-symbols-outlined text-[16px]">settings</span> config.json</div>
                            </div>
                        </div>

                        {/* Editor + Terminal */}
                        <div className="bg-[#0d1117] p-6 font-code text-sm overflow-hidden relative h-full flex flex-col">
                            <div className="flex gap-4 text-slate-600 border-b border-white/5 pb-2 mb-4 text-xs select-none">
                                <span className="text-white border-b border-primary pb-2 -mb-2.5">app.py</span>
                                <span>styles.css</span>
                                <span>README.md</span>
                            </div>
                            <pre className="font-mono text-sm leading-6 flex-1">
                                <code dangerouslySetInnerHTML={{
                                    __html: codeString.replace(/import|from|def|async|return|if|else|print/g, '<span class="text-[#ff7b72]">$&</span>')
                                        .replace(/"[^"]*"/g, '<span class="text-[#a5d6ff]">$&</span>')
                                        .replace(/#.*/g, '<span class="text-[#8b949e] italic">$&</span>')
                                        .replace(/\(/g, '<span class="text-yellow-300">(</span>')
                                        .replace(/\)/g, '<span class="text-yellow-300">)</span>')
                                }} />
                                <span ref={cursorRef} className="cursor-blink inline-block w-2.5 h-5 bg-indigo-500 align-middle ml-1"></span>
                            </pre>

                            {/* Terminal at bottom (absolute within editor pane) */}
                            <div className="absolute bottom-0 left-0 right-0 h-32 bg-[#010409] border-t border-white/10 p-3 font-mono text-xs">
                                <div className="flex items-center justify-between text-slate-500 mb-2">
                                    <span>TERMINAL</span>
                                    <div className="flex gap-2">
                                        <span className="material-symbols-outlined text-[14px]">add</span>
                                        <span className="material-symbols-outlined text-[14px]">close</span>
                                    </div>
                                </div>
                                <div className="text-green-400">user@codeblocking:~/project$ <span className="text-white">python app.py</span></div>
                                <div className="text-slate-300">Server starting on port 8000...</div>
                                <div className="text-green-400">user@codeblocking:~/project$ <span className="w-2 h-4 bg-slate-400 inline-block align-middle animate-pulse"></span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </ContainerScroll>
        </section>
    );
}
