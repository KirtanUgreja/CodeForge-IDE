"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users } from "lucide-react";

interface CollaboratorInfo {
    clientId: number;
    name: string;
    color: string;
    avatar?: string;
}

interface OnlineCollaboratorsProps {
    provider: any; // WebsocketProvider - using any to avoid SSR import issues
}

export default function OnlineCollaborators({ provider }: OnlineCollaboratorsProps) {
    const [collaborators, setCollaborators] = useState<CollaboratorInfo[]>([]);

    useEffect(() => {
        if (!provider?.awareness) return;

        const updateCollaborators = () => {
            const states = provider.awareness.getStates();
            const users: CollaboratorInfo[] = [];

            states.forEach((state: any, clientId: number) => {
                if (clientId !== provider.awareness.clientID && state.user) {
                    users.push({
                        clientId,
                        name: state.user.name || `User ${clientId}`,
                        color: state.user.color || '#818cf8',
                        avatar: state.user.avatar,
                    });
                }
            });

            setCollaborators(users);
        };

        provider.awareness.on('change', updateCollaborators);
        updateCollaborators();

        return () => {
            provider.awareness.off('change', updateCollaborators);
        };
    }, [provider]);

    if (collaborators.length === 0) return null;

    return (
        <div className="flex items-center gap-1.5">
            {/* Collaborator count badge */}
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <Users className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] font-bold text-emerald-400">{collaborators.length + 1}</span>
            </div>

            {/* Avatar stack */}
            <div className="flex items-center -space-x-2">
                {/* Current user (you) */}
                <div
                    className="relative z-10"
                    title="You"
                >
                    <div
                        className="w-7 h-7 rounded-full border-2 border-[#161b22] flex items-center justify-center text-[10px] font-bold text-white shadow-lg"
                        style={{ background: 'linear-gradient(135deg, #238636, #2ea043)' }}
                    >
                        You
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#161b22]" />
                </div>

                {/* Remote collaborators */}
                <AnimatePresence>
                    {collaborators.slice(0, 5).map((collab, index) => (
                        <motion.div
                            key={collab.clientId}
                            initial={{ scale: 0, x: -10 }}
                            animate={{ scale: 1, x: 0 }}
                            exit={{ scale: 0, x: -10 }}
                            transition={{ type: "spring", damping: 20, stiffness: 300, delay: index * 0.05 }}
                            className="relative group"
                            style={{ zIndex: 10 - index }}
                            title={collab.name}
                        >
                            {collab.avatar ? (
                                <img
                                    src={collab.avatar}
                                    alt={collab.name}
                                    className="w-7 h-7 rounded-full border-2 shadow-lg object-cover"
                                    style={{ borderColor: collab.color }}
                                />
                            ) : (
                                <div
                                    className="w-7 h-7 rounded-full border-2 border-[#161b22] flex items-center justify-center text-[10px] font-bold text-white shadow-lg"
                                    style={{ backgroundColor: collab.color }}
                                >
                                    {collab.name.charAt(0).toUpperCase()}
                                </div>
                            )}
                            {/* Online indicator */}
                            <div
                                className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#161b22]"
                                style={{ backgroundColor: collab.color }}
                            />

                            {/* Tooltip */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-[#1c2128] border border-white/10 rounded-md text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl z-50">
                                <div
                                    className="w-1.5 h-1.5 rounded-full inline-block mr-1"
                                    style={{ backgroundColor: collab.color }}
                                />
                                {collab.name}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Overflow indicator */}
                {collaborators.length > 5 && (
                    <div className="w-7 h-7 rounded-full bg-[#30363d] border-2 border-[#161b22] flex items-center justify-center text-[10px] font-bold text-slate-300">
                        +{collaborators.length - 5}
                    </div>
                )}
            </div>
        </div>
    );
}
