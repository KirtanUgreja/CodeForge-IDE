"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from 'react-markdown';
import { Send, Bot, User, Sparkles, X, ChevronRight, Brain, Code, Terminal as TerminalIcon, Code2 } from "lucide-react";
import { useIdeStore } from "@/store/ide-store";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export default function AiAssistant() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [model, setModel] = useState("google/gemini-2.0-flash-001");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { activeFile, activeFileContent, fileTree } = useIdeStore();

    const flattenFileTree = (nodes: any[], indent = ''): string => {
        let result = '';
        for (const node of nodes) {
            result += `${indent}${node.type === 'directory' ? '📁' : '📄'} ${node.path}\n`;
            if (node.children && node.children.length > 0) {
                result += flattenFileTree(node.children, indent + '  ');
            }
        }
        return result;
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { role: 'user', content: input };
        const newMessages = [...messages, userMessage];
        
        setMessages(newMessages);
        setInput("");
        setIsLoading(true);

        try {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) throw new Error("No session found");

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';
            
            // Add context if file is active
            const contextMessages = [...newMessages];
            
            const fileList = flattenFileTree(fileTree);
            const projectContext = `Project Workspace Files:\n${fileList}\n\n` + 
                (activeFile ? `Current active file: ${activeFile}\nContent:\n\`\`\`\n${activeFileContent}\n\`\`\`` : "No file is currently active.");

            contextMessages.unshift({
                role: 'system',
                content: projectContext
            });

            const response = await fetch(`${apiUrl}/api/ai/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    messages: contextMessages,
                    model: model
                })
            });

            const data = await response.json();
            
            if (data.success) {
                setMessages(prev => [...prev, data.message]);
            } else {
                throw new Error(data.error || "Failed to get AI response");
            }
        } catch (error: any) {
            console.error("AI Assistant Error:", error);
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: `⚠️ Error: ${error.message}. Make sure OPENROUTER_API_KEY is set in the backend .env file.` 
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-surface-dark border-l border-white/5 shadow-2xl relative z-30">
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-surface-dark/80 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary shadow-lg shadow-primary/10">
                        <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white tracking-tight">AI Assistant</h3>
                        <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                            {model.split('/')[1] || model}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <select 
                        value={model} 
                        onChange={(e) => setModel(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-md text-[10px] text-slate-300 px-2 py-1 outline-none hover:bg-white/10 transition-colors"
                    >
                        <option value="google/gemini-2.0-flash-001">Gemini 2.0 Flash</option>
                        <option value="openai/gpt-4o">GPT-4o</option>
                        <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                        <option value="meta-llama/llama-3-70b-instruct">Llama 3 70B</option>
                    </select>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar scroll-smooth">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-slate-500 border border-white/5 shadow-inner">
                            <Bot className="w-8 h-8" />
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-white">How can I help you today?</h4>
                            <p className="text-xs text-slate-400 max-w-[200px]">
                                I can help you write code, debug errors, or explain complex logic.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 gap-2 w-full pt-4">
                            {[
                                { icon: <Code className="w-3 h-3"/>, text: "Explain this code", prompt: "Can you explain what this code does?" },
                                { icon: <Brain className="w-3 h-3"/>, text: "Optimize logic", prompt: "How can I optimize this logic?" },
                                { icon: <TerminalIcon className="w-3 h-3"/>, text: "Debug error", prompt: "Help me debug this error" }
                            ].map((item, i) => (
                                <button 
                                    key={i}
                                    onClick={() => setInput(item.prompt)}
                                    className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/5 text-left text-[11px] text-slate-300 hover:bg-white/10 hover:border-white/10 transition-all group"
                                >
                                    <span className="text-primary group-hover:scale-110 transition-transform">{item.icon}</span>
                                    {item.text}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <AnimatePresence initial={false}>
                    {messages.map((msg, index) => (
                        <motion.div 
                            key={index}
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            className={cn(
                                "flex flex-col gap-2",
                                msg.role === 'user' ? "items-end" : "items-start"
                            )}
                        >
                            <div className={cn(
                                "flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider",
                                msg.role === 'user' ? "flex-row-reverse text-slate-400" : "text-primary"
                            )}>
                                {msg.role === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                                {msg.role === 'user' ? 'You' : 'Assistant'}
                            </div>
                            <div className={cn(
                                "max-w-[90%] p-3 rounded-2xl text-[12px] leading-relaxed shadow-sm",
                                msg.role === 'user' 
                                    ? "bg-primary text-white rounded-tr-none" 
                                    : "bg-white/5 border border-white/10 text-slate-200 rounded-tl-none"
                            )}>
                                <div className="whitespace-pre-wrap break-words prose prose-invert prose-sm max-w-none">
                                    <ReactMarkdown components={{
                                        code({ node, inline, className, children, ...props }: any) {
                                            const match = /language-(\w+)/.exec(className || '');
                                            const codeContent = String(children).replace(/\n$/, '');
                                            
                                            return !inline && match ? (
                                                <div className="relative group/code mt-4 mb-4">
                                                    <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover/code:opacity-100 transition-opacity z-10">
                                                        <button
                                                            onClick={() => {
                                                                window.dispatchEvent(new CustomEvent('ide:insert-code', { detail: { code: codeContent } }));
                                                            }}
                                                            className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 border border-white/10 text-[10px] text-white flex items-center gap-1 backdrop-blur-sm transition-all"
                                                            title="Insert at cursor"
                                                        >
                                                            <Code2 className="w-3 h-3" />
                                                            Apply
                                                        </button>
                                                    </div>
                                                    <pre className="!bg-[#0D1117] !p-4 rounded-xl border border-white/5 overflow-x-auto text-[13px] font-mono leading-relaxed">
                                                        <code className={className} {...props}>
                                                            {children}
                                                        </code>
                                                    </pre>
                                                </div>
                                            ) : (
                                                <code className="bg-white/10 px-1.5 py-0.5 rounded text-accent-cyan font-mono text-xs" {...props}>
                                                    {children}
                                                </code>
                                            );
                                        }
                                    }}>
                                        {msg.content}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
                
                {isLoading && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col gap-2 items-start"
                    >
                        <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-primary">
                            <Bot className="w-3 h-3" />
                            Thinking...
                        </div>
                        <div className="bg-white/5 border border-white/10 p-3 rounded-2xl rounded-tl-none">
                            <div className="flex gap-1">
                                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></span>
                                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]"></span>
                            </div>
                        </div>
                    </motion.div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/5 bg-surface-dark/50 backdrop-blur-md">
                <div className="relative group">
                    <textarea 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                        placeholder="Ask anything about your code..."
                        className="w-full bg-background-dark border border-white/10 rounded-xl px-4 py-3 pr-12 text-sm text-white placeholder:text-slate-500 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all resize-none max-h-32 min-h-[50px] shadow-inner"
                        rows={1}
                    />
                    <button 
                        onClick={handleSendMessage}
                        disabled={isLoading || !input.trim()}
                        className="absolute right-2 bottom-2 p-2 rounded-lg bg-primary text-white shadow-lg shadow-primary/20 hover:bg-accent-blue disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-2 text-center">
                    Powered by <span className="text-slate-400">OpenRouter</span>
                </p>
            </div>
        </div>
    );
}
