// Ludo Royale — WebSocket Game Server
const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

// HTTP server — serves health check + allows WebSocket upgrades
// When deployed on Railway, Vercel frontend connects here via WSS
const server = http.createServer((req, res) => {
  // CORS headers — allow Vercel frontend to connect
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204); res.end(); return;
  }

  // Health check (for Railway/UptimeRobot keep-alive)
  if (req.url === '/health' || req.url === '/ping') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', rooms: rooms.size, uptime: process.uptime() }));
    return;
  }

  // For local dev only — serve static files
  // On Railway, frontend is hosted on Vercel so this won't be used
  if (process.env.NODE_ENV !== 'production') {
    let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
      '.png': 'image/png', '.jpg': 'image/jpeg', '.mp4': 'video/mp4',
      '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.json': 'application/json',
      '.woff2': 'font/woff2',
    };
    fs.readFile(filePath, (err, data) => {
      if (err) {
        fs.readFile(path.join(__dirname, 'index.html'), (e2, d2) => {
          if (e2) { res.writeHead(404); res.end('Not Found'); }
          else { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(d2); }
        });
      } else {
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
        res.end(data);
      }
    });
  } else {
    // In production, just return 200 for root (Railway health check)
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Ludo Royale WebSocket Server Running 🎲');
  }
});


// WebSocket server
const wss = new WebSocket.Server({ server });

// Room storage
// room = { id, hostId, playerCount, roomType, players: [{id, name, color, ws}], gameState, started }
const rooms = new Map();

function generateRoomId() {
  let id;
  let attempts = 0;
  do {
    id = String(Math.floor(10 + Math.random() * 90)); // 10-99
    attempts++;
  } while (rooms.has(id) && attempts < 100);
  return id;
}

function broadcast(room, data, exceptId = null) {
  const msg = JSON.stringify(data);
  room.players.forEach(p => {
    if (p.id !== exceptId && p.ws && p.ws.readyState === WebSocket.OPEN) {
      p.ws.send(msg);
    }
  });
}

function broadcastAll(room, data) {
  broadcast(room, data, null);
}

function sendTo(ws, data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function getRoomInfo(room) {
  return {
    id: room.id,
    hostId: room.hostId,
    playerCount: room.playerCount,
    roomType: room.roomType,
    players: room.players.map(p => ({ id: p.id, name: p.name, color: p.color, ready: p.ready })),
    started: room.started,
  };
}

// Player colors by slot
const PLAYER_COLORS = ['red', 'green', 'yellow', 'blue', 'purple', 'orange', 'pink', 'cyan'];

wss.on('connection', (ws) => {
  ws.playerId = Math.random().toString(36).substr(2, 9);
  ws.roomId = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {
      case 'rejoin-room': {
        // Player reconnecting after page navigation
        const room = rooms.get(msg.roomId);
        if (!room) { sendTo(ws, { type: 'error', message: 'Room not found.' }); return; }
        const playerSlot = room.players.findIndex(p => p.id === msg.playerId);
        if (playerSlot === -1) { sendTo(ws, { type: 'error', message: 'Player not in this room.' }); return; }
        // Update WS reference
        room.players[playerSlot].ws = ws;
        ws.playerId = msg.playerId;
        ws.roomId = msg.roomId;
        sendTo(ws, {
          type: 'rejoined',
          gameState: room.gameState,
          roomInfo: getRoomInfo(room),
          playerId: msg.playerId,
        });
        broadcast(room, { type: 'player-reconnected', playerName: room.players[playerSlot].name }, msg.playerId);
        console.log(`${room.players[playerSlot].name} rejoined room ${room.id}`);
        break;
      }

      case 'create-room': {
        const roomId = generateRoomId();
        const player = {
          id: ws.playerId,
          name: msg.name || 'Player 1',
          color: PLAYER_COLORS[0],
          ws,
          ready: true,
          slot: 0,
        };
        const room = {
          id: roomId,
          hostId: ws.playerId,
          playerCount: Math.min(8, Math.max(2, parseInt(msg.playerCount) || 4)),
          roomType: msg.roomType || 'friends', // 'friends' | 'lovers'
          players: [player],
          started: false,
          gameState: null,
          loveQuestionFired: false,
          moveCount: 0,
        };
        rooms.set(roomId, room);
        ws.roomId = roomId;
        sendTo(ws, { type: 'room-created', roomId, playerId: ws.playerId, roomInfo: getRoomInfo(room) });
        console.log(`Room ${roomId} created by ${player.name} (${room.playerCount}p ${room.roomType})`);
        break;
      }

      case 'join-room': {
        const roomId = msg.roomId;
        const room = rooms.get(roomId);
        if (!room) { sendTo(ws, { type: 'error', message: 'Room not found. Check the room ID!' }); return; }
        if (room.started) { sendTo(ws, { type: 'error', message: 'Game already started!' }); return; }
        if (room.players.length >= room.playerCount) { sendTo(ws, { type: 'error', message: 'Room is full!' }); return; }

        const slot = (room.playerCount === 2 && room.players.length === 1) ? 2 : room.players.length;
        const color = PLAYER_COLORS[slot];
        const player = {
          id: ws.playerId,
          name: msg.name || `Player ${slot + 1}`,
          color,
          ws,
          ready: true,
          slot,
        };
        room.players.push(player);
        ws.roomId = roomId;

        sendTo(ws, { type: 'room-joined', roomId, playerId: ws.playerId, roomInfo: getRoomInfo(room) });
        broadcast(room, { type: 'player-joined', player: { id: player.id, name: player.name, color: player.color, slot }, roomInfo: getRoomInfo(room) }, ws.playerId);
        console.log(`${player.name} joined room ${roomId}`);
        break;
      }

      case 'start-game': {
        const room = rooms.get(ws.roomId);
        if (!room || room.hostId !== ws.playerId) return;
        if (room.players.length < 2) { sendTo(ws, { type: 'error', message: 'Need at least 2 players to start!' }); return; }

        room.started = true;
        room.gameState = buildInitialGameState(room);
        broadcastAll(room, { type: 'game-started', gameState: room.gameState, roomInfo: getRoomInfo(room) });
        console.log(`Game started in room ${room.id}`);
        resetTurnTimer(room);
        break;
      }

      case 'roll-dice': {
        const room = rooms.get(ws.roomId);
        if (!room || !room.started) return;
        const gs = room.gameState;
        const pIdx = room.players.findIndex(p => p.id === ws.playerId);
        if (pIdx !== gs.currentPlayer) return; // Not your turn

        const roll = getBalancedRoll(gs, pIdx);
        gs.lastRoll = roll;
        gs.diceRolled = true;
        room.moveCount++;

        // Lovers room love question logic
        let loveQuestion = null;
        if (room.roomType === 'lovers' && !room.loveQuestionFired && room.moveCount <= 20) {
          if (Math.random() < 0.15) {
            room.loveQuestionFired = true;
            const asker = room.players[pIdx];
            const target = room.players.find(p => p.id !== asker.id);
            loveQuestion = { askerIdx: pIdx, targetName: target ? target.name : 'Partner' };
          }
        }

        if (!hasAnyMoveServer(gs, pIdx)) {
          gs.diceRolled = false;
          advanceTurnServer(room);
          broadcastAll(room, { type: 'dice-rolled', playerId: ws.playerId, roll, gameState: gs, loveQuestion, noMoves: true });
          resetTurnTimer(room);
        } else {
          broadcastAll(room, { type: 'dice-rolled', playerId: ws.playerId, roll, gameState: gs, loveQuestion });
          resetTurnTimer(room);
        }
        break;
      }

      case 'love-answer': {
        const room = rooms.get(ws.roomId);
        if (!room) return;
        const gs = room.gameState;
        const pIdx = room.players.findIndex(p => p.id === ws.playerId);
        
        let answerYes = msg.yes;
        if (answerYes) {
          gs.lastRoll = 6;
        }

        const asker = room.players.find(p => p.id === ws.playerId);
        const target = room.players.find(p => p.id !== ws.playerId);

        if (!hasAnyMoveServer(gs, pIdx)) {
          gs.diceRolled = false;
          advanceTurnServer(room);
          broadcastAll(room, {
            type: 'love-answer',
            yes: answerYes,
            askerName: asker?.name,
            targetName: target?.name,
            gameState: gs,
            noMoves: true
          });
          resetTurnTimer(room);
        } else {
          broadcastAll(room, {
            type: 'love-answer',
            yes: answerYes,
            askerName: asker?.name,
            targetName: target?.name,
            gameState: gs,
          });
          resetTurnTimer(room);
        }
        break;
      }

      case 'move-piece': {
        const room = rooms.get(ws.roomId);
        if (!room || !room.started) return;
        const gs = room.gameState;
        const pIdx = room.players.findIndex(p => p.id === ws.playerId);
        if (pIdx !== gs.currentPlayer) return;
        if (!gs.diceRolled) return;

        const pieceIdx = msg.pieceIdx !== undefined ? msg.pieceIdx : msg.pieceIndex;
        const result = applyMove(gs, pIdx, pieceIdx);
        if (!result.valid) return;

        gs.diceRolled = false;

        // Next turn (unless rolled 6 or killed)
        if (!result.rolledSix && !result.killed) {
          advanceTurnServer(room);
        }
        resetTurnTimer(room);

        // Check win
        const winner = checkWinner(gs, pIdx);
        if (winner !== null) {
          broadcastAll(room, { type: 'game-over', winnerIndex: winner, winnerName: room.players[winner]?.name, gameState: gs });
          room.started = false;
        } else {
          broadcastAll(room, { type: 'piece-moved', gameState: gs, moveResult: result });
        }
        break;
      }

      case 'emote': {
        const room = rooms.get(ws.roomId);
        if (!room) return;
        const sender = room.players.find(p => p.id === ws.playerId);
        broadcastAll(room, { type: 'emote', playerId: ws.playerId, playerName: sender?.name, playerColor: sender?.color, emote: msg.emote, text: msg.text });
        break;
      }

      case 'send-love': {
        const room = rooms.get(ws.roomId);
        if (!room || room.roomType !== 'lovers') return;
        const sender = room.players.find(p => p.id === ws.playerId);
        broadcastAll(room, { type: 'love-shower', senderId: ws.playerId, senderName: sender?.name, kind: msg.kind }); // kind: 'rose' | 'heart'
        break;
      }

      case 'chat': {
        const room = rooms.get(ws.roomId);
        if (!room) return;
        const sender = room.players.find(p => p.id === ws.playerId);
        broadcastAll(room, { type: 'chat', senderId: ws.playerId, senderName: sender?.name, senderColor: sender?.color, message: msg.message.substring(0, 200) });
        break;
      }
    }
  });

  ws.on('close', () => {
    const room = ws.roomId ? rooms.get(ws.roomId) : null;
    if (!room) return;
    const pIdx = room.players.findIndex(p => p.id === ws.playerId);
    if (pIdx === -1) return;
    const playerName = room.players[pIdx].name;
    room.players[pIdx].ws = null; // Mark disconnected
    broadcast(room, { type: 'player-disconnected', playerId: ws.playerId, playerName });
    // If host left and game not started, remove room after a bit
    if (!room.started && room.hostId === ws.playerId) {
      setTimeout(() => {
        if (!rooms.get(ws.roomId)?.started) {
          rooms.delete(ws.roomId);
          console.log(`Room ${ws.roomId} closed (host left)`);
        }
      }, 30000);
    }
  });
});

// ─── Game State Builder ────────────────────────────────────────────────────────
function buildInitialGameState(room) {
  const n = room.players.length;
  // Each player has 4 pieces, all start in home (-1 = home, 0-55 = board path, 56-61 = home column, 57 = won)
  const players = room.players.map((p, i) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    slot: p.slot,
    pieces: [-1, -1, -1, -1], // -1 = in home base
    finished: false,
  }));

  return {
    players,
    currentPlayer: 0,
    lastRoll: null,
    diceRolled: false,
    phase: 'playing',
  };
}

// Board positions: standard 56-player Ludo path
// Matches client's relative path logic
const PLAYER_START   = [45, 3, 17, 31];
const TRACK_SIZE     = 56;
const HOME_COL_START = 55;
const WIN_REL        = 61;
const SAFE_ABS       = new Set([45, 3, 17, 31, 54, 40, 26, 12]);

function applyMove(gs, playerIdx, pieceIdx) {
  const player = gs.players[playerIdx];
  const roll = gs.lastRoll;
  const pos = player.pieces[pieceIdx];
  let killed = false;
  let rolledSix = roll === 6;

  // Piece in home: need 6 to enter
  if (pos === -1) {
    if (roll !== 6) return { valid: false };
    player.pieces[pieceIdx] = 0; // enter main track at relative 0
  } else if (pos >= 100) {
    // Already in home column
    const homePos = pos - 100;
    const newHomePos = homePos + roll;
    if (homePos + roll > 6) return { valid: false }; // can't overshoot home
    if (homePos + roll === 6) {
      player.pieces[pieceIdx] = 999; // Won!
    } else {
      player.pieces[pieceIdx] = 100 + newHomePos;
    }
  } else {
    // Normal movement on main track
    const newRel = pos + roll;
    if (newRel > WIN_REL) return { valid: false };

    if (newRel === WIN_REL) {
      player.pieces[pieceIdx] = 999; // Won!
    } else if (newRel >= HOME_COL_START) {
      player.pieces[pieceIdx] = 100 + (newRel - HOME_COL_START);
    } else {
      player.pieces[pieceIdx] = newRel;
      
      // Kill check
      const absPos = (PLAYER_START[player.slot] + newRel) % TRACK_SIZE;
      if (!SAFE_ABS.has(absPos)) {
        gs.players.forEach((other, oi) => {
          if (oi === playerIdx) return;
          other.pieces.forEach((oPos, pi) => {
            if (oPos < 0 || oPos === 999 || oPos >= 100) return;
            const otherAbs = (PLAYER_START[other.slot] + oPos) % TRACK_SIZE;
            if (otherAbs === absPos) {
              other.pieces[pi] = -1; // send home
              killed = true;
            }
          });
        });
      }
    }
  }

  return { valid: true, killed, rolledSix };
}

function getBalancedRoll(gs, playerIdx) {
  const player = gs.players[playerIdx];
  if (!player) return Math.floor(Math.random() * 6) + 1;

  if (player.rollsSinceLastSix === undefined) player.rollsSinceLastSix = 0;
  
  if (player.rollsSinceLastSix >= 9) {
    player.rollsSinceLastSix = 0;
    return 6;
  }

  const progresses = gs.players.map(p => {
    let pSum = 0;
    p.pieces.forEach(pos => {
      if (pos === 999) pSum += 57;
      else if (pos >= 100) pSum += (pos - 100) + 51;
      else if (pos > 0) pSum += pos;
    });
    return pSum;
  });

  const maxProg = Math.max(...progresses);
  const minProg = Math.min(...progresses);
  const myProg = progresses[playerIdx];

  let rollChance = [1, 2, 3, 4, 5, 6];

  if (maxProg - myProg > 20) {
    rollChance = [1, 2, 3, 4, 5, 6, 6, 6, 5, 6];
  } else if (myProg - minProg > 25 && gs.players.length > 1) {
    rollChance = [1, 2, 3, 4, 5, 1, 2, 3, 4, 5];
  }

  const roll = rollChance[Math.floor(Math.random() * rollChance.length)];
  
  if (roll === 6) {
    player.rollsSinceLastSix = 0;
  } else {
    player.rollsSinceLastSix++;
  }

  return roll;
}

function checkWinner(gs, playerIdx) {
  const player = gs.players[playerIdx];
  if (player.pieces.every(p => p === 999)) {
    player.finished = true;
    return playerIdx;
  }
  return null;
}

function canMovePieceServer(gs, playerIdx, pieceIdx) {
  const player = gs.players[playerIdx];
  const roll = gs.lastRoll;
  if (!player) return false;
  const pos = player.pieces[pieceIdx];
  if (pos === 999) return false;
  if (pos === -1) return roll === 6;
  
  if (pos >= 100) {
    const homeStep = pos - 100;
    return (homeStep + roll) <= 6;
  }
  
  const newRelPos = pos + roll;
  return newRelPos <= WIN_REL;
}

function hasAnyMoveServer(gs, playerIdx) {
  const player = gs.players[playerIdx];
  if (!player) return false;
  return player.pieces.some((_, ii) => canMovePieceServer(gs, playerIdx, ii));
}

function advanceTurnServer(room) {
  const gs = room.gameState;
  const np = room.players.length;
  let next = (gs.currentPlayer + 1) % np;
  let tries = 0;
  while (room.players[next].finished && tries < np) {
    next = (next + 1) % np;
    tries++;
  }
  gs.currentPlayer = next;
  gs.diceRolled = false;
  gs.lastRoll = 0;
}

function resetTurnTimer(room) {
  if (room.turnTimeout) clearTimeout(room.turnTimeout);
  room.turnTimeout = setTimeout(() => {
    const gs = room.gameState;
    if (!gs || !room.started) return;
    
    console.log(`Room ${room.id}: player index ${gs.currentPlayer} timed out.`);
    
    // Automatically advance the turn
    gs.diceRolled = false;
    gs.lastRoll = 0;
    advanceTurnServer(room);
    
    // Broadcast the timeout and new turn
    broadcastAll(room, {
      type: 'turn-timeout',
      gameState: gs,
      message: `Turn timed out! Next player's turn.`
    });
    
    // Start the timer for the next turn
    resetTurnTimer(room);
  }, 60000);
}

server.listen(PORT, () => {
  console.log(`\n🎮 LUDO ROYALE SERVER RUNNING!`);
  console.log(`📡 Local:   http://localhost:${PORT}`);
  console.log(`🌐 Network: Check your IP address for friends to connect\n`);
});
