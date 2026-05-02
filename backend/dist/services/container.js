"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pingDocker = pingDocker;
exports.getContainer = getContainer;
exports.forceStopContainer = forceStopContainer;
exports.spawnContainer = spawnContainer;
exports.execInContainer = execInContainer;
exports.stopContainer = stopContainer;
exports.reconnectExistingContainers = reconnectExistingContainers;
exports.cleanupAllContainers = cleanupAllContainers;
exports.getContainerPorts = getContainerPorts;
// Docker container service for managing IDE environments
const dockerode_1 = __importDefault(require("dockerode"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const fs_1 = __importDefault(require("fs"));
const child_process_1 = require("child_process");
// Auto-detect Docker socket (Docker Desktop uses a different path on Linux)
function getDockerSocket() {
    const homeDir = os_1.default.homedir();
    const desktopSocket = path_1.default.join(homeDir, '.docker/desktop/docker.sock');
    if (fs_1.default.existsSync(desktopSocket)) {
        return desktopSocket;
    }
    if (os_1.default.platform() === 'win32') {
        return '//./pipe/docker_engine';
    }
    return '/var/run/docker.sock';
}
const docker = new dockerode_1.default({ socketPath: getDockerSocket() });
async function pingDocker() {
    try {
        await docker.ping();
        return true;
    }
    catch (error) {
        return false;
    }
}
// Environment to Docker image mapping
const ENVIRONMENT_IMAGES = {
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
function getImageBuildSpec(imageName) {
    const imageSuffix = imageName.replace(/^codeblocking\//, '').replace(/:latest$/, '');
    const candidateRoots = [
        path_1.default.resolve(process.cwd(), 'images'),
        path_1.default.resolve(process.cwd(), 'backend', 'images'),
    ];
    for (const imagesRoot of candidateRoots) {
        const contextPath = path_1.default.join(imagesRoot, imageSuffix);
        const dockerfilePath = path_1.default.join(contextPath, 'Dockerfile');
        if (fs_1.default.existsSync(dockerfilePath)) {
            return { contextPath, dockerfilePath };
        }
    }
    return null;
}
function buildDockerImage(imageName) {
    const buildSpec = getImageBuildSpec(imageName);
    if (!buildSpec) {
        return Promise.reject(new Error(`No local Dockerfile found for ${imageName}`));
    }
    return new Promise((resolve, reject) => {
        console.log(`[Container] Building ${imageName} from ${buildSpec.dockerfilePath}`);
        const child = (0, child_process_1.spawn)('docker', ['build', '-t', imageName, '-f', buildSpec.dockerfilePath, buildSpec.contextPath], {
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
async function ensureImageAvailable(imageName) {
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
// Track active containers: "userId::language" -> ContainerInfo
// Keyed by language so all projects of the same language share ONE container.
const activeContainers = new Map();
// Track containers currently being spawned to prevent cleanup race conditions
const pendingContainerIds = new Set();
// Track used host ports
const usedPorts = new Set();
// "userId::language" — using '::' to avoid collisions with UUIDs that contain '-'
function getContainerKey(userId, language) {
    return `${userId}::${language}`;
}
// Check if a port is actually available on the system
async function isPortAvailable(port) {
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
async function findAvailablePort() {
    for (let port = PORT_RANGE_START; port < PORT_RANGE_START + 1000; port++) {
        if (!usedPorts.has(port) && await isPortAvailable(port)) {
            usedPorts.add(port);
            return port;
        }
    }
    throw new Error('No available ports');
}
function releasePort(port) {
    usedPorts.delete(port);
}
/**
 * Get the running container for a given user + language.
 * Returns null if no container exists or if it has stopped.
 */
async function getContainer(userId, language) {
    const key = getContainerKey(userId, language);
    const info = activeContainers.get(key);
    if (!info)
        return null;
    // Verify container is still running
    try {
        const container = docker.getContainer(info.containerId);
        const data = await container.inspect();
        if (data.State.Running) {
            return info;
        }
    }
    catch {
        // Container no longer exists in Docker
    }
    activeContainers.delete(key);
    return null;
}
async function forceStopContainer(userId, language) {
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
async function spawnContainer(userId, language, userWorkspacePath, // e.g. ~/.codeblocking/workspaces/<userId>
projectId) {
    // Reuse existing container if it is still running
    // First try direct lookup for this user/language
    const existing = await getContainer(userId, language);
    if (existing) {
        return existing;
    }
    // If a projectId is provided, prefer any existing container (any user)
    // whose mounted workspace already contains the project directory. This
    // prevents spawning duplicate containers for collaborators when the
    // owner's container already has the project mounted.
    if (projectId) {
        for (const [, info] of activeContainers) {
            if (info.environment !== language)
                continue;
            try {
                const candidateProjectPath = path_1.default.join(info.projectPath, projectId);
                if (fs_1.default.existsSync(candidateProjectPath)) {
                    console.log(`[Container] Reusing container ${info.containerId.substring(0, 12)} because it contains project ${projectId}`);
                    return info;
                }
            }
            catch (err) {
                // ignore
            }
        }
    }
    const key = getContainerKey(userId, language);
    const imageName = ENVIRONMENT_IMAGES[language] || 'codeblocking/base';
    // Allocate host ports for container ports 3000-3005
    const portBindings = {};
    const ports = new Map();
    for (let containerPort = 3000; containerPort <= 3005; containerPort++) {
        const hostPort = await findAvailablePort();
        portBindings[`${containerPort}/tcp`] = [{ HostPort: hostPort.toString() }];
        ports.set(containerPort, hostPort);
    }
    // Resolve and normalise the workspace path
    let absoluteWorkspacePath = path_1.default.resolve(userWorkspacePath);
    if (os_1.default.platform() === 'win32') {
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
    }
    catch (pullError) {
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
                CpuShares: 256, // ~25% of a CPU core
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
            const info = {
                containerId: container.id,
                environment: language,
                ports,
                projectPath: absoluteWorkspacePath,
            };
            activeContainers.set(key, info);
            console.log(`[Container] Started ${key}: ${container.id.substring(0, 12)}`);
            console.log(`[Container] Ports:`, Array.from(ports.entries()).map(([c, h]) => `${c}->${h}`).join(', '));
            return info;
        }
        finally {
            pendingContainerIds.delete(container.id);
        }
    }
    catch (error) {
        ports.forEach((hostPort) => releasePort(hostPort));
        throw error;
    }
}
async function execInContainer(userId, language) {
    const info = await getContainer(userId, language);
    if (!info)
        return null;
    const container = docker.getContainer(info.containerId);
    return container.exec({
        Cmd: ['/bin/bash'],
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: true,
    });
}
async function stopContainer(userId, language) {
    const key = getContainerKey(userId, language);
    const info = activeContainers.get(key);
    if (!info)
        return;
    try {
        const container = docker.getContainer(info.containerId);
        await container.stop({ t: 5 });
        await container.remove();
        console.log(`[Container] Stopped ${key}`);
    }
    catch (error) {
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
async function reconnectExistingContainers() {
    console.log('[Container] Scanning for existing containers to reconnect...');
    let containers;
    try {
        containers = await docker.listContainers({
            filters: { label: ['codeblocking.userId'] },
        });
    }
    catch (err) {
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
        if (!userId || !language)
            continue;
        // Rebuild port map from Docker's reported port bindings
        const ports = new Map();
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
async function cleanupAllContainers() {
    console.log('[Container] Cleaning up all containers...');
    const keys = Array.from(activeContainers.keys());
    for (const key of keys) {
        // Key format: "userId::language"
        const separatorIndex = key.indexOf('::');
        if (separatorIndex === -1)
            continue;
        const userId = key.substring(0, separatorIndex);
        const language = key.substring(separatorIndex + 2);
        await stopContainer(userId, language);
    }
    // Also clean up any orphaned codeblocking containers not in our map
    let orphans = [];
    try {
        orphans = await docker.listContainers({
            filters: { label: ['codeblocking.userId'] },
        });
    }
    catch {
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
        }
        catch (error) {
            console.error('[Container] Error cleaning up orphan:', error);
        }
    }
}
function getContainerPorts(userId, language) {
    const key = getContainerKey(userId, language);
    return activeContainers.get(key)?.ports || null;
}
