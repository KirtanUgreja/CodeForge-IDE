import Docker from 'dockerode';
export declare function pingDocker(): Promise<boolean>;
interface ContainerInfo {
    containerId: string;
    environment: string;
    ports: Map<number, number>;
    projectPath: string;
}
/**
 * Get the running container for a given user + language.
 * Returns null if no container exists or if it has stopped.
 */
export declare function getContainer(userId: string, language: string): Promise<ContainerInfo | null>;
export declare function forceStopContainer(userId: string, language: string): Promise<void>;
/**
 * Get or create a container for the given user + language.
 *
 * The ENTIRE user workspace directory is mounted at /workspace so that all
 * of the user's projects are accessible as subdirectories inside the one
 * container. Terminal sessions then set WorkingDir to /workspace/<projectId>.
 *
 * This means two Python projects share one container instead of two.
 */
export declare function spawnContainer(userId: string, language: string, userWorkspacePath: string): Promise<ContainerInfo>;
export declare function execInContainer(userId: string, language: string): Promise<Docker.Exec | null>;
export declare function stopContainer(userId: string, language: string): Promise<void>;
/**
 * Called on server startup instead of cleanupAllContainers.
 * Scans Docker for containers we previously managed and rebuilds the
 * in-memory activeContainers map so existing containers are reused rather
 * than destroyed and recreated.
 */
export declare function reconnectExistingContainers(): Promise<void>;
export declare function cleanupAllContainers(): Promise<void>;
export declare function getContainerPorts(userId: string, language: string): Map<number, number> | null;
export {};
