"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useIdeStore } from "@/store/ide-store";
import { terminalSocket } from "@/lib/terminalSocket";
import { api } from "@/lib/api";
import IdeLayout from "@/components/ide/IdeLayout";
import { Loader2 } from "lucide-react";

interface Project {
    id: string;
    name: string;
    github_url: string;
    environment: string;
}

export default function IdePage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.projectId as string;

    const { setProjectId } = useIdeStore();
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const initializeIde = async () => {
            try {
                const supabase = createClient();

                // Check auth
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.push("/login");
                    return;
                }

                // Fetch project details. RLS handles the security: guarantees owner, public project, or collaborator
                const { data: projectData, error: projectError } = await supabase
                    .from("projects")
                    .select("*")
                    .eq("id", projectId)
                    .single();

                if (projectError || !projectData) {
                    setError("Project not found");
                    setLoading(false);
                    return;
                }

                setProject(projectData);
                setProjectId(projectId);

                // Set auth token for API and terminal
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.access_token) {
                    api.setAuthToken(session.access_token);
                    if (session.provider_token) {
                        api.setGithubToken(session.provider_token);
                    }
                    terminalSocket.setAuth(projectId, session.access_token, user.id, projectData.environment);
                }

                // Open project on backend (clone if needed)
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

                let response;
                let retries = 3;
                while (retries > 0) {
                    try {
                        response = await fetch(`${apiUrl}/api/projects/${projectId}/open`, {
                            headers: {
                                Authorization: `Bearer ${session?.access_token}`,
                            },
                        });
                        if (response.ok) break;

                        // If 500 or network error, retry
                        if (response.status >= 500) throw new Error(response.statusText);
                        // If client error, stop
                        break;
                    } catch (e) {
                        console.log(`Failed to open project, retrying... (${retries} attempts left)`);
                        retries--;
                        if (retries === 0) throw e;
                        await new Promise(r => setTimeout(r, 1000));
                    }
                }

                if (!response || !response.ok) {
                    const data = await response?.json().catch(() => ({}));
                    const msg = data?.error
                        ? (typeof data.error === 'string' ? data.error : JSON.stringify(data.error))
                        : "Failed to open project";
                    setError(msg);
                    setLoading(false);
                    return;
                }

                setLoading(false);
            } catch (err: unknown) {
                console.error("Error initializing IDE:", err);
                const errorMessage = err instanceof Error ? err.message : JSON.stringify(err);
                setError(`Failed to initialize IDE: ${errorMessage}`);
                setLoading(false);
            }
        };

        initializeIde();
    }, [projectId, router, setProjectId]);

    if (loading) {
        return (
            <div className="h-screen w-full bg-[#1e1e1e] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-[#cccccc]">
                    <Loader2 className="w-8 h-8 animate-spin text-[#007acc]" />
                    <p className="text-sm">Loading project...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-screen w-full bg-[#1e1e1e] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-[#cccccc]">
                    <div className="w-16 h-16 rounded-xl bg-red-500/20 flex items-center justify-center">
                        <span className="text-4xl">⚠️</span>
                    </div>
                    <p className="text-sm text-red-400">{error}</p>
                    <button
                        onClick={() => router.push("/dashboard")}
                        className="px-4 py-2 bg-[#007acc] text-white rounded hover:bg-[#0066b8] transition-colors"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return <IdeLayout />;
}
