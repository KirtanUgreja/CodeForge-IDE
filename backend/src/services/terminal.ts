// Terminal service for managing Docker container terminals via Socket.IO
import { Server as SocketIOServer, Socket } from 'socket.io';
import Docker from 'dockerode';
import { Duplex } from 'stream';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { spawnContainer, getContainer, stopContainer } from './container';
import { getProjectPath, getUserWorkspacePath } from './git';

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

interface TerminalSession {
    userId: string;
    projectId: string;
    exec: Docker.Exec;
    stream: Duplex | null;
    socket: Socket;
}

const sessions: Map<string, TerminalSession> = new Map();

export function initializeTerminalService(io: SocketIOServer): void {
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
        } catch (error) {
            next(new Error('Authentication failed'));
        }
    });

    io.on('connection', (socket: Socket) => {
        console.log('Terminal socket connected:', socket.id);

        socket.on('terminal:create', async (data: { projectId: string }) => {
            try {
                const userId = socket.data.userId;
                const projectId = data.projectId;

                if (!projectId) {
                    socket.emit('terminal:error', { message: 'Project ID required' });
                    return;
                }

                console.log(`[Terminal] Creating session for user ${userId}, project ${projectId}`);

                // Resolve the specific project directory for validation
                // For collaborators, the project's files live in the owner's workspace.
                const { supabaseAdmin } = await import('../lib/supabase.js');
                const { data: project, error: projectErr } = await supabaseAdmin
                    .from('projects')
                    .select('user_id')
                    .eq('id', projectId)
                    .single();

                if (projectErr || !project) {
                    socket.emit('terminal:error', { message: 'Project not found in database.' });
                    return;
                }

                const ownerPath = getProjectPath(project.user_id, projectId);
                const userPath = getProjectPath(userId, projectId);

                // Prefer the owner's cloned project directory if it exists (shared clone)
                let projectPath: string;
                if (fs.existsSync(ownerPath)) {
                    projectPath = ownerPath;
                } else if (fs.existsSync(userPath)) {
                    // Fallback to user's own clone (if they cloned it themselves)
                    projectPath = userPath;
                } else {
                    // If owner hasn't cloned and current socket user isn't the owner, ask owner to open it.
                    if (userId !== project.user_id) {
                        socket.emit('terminal:error', { message: 'Project not found. Please ask the project owner to open this project first.' });
                        return;
                    }

                    // Owner hasn't cloned the project yet; require them to open it via the web UI first.
                    socket.emit('terminal:error', { message: 'Project not found. Please open the project first.' });
                    return;
                }

                const files = fs.readdirSync(projectPath);
                console.log(`[Terminal] Files in project (${projectPath}):`, files);

                // Prefer the saved project environment, then fall back to file detection.
                const { data: projectEnv } = await supabaseAdmin
                    .from('projects')
                    .select('environment')
                    .eq('id', projectId)
                    .single();

                let language = projectEnv?.environment;

                if (!language || language === 'base') {
                    const { detectEnvironment } = await import('./environment.js');
                    const detected = detectEnvironment(projectPath);
                    language = detected.environment !== 'base' ? detected.environment : (language || 'base');
                    console.log(`[Terminal] Detected environment: ${language} (${detected.reason})`);
                } else {
                    console.log(`[Terminal] Using project environment from DB: ${language}`);
                }

                // Containers mount the owner's workspace at /workspace so the project
                // subdirectory must exist inside the container. For collaborator sessions
                // we should reuse (or spawn) the owner's container so /workspace/<projectId>
                // is available.
                const containerOwnerId = project.user_id;
                const ownerWorkspacePath = getUserWorkspacePath(containerOwnerId);

                // Try to reuse the owner's container first (so collaborators share the same files)
                let containerInfo = await getContainer(containerOwnerId, language);

                if (!containerInfo) {
                    console.log(`[Terminal] Spawning ${language} container for owner ${containerOwnerId}`);
                    containerInfo = await spawnContainer(containerOwnerId, language, ownerWorkspacePath, projectId);
                } else {
                    console.log(`[Terminal] Reusing existing ${language} container for owner ${containerOwnerId}`);
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

                stream.on('data', (chunk: Buffer) => {
                    socket.emit('terminal:output', chunk.toString());
                });

                stream.on('end', () => {
                    socket.emit('terminal:exit', { exitCode: 0 });
                    sessions.delete(socket.id);
                });

                stream.on('error', (err: Error | unknown) => {
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
                const ports: Record<number, number> = {};
                containerInfo.ports.forEach((hostPort, containerPort) => {
                    ports[containerPort] = hostPort;
                });

                socket.emit('terminal:ready', { ports });
                console.log(`[Terminal] Session ready for ${userId}/${projectId} (${language} container)`);

            } catch (error) {
                const errorMessage = error instanceof Error
                    ? error.message
                    : typeof error === 'string'
                        ? error
                        : 'Failed to create terminal';
                console.error('[Terminal] Error creating terminal:', error);
                socket.emit('terminal:error', { message: errorMessage });
            }
        });

        socket.on('terminal:input', (data: string | { data: string }) => {
            const session = sessions.get(socket.id);
            if (session?.stream) {
                const input = typeof data === 'string' ? data : data.data;
                if (input) session.stream.write(input);
            }
        });

        socket.on('terminal:resize', (data: { cols: number; rows: number; terminalId?: string }) => {
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

export function getActiveSessionCount(): number {
    return sessions.size;
}

export async function cleanupTerminals(): Promise<void> {
    for (const [socketId, session] of sessions) {
        session.stream?.end();
        sessions.delete(socketId);
    }
}