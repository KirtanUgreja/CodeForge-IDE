"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeTerminalService = initializeTerminalService;
exports.getActiveSessionCount = getActiveSessionCount;
exports.cleanupTerminals = cleanupTerminals;
const dockerode_1 = __importDefault(require("dockerode"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const fs_1 = __importDefault(require("fs"));
const container_1 = require("./container");
const git_1 = require("./git");
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
const sessions = new Map();
function initializeTerminalService(io) {
    // Middleware to authenticate socket connections
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token;
            if (!token) {
                return next(new Error('Authentication required'));
            }
            const { supabaseAdmin } = await import('../lib/supabase.js');
            const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
            if (error || !user) {
                return next(new Error('Invalid token'));
            }
            socket.data.userId = user.id;
            next();
        }
        catch (error) {
            next(new Error('Authentication failed'));
        }
    });
    io.on('connection', (socket) => {
        console.log('Terminal socket connected:', socket.id);
        socket.on('terminal:create', async (data) => {
            try {
                const userId = socket.data.userId;
                const projectId = data.projectId;
                if (!projectId) {
                    socket.emit('terminal:error', { message: 'Project ID required' });
                    return;
                }
                console.log(`[Terminal] Creating session for user ${userId}, project ${projectId}`);
                // Resolve the specific project directory for validation
                const projectPath = (0, git_1.getProjectPath)(userId, projectId);
                if (!fs_1.default.existsSync(projectPath)) {
                    socket.emit('terminal:error', { message: 'Project not found. Please open the project first.' });
                    return;
                }
                const files = fs_1.default.readdirSync(projectPath);
                console.log(`[Terminal] Files in project:`, files);
                // --- Detect language FIRST so we can look up the shared container ---
                const { detectEnvironment } = await import('./environment.js');
                const detected = detectEnvironment(projectPath);
                const language = detected.environment;
                console.log(`[Terminal] Detected environment: ${language} (${detected.reason})`);
                // The entire user workspace is mounted at /workspace inside the container.
                // Each project lives at /workspace/<projectId>.
                const userWorkspacePath = (0, git_1.getUserWorkspacePath)(userId);
                // Get the shared container for this language, or spawn one
                let containerInfo = await (0, container_1.getContainer)(userId, language);
                if (!containerInfo) {
                    console.log(`[Terminal] Spawning ${language} container for user ${userId}`);
                    containerInfo = await (0, container_1.spawnContainer)(userId, language, userWorkspacePath);
                }
                else {
                    console.log(`[Terminal] Reusing existing ${language} container for user ${userId}`);
                }
                const container = docker.getContainer(containerInfo.containerId);
                // Each terminal exec drops into the specific project subdirectory
                const projectWorkDir = `/workspace/${projectId}`;
                const exec = await container.exec({
                    Cmd: ['/bin/sh'],
                    AttachStdin: true,
                    AttachStdout: true,
                    AttachStderr: true,
                    Tty: true,
                    WorkingDir: projectWorkDir,
                    Env: [
                        'TERM=xterm-256color',
                        'PS1=\\u@\\h:\\w\\$ ',
                    ],
                });
                const stream = await exec.start({
                    hijack: true,
                    stdin: true,
                    Tty: true,
                });
                sessions.set(socket.id, {
                    userId,
                    projectId,
                    exec,
                    stream,
                    socket,
                });
                stream.on('data', (chunk) => {
                    socket.emit('terminal:output', chunk.toString());
                });
                stream.on('end', () => {
                    socket.emit('terminal:exit', { exitCode: 0 });
                    sessions.delete(socket.id);
                });
                stream.on('error', (err) => {
                    const errorMessage = err instanceof Error
                        ? err.message
                        : typeof err === 'string'
                            ? err
                            : 'Unknown terminal stream error';
                    console.error('[Terminal] Stream error:', err);
                    socket.emit('terminal:error', { message: errorMessage || 'Stream error occurred' });
                });
                setTimeout(() => {
                    stream.write('clear\n');
                }, 100);
                // Send port mappings to the client
                const ports = {};
                containerInfo.ports.forEach((hostPort, containerPort) => {
                    ports[containerPort] = hostPort;
                });
                socket.emit('terminal:ready', { ports });
                console.log(`[Terminal] Session ready for ${userId}/${projectId} (${language} container)`);
            }
            catch (error) {
                const errorMessage = error instanceof Error
                    ? error.message
                    : typeof error === 'string'
                        ? error
                        : 'Failed to create terminal';
                console.error('[Terminal] Error creating terminal:', error);
                socket.emit('terminal:error', { message: errorMessage });
            }
        });
        socket.on('terminal:input', (data) => {
            const session = sessions.get(socket.id);
            if (session?.stream) {
                const input = typeof data === 'string' ? data : data.data;
                if (input)
                    session.stream.write(input);
            }
        });
        socket.on('terminal:resize', (data) => {
            const session = sessions.get(socket.id);
            if (session?.exec) {
                session.exec.resize({ w: data.cols, h: data.rows }).catch((err) => {
                    console.error('[Terminal] Error resizing terminal:', err);
                });
            }
        });
        socket.on('disconnect', () => {
            const session = sessions.get(socket.id);
            if (session) {
                session.stream?.end();
                sessions.delete(socket.id);
                console.log('[Terminal] Disconnected:', socket.id);
            }
        });
    });
    console.log('Terminal service initialized');
}
function getActiveSessionCount() {
    return sessions.size;
}
async function cleanupTerminals() {
    for (const [socketId, session] of sessions) {
        session.stream?.end();
        sessions.delete(socketId);
    }
}
