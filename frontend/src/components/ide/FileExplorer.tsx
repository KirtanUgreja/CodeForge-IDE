"use client";

import { useEffect, useState } from "react";
import {
    ChevronRight,
    ChevronDown,
    File,
    Folder,
    FolderOpen,
    FileCode2,
    FileJson,
    FileType,
    RefreshCw,
    Loader2,
    FilePlus,
    FolderPlus,
    Trash2,
    X,
    MoreVertical,
    Search,
    Upload
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIdeStore, FileNode } from "@/store/ide-store";
import { api } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { useRef } from "react";

// Custom Icon mapping with Neon Colors
const FileIcon = ({ name, className }: { name: string; className?: string }) => {
    if (name.endsWith(".tsx") || name.endsWith(".ts")) return <FileCode2 className={cn("text-accent-blue", className)} />;
    if (name.endsWith(".jsx") || name.endsWith(".js")) return <FileCode2 className={cn("text-accent-yellow", className)} />;
    if (name.endsWith(".py")) return <FileCode2 className={cn("text-accent-yellow", className)} />;
    if (name.endsWith(".java")) return <FileCode2 className={cn("text-accent-red", className)} />;
    if (name.endsWith(".go")) return <FileCode2 className={cn("text-[#00add8]", className)} />;
    if (name.endsWith(".rs")) return <FileCode2 className={cn("text-[#dea584]", className)} />;
    if (name.endsWith(".cpp") || name.endsWith(".hpp") || name.endsWith(".c") || name.endsWith(".h")) return <FileCode2 className={cn("text-[#00599c]", className)} />;
    if (name.endsWith(".php")) return <FileCode2 className={cn("text-[#4f5b93]", className)} />;
    if (name.endsWith(".rb")) return <FileCode2 className={cn("text-[#cc342d]", className)} />;
    if (name.endsWith(".css")) return <FileType className={cn("text-accent-cyan", className)} />;
    if (name.endsWith(".json")) return <FileJson className={cn("text-accent-yellow", className)} />;
    if (name.endsWith(".md")) return <File className={cn("text-accent-purple", className)} />;
    return <File className={cn("text-slate-500", className)} />;
};

interface FileTreeItemProps {
    node: FileNode;
    level: number;
    onSelect: (node: FileNode) => void;
    onDelete: (node: FileNode) => void;
    onAddFile: (parentPath: string) => void;
    onAddFolder: (parentPath: string) => void;
    onUpload: (parentPath: string) => void;
}

const FileTreeItem = ({ node, level, onSelect, onDelete, onAddFile, onAddFolder, onUpload }: FileTreeItemProps) => {
    const [isOpen, setIsOpen] = useState(level === 0);
    const [showActions, setShowActions] = useState(false);
    const { activeFile } = useIdeStore();
    const isSelected = activeFile === node.path;

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (node.type === "folder") {
            setIsOpen(!isOpen);
        } else {
            onSelect(node);
        }
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete(node);
    };

    const handleAddFile = (e: React.MouseEvent) => {
        e.stopPropagation();
        onAddFile(node.path);
        if (!isOpen) setIsOpen(true);
    };

    const handleAddFolder = (e: React.MouseEvent) => {
        e.stopPropagation();
        onAddFolder(node.path);
        if (!isOpen) setIsOpen(true);
    };

    const handleUpload = (e: React.MouseEvent) => {
        e.stopPropagation();
        onUpload(node.path);
        if (!isOpen) setIsOpen(true);
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: level * 0.02 }}
        >
            <motion.div
                className={cn(
                    "group flex items-center py-1.5 px-2 cursor-pointer select-none text-sm transition-all duration-200 border-l-[3px] border-transparent mx-1 rounded-r-md font-sans font-medium",
                    isSelected
                        ? "bg-primary/10 text-white border-primary"
                        : "text-slate-400 hover:bg-[#1f2428] hover:text-slate-200"
                )}
                style={{ paddingLeft: `${level * 12 + 8}px` }}
                onClick={handleClick}
                onMouseEnter={() => setShowActions(true)}
                onMouseLeave={() => setShowActions(false)}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.99 }}
            >
                <span className="mr-2 opacity-70">
                    {node.type === "folder" ? (
                        isOpen
                            ? <ChevronDown className="w-3.5 h-3.5 text-slate-300" />
                            : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                    ) : (
                        <span className="w-3.5 inline-block" />
                    )}
                </span>

                <span className="mr-2.5">
                    {node.type === "folder" ? (
                        isOpen ? (
                            <FolderOpen className="w-4 h-4 text-accent-yellow drop-shadow-sm" />
                        ) : (
                            <Folder className="w-4 h-4 text-accent-yellow opacity-80" />
                        )
                    ) : (
                        <FileIcon name={node.name} className="w-4 h-4" />
                    )}
                </span>

                <span className="truncate flex-1 tracking-wide">{node.name}</span>

                <AnimatePresence>
                    {showActions && (
                        <motion.div
                            className="flex items-center gap-1"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.1 }}
                        >
                            {node.type === "folder" && (
                                <>
                                    <motion.button
                                        onClick={handleAddFile}
                                        className="p-1 hover:bg-white/10 rounded text-slate-500 hover:text-white"
                                        title="New File"
                                    >
                                        <FilePlus className="w-3 h-3" />
                                    </motion.button>
                                    <motion.button
                                        onClick={handleAddFolder}
                                        className="p-1 hover:bg-white/10 rounded text-slate-500 hover:text-white"
                                        title="New Folder"
                                    >
                                        <FolderPlus className="w-3 h-3" />
                                    </motion.button>
                                    <motion.button
                                        onClick={handleUpload}
                                        className="p-1 hover:bg-white/10 rounded text-slate-500 hover:text-white"
                                        title="Upload File"
                                    >
                                        <Upload className="w-3 h-3" />
                                    </motion.button>
                                </>
                            )}
                            <motion.button
                                onClick={handleDelete}
                                className="p-1 hover:bg-red-500/20 hover:text-red-400 rounded text-slate-500"
                                title="Delete"
                            >
                                <Trash2 className="w-3 h-3" />
                            </motion.button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {isOpen && node.children && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    {node.children.map((child) => (
                        <FileTreeItem
                            key={child.id}
                            node={child}
                            level={level + 1}
                            onSelect={onSelect}
                            onDelete={onDelete}
                            onAddFile={onAddFile}
                            onAddFolder={onAddFolder}
                            onUpload={onUpload}
                        />
                    ))}
                </motion.div>
            )}
        </motion.div>
    );
};

// ... InputDialog and ConfirmDialog components remain similar but with updated styling
const InputDialog = ({
    isOpen,
    title,
    placeholder,
    onSubmit,
    onClose
}: {
    isOpen: boolean;
    title: string;
    placeholder: string;
    onSubmit: (value: string) => void;
    onClose: () => void;
}) => {
    const [value, setValue] = useState("");

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (value.trim()) {
            onSubmit(value.trim());
            setValue("");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
            <motion.div
                className="glass-card bg-[#161b22] border border-white/10 rounded-xl p-5 w-80 shadow-2xl"
                onClick={e => e.stopPropagation()}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-white font-display">{title}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-md text-slate-400 hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        value={value}
                        onChange={e => setValue(e.target.value)}
                        placeholder={placeholder}
                        className="w-full px-3 py-2.5 bg-[#0D1117] border border-white/10 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-mono"
                        autoFocus
                    />
                    <div className="flex justify-end gap-2 mt-5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-3 py-1.5 text-xs font-bold bg-primary text-white hover:bg-primary/90 rounded-lg shadow-lg shadow-primary/20 transition-all"
                        >
                            Create
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

const ConfirmDialog = ({
    isOpen,
    title,
    message,
    onConfirm,
    onClose
}: {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onClose: () => void;
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
            <motion.div
                className="glass-card bg-[#161b22] border border-white/10 rounded-xl p-5 w-80 shadow-2xl"
                onClick={e => e.stopPropagation()}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
            >
                <h3 className="text-sm font-bold mb-2 text-white font-display">{title}</h3>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">{message}</p>
                <div className="flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => { onConfirm(); onClose(); }}
                        className="px-3 py-1.5 text-xs font-bold bg-red-500 text-white hover:bg-red-600 rounded-lg shadow-lg shadow-red-500/20 transition-all"
                    >
                        Delete
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default function FileExplorer() {
    const { fileTree, openFile, fetchFileTree, fetchFileContent, isLoadingFiles, isBackendConnected, closeFile, projectId } = useIdeStore();

    const [showNewFileDialog, setShowNewFileDialog] = useState(false);
    const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [currentPath, setCurrentPath] = useState("");
    const [itemToDelete, setItemToDelete] = useState<FileNode | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (projectId) {
            fetchFileTree();
        }
    }, [fetchFileTree, projectId]);

    const handleFileSelect = async (node: FileNode) => {
        openFile(node.path);
        await fetchFileContent(node.path);
    };

    const handleAddFile = (parentPath: string) => {
        setCurrentPath(parentPath);
        setShowNewFileDialog(true);
    };

    const handleAddFolder = (parentPath: string) => {
        setCurrentPath(parentPath);
        setShowNewFolderDialog(true);
    };

    const handleUploadClick = (parentPath: string) => {
        setCurrentPath(parentPath);
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !projectId) return;

        const response = await api.uploadFile(projectId, currentPath, file);
        if (response.success) {
            fetchFileTree();
        } else {
            alert(`Upload failed: ${response.error}`);
        }

        // Reset input
        e.target.value = "";
    };

    const handleDelete = (node: FileNode) => {
        setItemToDelete(node);
        setShowDeleteDialog(true);
    };

    const createFile = async (name: string) => {
        if (!projectId) return;
        const path = currentPath ? `${currentPath}/${name}` : name;
        const response = await api.createFile(projectId, path);
        if (response.success) {
            fetchFileTree();
        }
        setShowNewFileDialog(false);
    };

    const createFolder = async (name: string) => {
        if (!projectId) return;
        const path = currentPath ? `${currentPath}/${name}` : name;
        const response = await api.createFolder(projectId, path);
        if (response.success) {
            fetchFileTree();
        }
        setShowNewFolderDialog(false);
    };

    const confirmDelete = async () => {
        if (!itemToDelete || !projectId) return;
        const response = await api.deleteItem(projectId, itemToDelete.path);
        if (response.success) {
            closeFile(itemToDelete.path);
            fetchFileTree();
        }
        setItemToDelete(null);
    };

    const handleRootAddFile = () => {
        setCurrentPath("");
        setShowNewFileDialog(true);
    };

    const handleRootAddFolder = () => {
        setCurrentPath("");
        setShowNewFolderDialog(true);
    };

    const handleRootUpload = () => {
        setCurrentPath("");
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    return (
        <motion.div
            className="h-full w-full flex flex-col bg-surface-dark border-r border-white/5 min-w-0"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
        >
            {/* Hidden File Input */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
            />

            <div className="p-3 pl-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-white/5 flex items-center justify-between bg-[#161b22] select-none font-display">
                <span>EXPLORER</span>
                <div className="flex items-center gap-0.5">
                    <motion.button
                        onClick={handleRootAddFile}
                        className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-slate-500 hover:text-white"
                        title="New File"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <FilePlus className="w-3.5 h-3.5" />
                    </motion.button>
                    <motion.button
                        onClick={handleRootAddFolder}
                        className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-slate-500 hover:text-white"
                        title="New Folder"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <FolderPlus className="w-3.5 h-3.5" />
                    </motion.button>
                    <motion.button
                        onClick={handleRootUpload}
                        className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-slate-500 hover:text-white"
                        title="Upload File"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <Upload className="w-3.5 h-3.5" />
                    </motion.button>
                    <motion.button
                        onClick={() => fetchFileTree()}
                        className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-slate-500 hover:text-white"
                        title="Refresh"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        {isLoadingFiles ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <RefreshCw className="w-3.5 h-3.5" />
                        )}
                    </motion.button>
                </div>
            </div>

            <div className="flex-1 overflow-auto py-2 bg-[#0D1117] custom-scrollbar">
                {!isBackendConnected && fileTree.length === 0 ? (
                    <motion.div
                        className="p-6 text-xs text-slate-500 text-center flex flex-col items-center gap-3"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        <p className="font-medium">Connecting to workspace...</p>
                    </motion.div>
                ) : fileTree.length === 0 ? (
                    <motion.div
                        className="p-6 text-xs text-slate-500 text-center"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <p className="mb-3">Workspace is empty</p>
                        <div className="flex flex-col gap-2 px-4">
                            <motion.button
                                onClick={handleRootAddFile}
                                className="w-full px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-xs font-bold transition-colors"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                Create File
                            </motion.button>
                            <motion.button
                                onClick={handleRootUpload}
                                className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 rounded-lg text-xs font-bold transition-colors"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                Upload File
                            </motion.button>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                    >
                        {fileTree.map((node) => (
                            <FileTreeItem
                                key={node.id}
                                node={node}
                                level={0}
                                onSelect={handleFileSelect}
                                onDelete={handleDelete}
                                onAddFile={handleAddFile}
                                onAddFolder={handleAddFolder}
                                onUpload={handleUploadClick}
                            />
                        ))}
                    </motion.div>
                )}
            </div>

            <InputDialog
                isOpen={showNewFileDialog}
                title="New File"
                placeholder="filename.ts"
                onSubmit={createFile}
                onClose={() => setShowNewFileDialog(false)}
            />
            <InputDialog
                isOpen={showNewFolderDialog}
                title="New Folder"
                placeholder="folder-name"
                onSubmit={createFolder}
                onClose={() => setShowNewFolderDialog(false)}
            />
            <ConfirmDialog
                isOpen={showDeleteDialog}
                title="Delete Item"
                message={`Are you sure you want to delete "${itemToDelete?.name}"? This action cannot be undone.`}
                onConfirm={confirmDelete}
                onClose={() => { setShowDeleteDialog(false); setItemToDelete(null); }}
            />
        </motion.div>
    );
}