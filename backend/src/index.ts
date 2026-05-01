import 'dotenv/config' // Load environment variables - Reload for lowercase path fix3400 config
import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'
import githubRoutes from './routes/github.js'
import projectsRoutes from './routes/projects.js'
import filesRoutes from './routes/files.js'
import collaboratorsRoutes from './routes/collaborators.js'
import aiRoutes from './routes/ai.js'
import { initializeTerminalService, getActiveSessionCount, cleanupTerminals } from './services/terminal.js'
import { cleanupAllContainers, reconnectExistingContainers } from './services/container.js'

const app = express()
const httpServer = createServer(app)
const PORT = process.env.PORT || 4001
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4000'

// Allow local networks safely
const allowedOrigins = [FRONTEND_URL, 'http://localhost:4000', 'http://127.0.0.1:4000', 'http://localhost:3000'];

import { WebSocketServer } from 'ws'
import path from 'path'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { setupWSConnection } = require(path.join(process.cwd(), 'node_modules', 'y-websocket', 'bin', 'utils.js'))

// Collaboration WebSocket server (y-websocket for real-time editing)
const wss = new WebSocketServer({ noServer: true })
wss.on('connection', (ws, req) => {
    console.log(`[Collab] New WebSocket connection for: ${req.url}`)
    if (setupWSConnection) {
        setupWSConnection(ws, req);
    }
})

// IMPORTANT: Register upgrade handler BEFORE Socket.IO so y-websocket gets priority
httpServer.on('upgrade', (request, socket, head) => {
    if (request.url?.startsWith('/socket/collaboration')) {
        console.log(`[Collab] Upgrading to WebSocket: ${request.url}`)
        wss.handleUpgrade(request, socket, head, ws => {
            wss.emit('connection', ws, request)
        })
    }
    // Socket.IO handles its own upgrades via /socket.io/ path automatically
})

// Socket.IO setup (for terminal connections)
const io = new Server(httpServer, {
    cors: {
        origin: function (origin, callback) {
            if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.startsWith('http://192.168.') || origin.startsWith('http://10.')) {
                callback(null, true)
            } else {
                callback(null, allowedOrigins.includes(origin))
            }
        },
        methods: ['GET', 'POST'],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    // Tell Socket.IO NOT to handle upgrade for our collaboration path
    allowUpgrades: true
})

// Initialize terminal service with Socket.IO
initializeTerminalService(io)

// Middleware
app.use(cors({
    origin: function (origin, callback) {
        // dynamically allow local IPs or fallback to predefined
        if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.startsWith('http://192.168.') || origin.startsWith('http://10.')) {
            callback(null, true)
        } else {
            callback(null, allowedOrigins.includes(origin))
        }
    },
    credentials: true
}))
app.use(express.json())

// Health check
app.get('/health', async (req, res) => {
    const dockerStatus = await import('./services/container.js').then(m => m.pingDocker());
    res.json({
        status: dockerStatus ? 'ok' : 'error',
        docker: dockerStatus ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
        terminals: getActiveSessionCount()
    })
})

// API Routes
app.use('/api/github', githubRoutes)
app.use('/api/projects', projectsRoutes)
app.use('/api/files', filesRoutes)
app.use('/api/collaborators', collaboratorsRoutes)
app.use('/api/ai', aiRoutes)

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err)
    res.status(500).json({ error: 'Internal server error' })
})

// Graceful shutdown
async function shutdown() {
    console.log('\nShutting down...')
    await cleanupTerminals()
    await cleanupAllContainers()
    process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

// Start server
// On startup: reconnect to still-running containers instead of wiping them.
// This prevents unnecessary container churn when the server restarts.
reconnectExistingContainers().catch(console.error);

httpServer.listen(PORT, () => {
    console.log(`🚀 Backend server running on http://localhost:${PORT}`)
    console.log(`   Frontend URL: ${FRONTEND_URL}`)
    console.log(`   Socket.IO enabled for terminal connections`)
})