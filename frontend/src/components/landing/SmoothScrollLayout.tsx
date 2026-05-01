"use client";

import { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";

export default function SmoothScrollLayout({ children }: { children: React.ReactNode }) {
    useLayoutEffect(() => {
        gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

        // Create the smooth scroller
        let smoother: globalThis.ScrollSmoother | undefined;
        try {
            smoother = ScrollSmoother.create({
                wrapper: "#smooth-wrapper",
                content: "#smooth-content",
                smooth: 1.5, // Smoothness intensity
                effects: true,
                normalizeScroll: true,
            });
        } catch (e) {
            console.warn("ScrollSmoother registration failed (likely missing Club GSAP)", e);
        }

        return () => {
            // Cleanup if needed (though ScrollSmoother is usually global)
            if (smoother) smoother.kill();
        };
    }, []);

    return (
        <div id="smooth-wrapper">
            <div id="smooth-content">
                {children}
            </div>
        </div>
    );
}
