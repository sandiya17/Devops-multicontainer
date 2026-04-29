// server/index.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
require('dotenv').config();

const reportRoutes = require('./routes/reports');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        // Ensure Vite and other local dev environments can connect
        origin: ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"], 
        methods: ["GET", "POST", "PATCH"] // Added PATCH for updates
    }
});

// --- Configuration ---
const MONGODB_URI = process.env.MONGODB_URI;
const ADMIN_SECRET = process.env.ADMIN_SECRET;
const PORT = process.env.PORT || 8080; 

// --- Database Connection ---
mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err));

// --- Middleware ---
app.use(cors());
app.use(express.json()); 

// --- Socket.IO Middleware ---
// Make socket.io instance accessible in controllers
app.use((req, res, next) => {
    req.app.set('socketio', io);
    next();
});

// --- Routes ---
app.use('/api/reports', reportRoutes);

// --- Socket.IO Logic ---
io.on('connection', (socket) => {
    socket.on('joinAdmin', () => {
        socket.join('admins');
    });
    
    // Room name MUST match the one used in postMessage controller (`report-${alias}`)
    socket.on('joinReportRoom', (alias) => {
        socket.join(`report-${alias}`); 
    });
});

// Simple root route confirmation
app.get('/', (req, res) => {
    res.send('SpeakUp Backend API running.');
});

// --- Start Server ---
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));