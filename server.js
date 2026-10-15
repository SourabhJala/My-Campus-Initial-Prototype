const http = require('http');
const express = require('express');
const { WebSocketServer, WebSocket } = require('ws');
const path = require('path');
require('dotenv').config();

const { parseEventDeterministic, parseEventWithLLM } = require('./parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '2mb' }));

// CORS setup for seamless API access
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Serve static frontend assets
app.use(express.static(__dirname));

// In-memory team events store for real-time synchronization
// teamStore: { [teamCode]: { events: Array, lastUpdated: String } }
const teamStore = {};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    teamsActive: Object.keys(teamStore).length
  });
});

// Parse event endpoint
app.post('/api/parse', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Please provide raw event text to parse.'
      });
    }

    if (text.length > 50000) {
      return res.status(413).json({
        success: false,
        error: 'Pasted event text is too large (limit 50KB).'
      });
    }

    let parsed;
    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (geminiKey) {
      parsed = await parseEventWithLLM(text, geminiKey, 'gemini');
    } else if (openaiKey) {
      parsed = await parseEventWithLLM(text, openaiKey, 'openai');
    } else {
      parsed = parseEventDeterministic(text);
    }

    return res.json({
      success: true,
      event: parsed,
      parserMode: geminiKey ? 'gemini-llm' : (openaiKey ? 'openai-llm' : 'deterministic')
    });
  } catch (error) {
    console.error('Error in /api/parse:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to extract event data: ' + error.message
    });
  }
});

// Optional fallback route: serve index.html for unknown GET requests
app.get('*', (req, res, next) => {
  if (req.accepts('html')) {
    res.sendFile(path.join(__dirname, 'index.html'));
  } else {
    next();
  }
});

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server for real-time team synchronization
const wss = new WebSocketServer({ server });

// Map of teamCode -> Set of WebSocket clients
const teamRooms = new Map();

wss.on('connection', (ws) => {
  let currentTeamCode = null;

  ws.on('message', (messageRaw) => {
    try {
      const data = JSON.parse(messageRaw);

      if (data.type === 'join') {
        const teamCode = (data.teamCode || '').toUpperCase().trim();
        if (!teamCode) return;

        // Leave previous team room if any
        if (currentTeamCode && teamRooms.has(currentTeamCode)) {
          teamRooms.get(currentTeamCode).delete(ws);
        }

        currentTeamCode = teamCode;
        if (!teamRooms.has(teamCode)) {
          teamRooms.set(teamCode, new Set());
        }
        teamRooms.get(teamCode).add(ws);

        // Send existing team state to the newly joined client
        const existingData = teamStore[teamCode] || { events: [] };
        ws.send(JSON.stringify({
          type: 'init',
          teamCode,
          events: existingData.events || [],
          peerCount: teamRooms.get(teamCode).size
        }));

        // Notify other clients in the team of new peer count
        broadcastToTeam(teamCode, {
          type: 'peer_joined',
          teamCode,
          peerCount: teamRooms.get(teamCode).size
        }, ws);

      } else if (data.type === 'sync_events') {
        const teamCode = (data.teamCode || '').toUpperCase().trim();
        if (!teamCode || !Array.isArray(data.events)) return;

        // Update in-memory store
        teamStore[teamCode] = {
          events: data.events,
          lastUpdated: new Date().toISOString()
        };

        // Broadcast updated events to all other connected clients in this team
        broadcastToTeam(teamCode, {
          type: 'sync_events',
          teamCode,
          events: data.events,
          updatedByPeer: true
        }, ws);

      } else if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch (err) {
      console.error('WebSocket message handling error:', err.message);
    }
  });

  ws.on('close', () => {
    if (currentTeamCode && teamRooms.has(currentTeamCode)) {
      const room = teamRooms.get(currentTeamCode);
      room.delete(ws);
      if (room.size === 0) {
        teamRooms.delete(currentTeamCode);
      } else {
        broadcastToTeam(currentTeamCode, {
          type: 'peer_left',
          teamCode: currentTeamCode,
          peerCount: room.size
        });
      }
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket connection error:', err.message);
  });
});

function broadcastToTeam(teamCode, payload, senderWs = null) {
  const room = teamRooms.get(teamCode);
  if (!room) return;
  const message = JSON.stringify(payload);
  for (const client of room) {
    if (client !== senderWs && client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

// Start Server
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 MyCampus — Your Event Journey is running!`);
    console.log(`🌐 Web App:      http://localhost:${PORT}`);
    console.log(`🔌 API Endpoint: http://localhost:${PORT}/api/parse`);
    console.log(`⚡ Live Sync:    WebSocket Relay Active`);
    console.log(`======================================================\n`);
  });
}

module.exports = { app, server, teamStore, wss };
