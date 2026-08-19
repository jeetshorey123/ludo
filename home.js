// ═══════════════════════════════════════════════════════
//  LUDO ROYALE — HOME JS
// ═══════════════════════════════════════════════════════

let ws = null;
let selectedOfflineCount = 2;
let selectedOnlineCount  = 2;
let selectedRoomType     = 'friends';
let currentRoomId        = '';
let myPlayerId           = '';
let isHost               = false;
let currentMainMode      = 'ludo'; // 'ludo' | 'cutie'

// ─── Particles ────────────────────────────────────────
(function() {
  const canvas = document.getElementById('particles-canvas');
  const ctx    = canvas.getContext('2d');
  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  window.addEventListener('resize', resize);
  resize();
  const count = 70;
  const pts = Array.from({length:count}, () => ({
    x: Math.random()*canvas.width, y: Math.random()*canvas.height,
    r: Math.random()*1.5+0.4, a: Math.random()*0.5+0.1,
    sx: (Math.random()-0.5)*0.3, sy: -(Math.random()*0.4+0.1),
    cutie: false,
  }));
  function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    pts.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.a;
      if (currentMainMode === 'cutie') {
        ctx.fillStyle = ['#ff8fab','#ffb3c6','#ff4d6d','#ffc8dd'][Math.floor(Math.random()*4)];
      } else {
        ctx.fillStyle = Math.random() > 0.5 ? '#00f5ff' : '#bf00ff';
      }
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill(); ctx.restore();
      p.x += p.sx; p.y += p.sy;
      if (p.y < -5) { p.y = canvas.height+5; p.x = Math.random()*canvas.width; }
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

// ─── Mode Selection ──────────────────────────────────
function selectMainMode(mode) {
  currentMainMode = mode;

  // Update sessionStorage
  sessionStorage.setItem('cutieMode', mode === 'cutie' ? '1' : '0');

  // Step transition
  document.getElementById('stepMode').classList.add('hidden');
  const stepSub = document.getElementById('stepSubOptions');
  stepSub.classList.remove('hidden');
  stepSub.classList.add('fade-in');

  if (mode === 'cutie') {
    // Apply Cutie visuals
    document.body.classList.add('cutie-home');
    document.getElementById('cutieBgHome').classList.add('active');
    document.getElementById('cutieVideos').classList.add('active');
    document.getElementById('ludoBg').classList.remove('active');
    
    // Show download gift button
    document.getElementById('giftDownloadBtn').classList.remove('hidden');

    // Force play videos on user click gesture (for mobile autoplay)
    const videos = document.querySelectorAll('#cutieVideos video');
    videos.forEach(v => {
      v.muted = true;
      v.play().catch(e => console.log('Video play failed:', e));
    });

    document.getElementById('subIcon').textContent  = '🌸';
    document.getElementById('subTitle').textContent = 'Cutie Perk Mode';
    document.getElementById('subDesc').textContent  = 'A magical experience just for you 💖';
    stepSub.classList.add('cutie-sub');
  } else {
    document.body.classList.remove('cutie-home');
    document.getElementById('cutieBgHome').classList.remove('active');
    document.getElementById('cutieVideos').classList.remove('active');
    document.getElementById('ludoBg').classList.add('active');
    
    // Hide download gift button
    document.getElementById('giftDownloadBtn').classList.add('hidden');

    document.getElementById('subIcon').textContent  = '🎲';
    document.getElementById('subTitle').textContent = 'LUDO ROYALE';
    document.getElementById('subDesc').textContent  = 'How do you want to play?';
    stepSub.classList.remove('cutie-sub');
  }
}

function goBack() {
  document.getElementById('stepSubOptions').classList.add('hidden');
  document.getElementById('stepMode').classList.remove('hidden');
  document.getElementById('stepMode').classList.add('fade-in');
  document.body.classList.remove('cutie-home');
  document.getElementById('cutieBgHome').classList.remove('active');
  document.getElementById('cutieVideos').classList.remove('active');
  document.getElementById('ludoBg').classList.add('active');
  
  // Hide download gift button
  document.getElementById('giftDownloadBtn').classList.add('hidden');
}

function downloadGift() {
  const link = document.createElement('a');
  link.href = 'bcg.png';
  link.download = 'gift.png';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('🎁 Gift downloaded as gift.png! 🌸', 'success');
}

// ─── Background init ──────────────────────────────────
document.getElementById('ludoBg').classList.add('active');

// ─── Modal helpers ────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

function showToast(msg, type='info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast show toast-${type}`;
  clearTimeout(t._to);
  t._to = setTimeout(() => t.className = 'toast', 3000);
}

// ─── Offline Modal ────────────────────────────────────
function openOfflineModal() { openModal('offlineModal'); }

function selectCount(btn, mode) {
  const parent = mode === 'offline' ? '#offlinePlayerCount' : '#onlinePlayerCount';
  document.querySelectorAll(parent + ' .count-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  if (mode === 'offline') selectedOfflineCount = parseInt(btn.dataset.count);
  else                    selectedOnlineCount  = parseInt(btn.dataset.count);
}

function startOfflineGame() {
  const name = document.getElementById('offlineName').value.trim();
  if (!name) { showToast('Enter your name!', 'error'); return; }
  sessionStorage.setItem('gameMode',    'offline');
  sessionStorage.setItem('playerCount', selectedOfflineCount);
  sessionStorage.setItem('playerName',  name);
  sessionStorage.setItem('roomType',    'friends');
  window.location.href = 'game.html';
}

// ─── Online Modal ─────────────────────────────────────
function openOnlineModal() { openModal('onlineModal'); }

function switchTab(tab) {
  ['create','join'].forEach(t => {
    document.getElementById(t+'TabBtn').classList.toggle('active', t===tab);
    document.getElementById(t+'Pane').classList.toggle('active', t===tab);
  });
}

function selectRoomType(type) {
  selectedRoomType = type;
  document.getElementById('friendsTypeBtn').classList.toggle('selected', type==='friends');
  document.getElementById('loversTypeBtn').classList.toggle('selected',  type==='lovers');
}// Initialize Server URL Input on page load
document.addEventListener('DOMContentLoaded', () => {
  const serverInput = document.getElementById('serverUrl');
  if (serverInput) {
    const saved = localStorage.getItem('serverUrl');
    if (saved) {
      serverInput.value = saved;
    } else {
      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
      serverInput.value = `${proto}//${location.host}`;
    }
  }
});

// ─── WebSocket ────────────────────────────────────────
function connectWS(callback) {
  if (ws && ws.readyState === WebSocket.OPEN) { callback(); return; }

  const serverUrlInput = document.getElementById('serverUrl');
  let url = serverUrlInput ? serverUrlInput.value.trim() : '';
  if (!url) {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    url = `${proto}//${location.host}`;
  }

  if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
    url = (location.protocol === 'https:' ? 'wss://' : 'ws://') + url;
  }

  showToast('Connecting to WebSocket server...', 'info');
  ws = new WebSocket(url);

  ws.onopen = () => {
    showToast('Connected! ✅', 'success');
    localStorage.setItem('serverUrl', url);
    sessionStorage.setItem('serverUrl', url);
    callback();
  };
  ws.onmessage = handleServerMessage;
  ws.onerror   = () => showToast('Connection error. Is the server running?', 'error');
  ws.onclose   = () => showToast('Disconnected from server.', 'error');
}

function sendWS(data) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
}

function testServerConnection() {
  const serverUrlInput = document.getElementById('serverUrl');
  let url = serverUrlInput ? serverUrlInput.value.trim() : '';
  if (!url) {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    url = `${proto}//${location.host}`;
  }
  if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
    url = (location.protocol === 'https:' ? 'wss://' : 'ws://') + url;
  }

  const pingBtn = document.getElementById('pingServerBtn');
  if (pingBtn) {
    pingBtn.textContent = 'Testing...';
    pingBtn.style.pointerEvents = 'none';
  }

  showToast('Testing connection...', 'info');
  const tempWs = new WebSocket(url);
  let resolved = false;

  const timer = setTimeout(() => {
    if (!resolved) {
      resolved = true;
      tempWs.close();
      showToast('Connection timed out ❌', 'error');
      if (pingBtn) {
        pingBtn.textContent = 'Test Connection';
        pingBtn.style.pointerEvents = 'auto';
      }
    }
  }, 4000);

  tempWs.onopen = () => {
    if (!resolved) {
      resolved = true;
      clearTimeout(timer);
      tempWs.close();
      showToast('Connection successful! ✅', 'success');
      localStorage.setItem('serverUrl', url);
      sessionStorage.setItem('serverUrl', url);
      if (pingBtn) {
        pingBtn.textContent = 'Success ✅';
        setTimeout(() => {
          pingBtn.textContent = 'Test Connection';
          pingBtn.style.pointerEvents = 'auto';
        }, 2000);
      }
    }
  };

  tempWs.onerror = () => {
    if (!resolved) {
      resolved = true;
      clearTimeout(timer);
      showToast('Connection failed ❌', 'error');
      if (pingBtn) {
        pingBtn.textContent = 'Failed ❌';
        setTimeout(() => {
          pingBtn.textContent = 'Test Connection';
          pingBtn.style.pointerEvents = 'auto';
        }, 2000);
      }
    }
  };
}
function createOnlineRoom() {
  const name = document.getElementById('createName').value.trim();
  if (!name) { showToast('Enter your name!', 'error'); return; }
  connectWS(() => {
    sendWS({ type:'create-room', name, playerCount:selectedOnlineCount, roomType:selectedRoomType });
    sessionStorage.setItem('playerName', name);
    sessionStorage.setItem('roomType',   selectedRoomType);
  });
}

function joinOnlineRoom() {
  const name   = document.getElementById('joinName').value.trim();
  const roomId = document.getElementById('joinRoomId').value.trim();
  if (!name)                        { showToast('Enter your name!', 'error'); return; }
  if (!/^\d{2}$/.test(roomId))      { showToast('Enter a valid 2-digit room ID!', 'error'); return; }
  connectWS(() => {
    sendWS({ type:'join-room', name, roomId });
    sessionStorage.setItem('playerName', name);
  });
}

// ─── Server Messages ──────────────────────────────────
function handleServerMessage(event) {
  const msg = JSON.parse(event.data);
  switch (msg.type) {
    case 'room-created':
      myPlayerId   = msg.playerId;
      currentRoomId = msg.roomId;
      isHost       = true;
      closeModal('onlineModal');
      openLobby(msg.roomInfo);
      break;

    case 'room-joined':
      myPlayerId   = msg.playerId;
      currentRoomId = msg.roomId;
      isHost       = false;
      closeModal('onlineModal');
      openLobby(msg.roomInfo);
      break;

    case 'player-joined':
      updateLobby(msg.roomInfo);
      showToast(`${msg.player.name} joined! 🎉`, 'success');
      break;

    case 'game-started':
      sessionStorage.setItem('gameMode',          'online');
      sessionStorage.setItem('playerCount',       msg.roomInfo.players.length);
      sessionStorage.setItem('roomId',            currentRoomId);
      sessionStorage.setItem('playerId',          myPlayerId);
      sessionStorage.setItem('isHost',            isHost ? '1' : '0');
      sessionStorage.setItem('roomType',          msg.roomInfo.roomType);
      sessionStorage.setItem('initialGameState',  JSON.stringify(msg.gameState));
      sessionStorage.setItem('roomInfo',          JSON.stringify(msg.roomInfo));
      window.location.href = 'game.html';
      break;

    case 'player-disconnected':
      showToast(`${msg.playerName} disconnected 😢`, 'error');
      break;

    case 'error':
      showToast(msg.message, 'error');
      break;
  }
}

// ─── Lobby ────────────────────────────────────────────
function openLobby(roomInfo) {
  openModal('lobbyModal');
  document.getElementById('lobbyRoomId').textContent = roomInfo.id;
  updateLobby(roomInfo);

  if (isHost) {
    document.getElementById('hostActions').classList.remove('hidden');
    document.getElementById('guestWait').classList.add('hidden');
  } else {
    document.getElementById('hostActions').classList.add('hidden');
    document.getElementById('guestWait').classList.remove('hidden');
  }
}

function updateLobby(roomInfo) {
  const div = document.getElementById('lobbyPlayers');
  const colors = ['🔴','🟢','🟡','🔵','🟣','🟠','🩷','🩵'];
  div.innerHTML = roomInfo.players.map((p,i) =>
    `<div class="lobby-player">
       <span class="lp-icon">${colors[i]}</span>
       <span class="lp-name">${p.name}${p.id === myPlayerId ? ' (You)' : ''}</span>
       ${p.id === roomInfo.hostId ? '<span class="lp-host">HOST</span>' : ''}
     </div>`
  ).join('') + Array(roomInfo.playerCount - roomInfo.players.length).fill(0).map(() =>
    `<div class="lobby-player empty"><span class="lp-icon">⬜</span><span class="lp-name">Waiting...</span></div>`
  ).join('');

  const startBtn = document.getElementById('startBtn');
  if (startBtn) {
    const ready = roomInfo.players.length >= 2;
    startBtn.disabled = !ready;
    startBtn.textContent = ready
      ? `🚀 START GAME (${roomInfo.players.length}/${roomInfo.playerCount} players)`
      : `⏳ Waiting for players… (${roomInfo.players.length}/${roomInfo.playerCount})`;
  }
}

function startOnlineGame() {
  sendWS({ type:'start-game', roomId:currentRoomId });
}

function copyRoomId() {
  navigator.clipboard.writeText(currentRoomId).then(() => showToast('Room ID copied! 📋', 'success'));
}
