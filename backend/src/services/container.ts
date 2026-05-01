// Docker container service for managing IDE environments
import Docker from 'dockerode';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { spawn } from 'child_process';

// Auto-detect Docker socket (Docker Desktop uses a different path on Linux)
function getDockerSocket(): string {
    const homeDir = os.homedir();
    const desktopSocket = path.join(homeDir, '.docker/desktop/docker.sock');

    if (fs.existsSync(desktopSocket)) {
        return desktopSocket;
    }

    if (os.platform() === 'win32') {
        return '//./pipe/docker_engine';
    }

    return '/var/run/docker.sock';
}

const docker = new Docker({ socketPath: getDockerSocket() });

export async function pingDocker(): Promise<boolean> {
    try {
        await docker.ping();
        return true;
    } catch (error) {
        return false;
    }
}

// Environment to Docker image mapping
const ENVIRONMENT_IMAGES: Record<string, string> = {
    python: 'codeblocking/python:latest',
    node: 'codeblocking/node:latest',
    java: 'codeblocking/java:latest',
    go: 'codeblocking/go:latest',
    rust: 'codeblocking/rust:latest',
    cpp: 'codeblocking/cpp:latest',
    php: 'codeblocking/php:latest',
    ruby: 'codeblocking/ruby:latest',
    multi: 'codeblocking/node:latest',
    base: 'codeblocking/base:latest',
};

function getImageBuildSpec(imageName: string): { contextPath: string; dockerfilePath: string } | null {
    const imageSuffix = imageName.replace(/^codeblocking\//, '').replace(/:latest$/, '');
    const candidateRoots = [
        path.resolve(process.cwd(), 'images'),
        path.resolve(process.cwd(), 'backend', 'images'),
    ];

    for (const imagesRoot of candidateRoots) {
        const contextPath = path.join(imagesRoot, imageSuffix);
        const dockerfilePath = path.join(contextPath, 'Dockerfile');

        if (fs.existsSync(dockerfilePath)) {
            return { contextPath, dockerfilePath };
        }
    }

    return null;
}

function buildDockerImage(imageName: string): Promise<void> {
    const buildSpec = getImageBuildSpec(imageName);

    if (!buildSpec) {
        return Promise.reject(new Error(`No local Dockerfile found for ${imageName}`));
    }

    return new Promise((resolve, reject) => {
        console.log(`[Container] Building ${imageName} from ${buildSpec.dockerfilePath}`);

        const child = spawn('docker', ['build', '-t', imageName, '-f', buildSpec.dockerfilePath, buildSpec.contextPath], {
            stdio: 'inherit',
            env: process.env,
        });

        child.on('error', reject);
        child.on('close', (code) => {
            if (code === 0) {
                resolve();
                return;
            }

            reject(new Error(`docker build failed for ${imageName} with exit code ${code ?? 'unknown'}`));
        });
    });
}

async function ensureImageAvailable(imageName: string): Promise<void> {
    const imageInfo = await docker.getImage(imageName).inspect().catch(() => null);
    if (imageInfo) {
        return;
    }

    if (imageName !== ENVIRONMENT_IMAGES.base) {
        await ensureImageAvailable(ENVIRONMENT_IMAGES.base);
    }

    await buildDockerImage(imageName);
}

// Port range for container bindings (21000+ to avoid conflicts)
const PORT_RANGE_START = 21000;

interface ContainerInfo {
    containerId: string;
    environment: string;
    ports: Map<number, number>; // container port -> host port
    projectPath: string;        // user workspace root mounted at /workspace
}

// Track active containers: "userId::language" -> ContainerInfo
// Keyed by language so all projects of the same language share ONE container.
const activeContainers: Map<string, ContainerInfo> = new Map();

// Track containers currently being spawned to prevent cleanup race conditions
const pendingContainerIds: Set<string> = new Set();

// Track used host ports
const usedPorts: Set<number> = new Set();

// "userId::language" — using '::' to avoid collisions with UUIDs that contain '-'
function getContainerKey(userId: string, language: string): string {
    return `${userId}::${language}`;
}

// Check if a port is actually available on the system
async function isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
        const net = require('net');
        const server = net.createServer();

        server.listen(port, '0.0.0.0');

        server.on('listening', () => {
            server.close();
            resolve(true);
        });

        server.on('error', () => {
            resolve(false);
        });
    });
}

async function findAvailablePort(): Promise<number> {
    for (let port = PORT_RANGE_START; port < PORT_RANGE_START + 1000; port++) {
        if (!usedPorts.has(port) && await isPortAvailable(port)) {
            usedPorts.add(port);
            return port;
        }
    }
    throw new Error('No available ports');
}

function releasePort(port: number): void {
    usedPorts.delete(port);
}

/**
 * Get the running container for a given user + language.
 * Returns null if no container exists or if it has stopped.
 */
export async function getContainer(userId: string, language: string): Promise<ContainerInfo | null> {
    const key = getContainerKey(userId, language);
    const info = activeContainers.get(key);

    if (!info) return null;

    // Verify container is still running
    try {
        const container = docker.getContainer(info.containerId);
        const data = await container.inspect();
        if (data.State.Running) {
            return info;
        }
    } catch {
        // Container no longer exists in Docker
    }

    activeContainers.delete(key);
    return null;
}

export async function forceStopContainer(userId: string, language: string): Promise<void> {
    await stopContainer(userId, language);
}

/**
 * Get or create a container for the given user + language.
 *
 * The ENTIRE user workspace directory is mounted at /workspace so that all
 * of the user's projects are accessible as subdirectories inside the one
 * container. Terminal sessions then set WorkingDir to /workspace/<projectId>.
 *
 * This means two Python projects share one container instead of two.
 */
export async function spawnContainer(
    userId: string,
    language: string,
    userWorkspacePath: string   // e.g. ~/.codeblocking/workspaces/<userId>
): Promise<ContainerInfo> {
    // Reuse existing container if it is still running
    const existing = await getContainer(userId, language);
    if (existing) {
        return existing;
    }

    const key = getContainerKey(userId, language);
    const imageName = ENVIRONMENT_IMAGES[language] || 'codeblocking/base';

    // Allocate host ports for container ports 3000-3005
    const portBindings: Record<string, { HostPort: string }[]> = {};
    const ports = new Map<number, number>();

    for (let containerPort = 3000; containerPort <= 3005; containerPort++) {
        const hostPort = await findAvailablePort();
        portBindings[`${containerPort}/tcp`] = [{ HostPort: hostPort.toString() }];
        ports.set(containerPort, hostPort);
    }

    // Resolve and normalise the workspace path
    let absoluteWorkspacePath = path.resolve(userWorkspacePath);

    if (os.platform() === 'win32') {
        absoluteWorkspacePath = absoluteWorkspacePath.replace(/\\/g, '/');
        if (absoluteWorkspacePath.match(/^[a-zA-Z]:\//)) {
            absoluteWorkspacePath = absoluteWorkspacePath.charAt(0).toLowerCase() + absoluteWorkspacePath.slice(1);
        }
    }

    console.log(`[Container] Spawning ${language} container for user ${userId}`);
    console.log(`[Container] Mounting workspace: ${absoluteWorkspacePath}`);

    // Build the local image if it is missing. These images are not published to a registry.
    try {
        await ensureImageAvailable(imageName);
        console.log(`[Container] Image ${imageName} is available`);
    } catch (pullError) {
        console.error(`[Container] Error checking/building image ${imageName}:`, pullError);
        throw pullError;
    }

    try {
        const container = await docker.createContainer({
            Image: imageName,
            Cmd: ['/bin/sh'],
            Tty: true,
            OpenStdin: true,
            WorkingDir: '/workspace',
            ExposedPorts: Object.keys(portBindings).reduce((acc, port) => ({ ...acc, [port]: {} }), {}),
            HostConfig: {
                // Mount the entire user workspace so every project is a subdir at /workspace/<projectId>
                Binds: [`${absoluteWorkspacePath}:/workspace:rw`],
                PortBindings: portBindings,
                NetworkMode: 'bridge',
                Memory: 512 * 1024 * 1024, // 512 MB
                CpuShares: 256,             // ~25% of a CPU core
            },
            Labels: {
                'codeblocking.userId': userId,
                'codeblocking.language': language,
                'codeblocking.environment': language,
                'codeblocking.userWorkspacePath': absoluteWorkspacePath,
            },
            Env: [
                'TERM=xterm-256color',
                'PS1=\\u@\\h:\\w\\$ ',
            ],
        });

        pendingContainerIds.add(container.id);

        try {
            await container.start();

            // Brief pause to let the container fully initialise
            await new Promise(resolve => setTimeout(resolve, 500));

            const info: ContainerInfo = {
                containerId: container.id,
                environment: language,
                ports,
                projectPath: absoluteWorkspacePath,
            };

            activeContainers.set(key, info);
            console.log(`[Container] Started ${key}: ${container.id.substring(0, 12)}`);
            console.log(`[Container] Ports:`, Array.from(ports.entries()).map(([c, h]) => `${c}->${h}`).join(', '));

            return info;
        } finally {
            pendingContainerIds.delete(container.id);
        }
    } catch (error) {
        ports.forEach((hostPort) => releasePort(hostPort));
        throw error;
    }
}

export async function execInContainer(
    userId: string,
    language: string
): Promise<Docker.Exec | null> {
    const info = await getContainer(userId, language);
    if (!info) return null;

    const container = docker.getContainer(info.containerId);

    return container.exec({
        Cmd: ['/bin/bash'],
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: true,
    });
}

export async function stopContainer(userId: string, language: string): Promise<void> {
    const key = getContainerKey(userId, language);
    const info = activeContainers.get(key);

    if (!info) return;

    try {
        const container = docker.getContainer(info.containerId);
        await container.stop({ t: 5 });
        await container.remove();
        console.log(`[Container] Stopped ${key}`);
    } catch (error) {
        console.error(`[Container] Error stopping ${key}:`, error);
    }

    info.ports.forEach((hostPort) => releasePort(hostPort));
    activeContainers.delete(key);
}

/**
 * Called on server startup instead of cleanupAllContainers.
 * Scans Docker for containers we previously managed and rebuilds the
 * in-memory activeContainers map so existing containers are reused rather
 * than destroyed and recreated.
 */
export async function reconnectExistingContainers(): Promise<void> {
    console.log('[Container] Scanning for existing containers to reconnect...');

    let containers: Docker.ContainerInfo[];
    try {
        containers = await docker.listContainers({
            filters: { label: ['codeblocking.userId'] },
        });
    } catch (err) {
        console.error('[Container] Docker not reachable during reconnect, skipping:', err);
        return;
    }

    for (const containerData of containers) {
        const userId = containerData.Labels['codeblocking.userId'];
        // Support both the new 'language' label and the old 'environment' label
        const language = containerData.Labels['codeblocking.language']
            || containerData.Labels['codeblocking.environment']
            || 'base';
        // Support both the new 'userWorkspacePath' label and the old 'projectPath' label
        const userWorkspacePath = containerData.Labels['codeblocking.userWorkspacePath']
            || containerData.Labels['codeblocking.projectPath']
            || '';

        if (!userId || !language) continue;

        // Rebuild port map from Docker's reported port bindings
        const ports = new Map<number, number>();
        for (const p of containerData.Ports) {
            if (p.PublicPort && p.PrivatePort) {
                ports.set(p.PrivatePort, p.PublicPort);
                usedPorts.add(p.PublicPort);
            }
        }

        const key = getContainerKey(userId, language);
        activeContainers.set(key, {
            containerId: containerData.Id,
            environment: language,
            ports,
            projectPath: userWorkspacePath,
        });

        console.log(`[Container] Reconnected ${key}: ${containerData.Id.substring(0, 12)}`);
    }

    console.log(`[Container] Reconnected ${activeContainers.size} container(s).`);
}

export async function cleanupAllContainers(): Promise<void> {
    console.log('[Container] Cleaning up all containers...');

    const keys = Array.from(activeContainers.keys());
    for (const key of keys) {
        // Key format: "userId::language"
        const separatorIndex = key.indexOf('::');
        if (separatorIndex === -1) continue;
        const userId = key.substring(0, separatorIndex);
        const language = key.substring(separatorIndex + 2);
        await stopContainer(userId, language);
    }

    // Also clean up any orphaned codeblocking containers not in our map
    let orphans: Docker.ContainerInfo[] = [];
    try {
        orphans = await docker.listContainers({
            filters: { label: ['codeblocking.userId'] },
        });
    } catch {
        return;
    }

    const activeIds = new Set(Array.from(activeContainers.values()).map(c => c.containerId));

    for (const containerInfo of orphans) {
        if (activeIds.has(containerInfo.Id) || pendingContainerIds.has(containerInfo.Id)) {
            continue;
        }
        try {
            const container = docker.getContainer(containerInfo.Id);
            await container.stop({ t: 1 });
            await container.remove();
            console.log(`[Container] Cleaned up orphan: ${containerInfo.Id.substring(0, 12)}`);
        } catch (error) {
            console.error('[Container] Error cleaning up orphan:', error);
        }
    }
}

export function getContainerPorts(userId: string, language: string): Map<number, number> | null {
    const key = getContainerKey(userId, language);
    return activeContainers.get(key)?.ports || null;
}