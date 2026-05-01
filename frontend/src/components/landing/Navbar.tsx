"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default function Navbar() {
    const navRef = useRef(null);

    useEffect(() => {
        gsap.registerPlugin(ScrollTrigger);

        // Initial fade in
        gsap.fromTo(navRef.current,
            { y: -20, opacity: 0 },
            { y: 0, opacity: 1, duration: 1, ease: "power3.out" }
        );
    }, []);

    return (
        <nav className="fixed top-0 z-50 w-full border-b border-white/10 glass-panel">
            <div
                ref={navRef}
                className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
            >
                <div className="flex h-16 items-center justify-between">
                    <div className="flex items-center gap-2 text-white">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
                            <span className="material-symbols-outlined">terminal</span>
                        </div>
                        <span className="text-lg font-bold tracking-tight font-display">CodeBlocking</span>
                    </div>

                    <div className="hidden md:flex items-center gap-8">
                        <Link className="text-sm font-medium text-slate-300 hover:text-white transition-colors" href="#">Features</Link>
                        <Link className="text-sm font-medium text-slate-300 hover:text-white transition-colors" href="#">Docs</Link>
                        <Link className="text-sm font-medium text-slate-300 hover:text-white transition-colors" href="#">Pricing</Link>
                        <Link className="flex items-center gap-1 text-sm font-medium text-slate-300 hover:text-white transition-colors" href="#">
                            <span className="material-symbols-outlined text-[18px]">star</span>
                            Open Source
                        </Link>
                    </div>

                    <div className="flex items-center gap-4">
                        <Link href="/login" className="hidden sm:block text-sm font-medium text-white hover:text-primary transition-colors">Sign In</Link>
                        <Link href="/login" className="rounded-lg bg-primary hover:bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all">
                            Start Coding
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
}
