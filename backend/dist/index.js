"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config"); // Load environment variables - Reload for lowercase path fix3400 config
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const github_js_1 = __importDefault(require("./routes/github.js"));
const projects_js_1 = __importDefault(require("./routes/projects.js"));
const files_js_1 = __importDefault(require("./routes/files.js"));
const collaborators_js_1 = __importDefault(require("./routes/collaborators.js"));
const ai_js_1 = __importDefault(require("./routes/ai.js"));
const terminal_js_1 = require("./services/terminal.js");
const container_js_1 = require("./services/container.js");
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const PORT = process.env.PORT || 4001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4000';
// Allow local networks safely
const allowedOrigins = [FRONTEND_URL, 'http://localhost:4000', 'http://127.0.0.1:4000', 'http://localhost:3000'];
const ws_1 = require("ws");
const path_1 = __importDefault(require("path"));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { setupWSConnection } = require(path_1.default.join(process.cwd(), 'node_modules', 'y-websocket', 'bin', 'utils.js'));
// Collaboration WebSocket server (y-websocket for real-time editing)
const wss = new ws_1.WebSocketServer({ noServer: true });
wss.on('connection', (ws, req) => {
    console.log(`[Collab] New WebSocket connection for: ${req.url}`);
    if (setupWSConnection) {
        setupWSConnection(ws, req);
    }
});
// IMPORTANT: Register upgrade handler BEFORE Socket.IO so y-websocket gets priority
httpServer.on('upgrade', (request, socket, head) => {
    if (request.url?.startsWith('/socket/collaboration')) {
        console.log(`[Collab] Upgrading to WebSocket: ${request.url}`);
        wss.handleUpgrade(request, socket, head, ws => {
            wss.emit('connection', ws, request);
        });
    }
    // Socket.IO handles its own upgrades via /socket.io/ path automatically
});
// Socket.IO setup (for terminal connections)
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: function (origin, callback) {
            if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.startsWith('http://192.168.') || origin.startsWith('http://10.')) {
                callback(null, true);
            }
            else {
                callback(null, allowedOrigins.includes(origin));
            }
        },
        methods: ['GET', 'POST'],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    // Tell Socket.IO NOT to handle upgrade for our collaboration path
    allowUpgrades: true
});
// Initialize terminal service with Socket.IO
(0, terminal_js_1.initializeTerminalService)(io);
// Middleware
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        // dynamically allow local IPs or fallback to predefined
        if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.startsWith('http://192.168.') || origin.startsWith('http://10.')) {
            callback(null, true);
        }
        else {
            callback(null, allowedOrigins.includes(origin));
        }
    },
    credentials: true
}));
app.use(express_1.default.json());
// Health check
app.get('/health', async (req, res) => {
    const dockerStatus = await import('./services/container.js').then(m => m.pingDocker());
    res.json({
        status: dockerStatus ? 'ok' : 'error',
        docker: dockerStatus ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
        terminals: (0, terminal_js_1.getActiveSessionCount)()
    });
});
// API Routes
app.use('/api/github', github_js_1.default);
app.use('/api/projects', projects_js_1.default);
app.use('/api/files', files_js_1.default);
app.use('/api/collaborators', collaborators_js_1.default);
app.use('/api/ai', ai_js_1.default);
// Error handling
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});
// Graceful shutdown
async function shutdown() {
    console.log('\nShutting down...');
    await (0, terminal_js_1.cleanupTerminals)();
    await (0, container_js_1.cleanupAllContainers)();
    process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
// Start server
// On startup: reconnect to still-running containers instead of wiping them.
// This prevents unnecessary container churn when the server restarts.
(0, container_js_1.reconnectExistingContainers)().catch(console.error);
httpServer.listen(PORT, () => {
    console.log(`🚀 Backend server running on http://localhost:${PORT}`);
    console.log(`   Frontend URL: ${FRONTEND_URL}`);
    console.log(`   Socket.IO enabled for terminal connections`);
});
