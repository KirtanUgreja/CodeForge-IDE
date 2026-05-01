// Terminal Socket client for real-time terminal communication

import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class TerminalSocket {
    private socket: Socket | null = null;
    private onDataCallback: ((data: string) => void) | null = null;
    private onReadyCallback: (() => void) | null = null;
    private onExitCallback: ((info: { exitCode: number; signal?: string }) => void) | null = null;
    private projectId: string | null = null;
    private authToken: string | null = null;
    private userId: string | null = null;
    private environment: string = 'base';

    setAuth(projectId: string, authToken: string, userId: string, environment?: string): void {
        this.projectId = projectId;
        this.authToken = authToken;
        this.userId = userId;
        this.environment = environment || 'base';
    }

    connect(): void {
        if (this.socket?.connected) return;

        this.socket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            auth: {
                token: this.authToken,
                userId: this.userId,
                projectId: this.projectId,
                environment: this.environment,
            },
        });

        this.socket.on('connect', () => {
            console.log('Terminal socket connected');
            this.socket?.emit('terminal:create', { projectId: this.projectId });
        });

        this.socket.on('terminal:ready', () => {
            console.log('Terminal ready');
            this.onReadyCallback?.();
        });

        this.socket.on('terminal:ready', (data: { ports?: Record<number, number> }) => {
            console.log('Terminal ready with ports:', data.ports);
            if (data.ports) {
                console.log('Port mappings:');
                Object.entries(data.ports).forEach(([containerPort, hostPort]) => {
                    console.log(`  Container port ${containerPort} -> Host port ${hostPort}`);
                    console.log(`  Access at: http://localhost:${hostPort}`);
                });
            }
            this.onReadyCallback?.();
        });

        this.socket.on('terminal:output', (data: string) => {
            this.onDataCallback?.(data);
        });

        this.socket.on('terminal:exit', (info: { exitCode: number; signal?: string }) => {
            console.log('Terminal exited:', info);
            this.onExitCallback?.(info);
        });

        this.socket.on('terminal:error', (error: { message?: string }) => {
            console.error('Terminal error:', error?.message || 'Unknown error', error);
        });

        this.socket.on('disconnect', () => {
            console.log('Terminal socket disconnected');
        });
    }

    disconnect(): void {
        this.socket?.disconnect();
        this.socket = null;
    }

    write(data: string): void {
        this.socket?.emit('terminal:input', data);
    }

    resize(cols: number, rows: number): void {
        this.socket?.emit('terminal:resize', { cols, rows });
    }

    onData(callback: (data: string) => void): void {
        this.onDataCallback = callback;
    }

    onReady(callback: () => void): void {
        this.onReadyCallback = callback;
    }

    onExit(callback: (info: { exitCode: number; signal?: string }) => void): void {
        this.onExitCallback = callback;
    }

    isConnected(): boolean {
        return this.socket?.connected || false;
    }
}

export const terminalSocket = new TerminalSocket();
