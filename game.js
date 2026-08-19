// ═══════════════════════════════════════════════════════
//  LUDO ROYALE — Game Engine  v3.0
// ═══════════════════════════════════════════════════════

// ─── Session ─────────────────────────────────────────
const gameMode    = sessionStorage.getItem('gameMode')    || 'offline';
const playerCount = parseInt(sessionStorage.getItem('playerCount') || '2');
const myName      = sessionStorage.getItem('playerName')  || 'Player 1';
const roomType    = sessionStorage.getItem('roomType')    || 'friends';
const roomId      = sessionStorage.getItem('roomId')      || '';
const myPlayerId  = sessionStorage.getItem('playerId')    || '';
const isHost      = sessionStorage.getItem('isHost')      === '1';
const cutieModeOn = sessionStorage.getItem('cutieMode')   === '1';

// ─── Browser Back Button Redirection ──────────────────
history.pushState(null, null, location.href);
window.onpopstate = function() {
  window.location.href = 'index.html';
};

// ─── Apply Theme ──────────────────────────────────────
if (cutieModeOn) document.getElementById('gameBody').classList.add('cutie-mode');
if (roomType === 'lovers') {
  document.getElementById('gameBody').classList.add('lovers-room');
  document.getElementById('loveButtons').classList.remove('hidden');
  document.getElementById('loveBtnContainer').classList.remove('hidden');
}
if (cutieModeOn || roomType === 'lovers') {
  document.getElementById('gameVideoOverlays')?.classList.remove('hidden');
  const videos = document.querySelectorAll('#gameVideoOverlays video');
  videos.forEach(v => {
    v.muted = true;
    v.play().catch(e => console.log('Game video play failed:', e));
  });
}

// ─── Particles ───────────────────────────────────────
(function() {
  const canvas = document.getElementById('particles-canvas');
  const ctx    = canvas.getContext('2d');
  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  window.addEventListener('resize', resize);
  resize();
  const pts = Array.from({length:50}, () => ({
    x:Math.random()*window.innerWidth, y:Math.random()*window.innerHeight,
    r:Math.random()*1.2+0.3, a:Math.random()*0.35+0.05,
    sx:(Math.random()-0.5)*0.2, sy:-(Math.random()*0.3+0.05),
  }));
  function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    pts.forEach(p => {
      ctx.save(); ctx.globalAlpha = p.a;
      ctx.fillStyle = (cutieModeOn||roomType==='lovers') ? '#ff8fab' : (Math.random()>.5?'#00f5ff':'#bf00ff');
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); ctx.restore();
      p.x+=p.sx; p.y+=p.sy;
      if(p.y<-5){ p.y=canvas.height+5; p.x=Math.random()*canvas.width; }
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

// ═══════════════════════════════════════════════════════
//  BOARD CONSTANTS
// ═══════════════════════════════════════════════════════

const BOARD_SIZE = 600;
const COLS       = 15;
const CELL       = BOARD_SIZE / COLS; // 40px

// 56-square main path — 14 squares per player section
// Arranged so path[55] → path[0] are adjacent (clean loop)
// Player starts: Red=0, Green=14, Yellow=28, Blue=42
const LUDO_PATH = [
  // RED section (0-13): goes UP col 0, RIGHT along row 6, UP col 6
  {c:0,r:8},{c:0,r:7},{c:0,r:6},
  {c:1,r:6},{c:2,r:6},{c:3,r:6},{c:4,r:6},{c:5,r:6},
  {c:6,r:6},{c:6,r:5},{c:6,r:4},{c:6,r:3},{c:6,r:2},{c:6,r:1},

  // GREEN section (14-27): goes LEFT along row 0, DOWN col 8, RIGHT along row 6
  {c:6,r:0},{c:7,r:0},{c:8,r:0},
  {c:8,r:1},{c:8,r:2},{c:8,r:3},{c:8,r:4},{c:8,r:5},
  {c:8,r:6},{c:9,r:6},{c:10,r:6},{c:11,r:6},{c:12,r:6},{c:13,r:6},

  // YELLOW section (28-41): goes RIGHT col14, DOWN along row 8, DOWN col 8
  {c:14,r:6},{c:14,r:7},{c:14,r:8},
  {c:13,r:8},{c:12,r:8},{c:11,r:8},{c:10,r:8},{c:9,r:8},
  {c:8,r:8},{c:8,r:9},{c:8,r:10},{c:8,r:11},{c:8,r:12},{c:8,r:13},

  // BLUE section (42-55): goes DOWN row 14, LEFT along col 6, LEFT along row 8
  {c:8,r:14},{c:7,r:14},{c:6,r:14},
  {c:6,r:13},{c:6,r:12},{c:6,r:11},{c:6,r:10},{c:6,r:9},
  {c:6,r:8},{c:5,r:8},{c:4,r:8},{c:3,r:8},{c:2,r:8},{c:1,r:8},
  // path[55]=(1,8) → path[0]=(0,8): adjacent ✓
];
const TRACK_SIZE     = LUDO_PATH.length; // 56
const PLAYER_START   = [45, 3, 17, 31];  // Red, Green, Yellow, Blue start indices
const HOME_COL_START = 55;               // enters home column at relative step 55
const WIN_REL        = 61;               // relative win position

// Absolute track positions that are SAFE (no kill): starting points + star locations
const SAFE_ABS = new Set([45, 3, 17, 31, 54, 40, 26, 12]);

// Home column cells (colored path toward center 7,7)
// Rotated according to user's game.png
const HOME_COLS = [
  // Red (slot 0): bottom arm (UP toward center)
  [{c:7,r:13},{c:7,r:12},{c:7,r:11},{c:7,r:10},{c:7,r:9},{c:7,r:8}],
  // Green (slot 1): left arm (RIGHT toward center)
  [{c:1,r:7},{c:2,r:7},{c:3,r:7},{c:4,r:7},{c:5,r:7},{c:6,r:7}],
  // Yellow (slot 2): top arm (DOWN toward center)
  [{c:7,r:1},{c:7,r:2},{c:7,r:3},{c:7,r:4},{c:7,r:5},{c:7,r:6}],
  // Blue (slot 3): right arm (LEFT toward center)
  [{c:13,r:7},{c:12,r:7},{c:11,r:7},{c:10,r:7},{c:9,r:7},{c:8,r:7}],
];

// Home base corner positions (where 4 pieces rest initially)
const HOME_PIECE_POSITIONS = [
  // Red: cols 0-5, rows 9-14 → 4 circle centers
  [{c:1.5,r:10.5},{c:4.5,r:10.5},{c:1.5,r:13.5},{c:4.5,r:13.5}],
  // Green: cols 0-5, rows 0-5
  [{c:1.5,r:1.5},{c:4.5,r:1.5},{c:1.5,r:4.5},{c:4.5,r:4.5}],
  // Yellow: cols 9-14, rows 0-5
  [{c:10.5,r:1.5},{c:13.5,r:1.5},{c:10.5,r:4.5},{c:13.5,r:4.5}],
  // Blue: cols 9-14, rows 9-14
  [{c:10.5,r:10.5},{c:13.5,r:10.5},{c:10.5,r:13.5},{c:13.5,r:13.5}],
];

// Color system
const PLAYER_COLOR_NAMES = ['red','green','yellow','blue','purple','orange','pink','cyan'];
const PLAYER_COLORS_HEX  = ['#E53935','#43A047','#FDD835','#1E88E5','#9C27B0','#FF5722','#E91E63','#00BCD4'];
const PLAYER_COLORS_DARK = ['#B71C1C','#1B5E20','#F57F17','#0D47A1','#6A1B9A','#BF360C','#880E4F','#006064'];
const PLAYER_COLORS_LIGHT= ['#ffcdd2','#c8e6c9','#fff9c4','#bbdefb','#e1bee7','#fbe9e7','#fce4ec','#e0f7fa'];

// Dice faces
const DICE_FACES = ['⚀','⚁','⚂','⚃','⚄','⚅'];

// ═══════════════════════════════════════════════════════
//  GAME STATE
// ═══════════════════════════════════════════════════════

let gameState = {
  players: [],
  currentPlayer: 0,
  lastRoll: 0,
  diceRolled: false,
  moveCount: 0,
};
let ws = null;
let pendingLoveQuestion = null;
let mySlot = -1; // which slot I am (online)

// ═══════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  renderBoard();
  updateRoomDisplay();
  if (gameMode === 'offline') {
    initOfflineGame();
  } else {
    initOnlineGame();
  }
  document.addEventListener('keydown', e => {
    if (e.code === 'Space') { e.preventDefault(); rollDice(); }
  });
});

function updateRoomDisplay() {
  if (gameMode === 'online' && roomId) {
    document.getElementById('roomDisplay').textContent   = roomType === 'lovers' ? '💖 ROOM' : 'ROOM';
    document.getElementById('roomIdDisplay').textContent = roomId;
  } else {
    document.getElementById('roomDisplay').textContent   = 'OFFLINE';
    document.getElementById('roomIdDisplay').textContent = playerCount + 'P';
  }
}

// ─── Offline Init ──────────────────────────────────────
function initOfflineGame() {
  const pCount = Math.min(playerCount, 4); // board supports 4 slots
  gameState.players = Array.from({length:pCount}, (_,i) => ({
    id:   'p'+i,
    name: i===0 ? myName : `Player ${i+1}`,
    color: PLAYER_COLOR_NAMES[i],
    colorHex: PLAYER_COLORS_HEX[i],
    slot: i,
    pieces: [-1,-1,-1,-1],
    piecesWon: 0,
    finished: false,
  }));
  gameState.currentPlayer = 0;
  renderPlayersBar();
  drawPieces();
  updateTurnDisplay();
}

// ─── Online Init ───────────────────────────────────────
function initOnlineGame() {
  const savedRoomInfo = sessionStorage.getItem('roomInfo');
  if (savedRoomInfo) {
    const ri = JSON.parse(savedRoomInfo);
    gameState.players = ri.players.map((p,i) => ({
      id: p.id, name: p.name,
      color: PLAYER_COLOR_NAMES[i], colorHex: PLAYER_COLORS_HEX[i],
      slot: i, pieces: [-1,-1,-1,-1], piecesWon: 0, finished: false,
    }));
    gameState.currentPlayer = 0;
    mySlot = gameState.players.findIndex(p => p.id === myPlayerId);
  }
  reconnectWS();
  renderPlayersBar();
  drawPieces();
  updateTurnDisplay();
}

// ─── WS ────────────────────────────────────────────────
function reconnectWS() {
  let url = sessionStorage.getItem('serverUrl') || localStorage.getItem('serverUrl');
  if (!url) {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    url = `${proto}//${location.host}`;
  }
  if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
    url = (location.protocol === 'https:' ? 'wss://' : 'ws://') + url;
  }
  ws = new WebSocket(url);
  ws.onopen = () => {
    if (roomId && myPlayerId) sendWS({type:'rejoin-room', roomId, playerId:myPlayerId});
  };
  ws.onmessage = handleOnlineMessage;
  ws.onerror   = () => showToast('Connection error! Is the server running?', 'error');
}
function sendWS(data) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
}

// ═══════════════════════════════════════════════════════
//  BOARD RENDERING
// ═══════════════════════════════════════════════════════

// SVG helpers
function svgEl(tag, attrs={}) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs).forEach(([k,v]) => el.setAttribute(k,v));
  return el;
}
function addRect(parent, x,y,w,h, fill,stroke='none',sw=0,rx=0) {
  parent.appendChild(svgEl('rect',{x,y,width:w,height:h,fill,stroke,'stroke-width':sw,rx}));
}
function addCircle(parent, cx,cy,r,fill,stroke='none',sw=0) {
  parent.appendChild(svgEl('circle',{cx,cy,r,fill,stroke,'stroke-width':sw}));
}
function addText(parent, x,y,text,size='14px',fill='#333',anchor='middle') {
  const el = svgEl('text',{x,y,'font-size':size,'text-anchor':anchor,
    'dominant-baseline':'middle',fill,'font-family':'Outfit,sans-serif'});
  el.textContent = text;
  parent.appendChild(el);
}
function addLine(parent, x1,y1,x2,y2,stroke,sw=1) {
  parent.appendChild(svgEl('line',{x1,y1,x2,y2,stroke,'stroke-width':sw}));
}

function renderBoard() {
  const svg = document.getElementById('board-svg');
  svg.innerHTML = '';
  const S = CELL;
  const isSpecial = (cutieModeOn || roomType === 'lovers');

  // ── Board bg ──
  const boardBg  = isSpecial ? '#fff5f7' : '#0e0e22';
  const pathCell  = isSpecial ? '#ffffff' : 'rgba(255,255,255,0.07)';
  const gridLine  = isSpecial ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.08)';
  const textColor = isSpecial ? '#333' : '#eee';

  addRect(svg, 0,0, BOARD_SIZE,BOARD_SIZE, boardBg, isSpecial?'#ddd':'rgba(255,255,255,0.1)', 2, 4);

  // ── Home Base corners ──
  // Red: cols 0-5, rows 9-14 (bottom-left)
  // Green: cols 0-5, rows 0-5 (top-left)
  // Yellow: cols 9-14, rows 0-5 (top-right)
  // Blue: cols 9-14, rows 9-14 (bottom-right)
  const homeData = [
    { slot:0, x:0,    y:9*S, color:PLAYER_COLORS_HEX[0], dark:PLAYER_COLORS_DARK[0], label:'RED' },
    { slot:1, x:0,    y:0,   color:PLAYER_COLORS_HEX[1], dark:PLAYER_COLORS_DARK[1], label:'GREEN' },
    { slot:2, x:9*S,  y:0,   color:PLAYER_COLORS_HEX[2], dark:PLAYER_COLORS_DARK[2], label:'YELLOW'},
    { slot:3, x:9*S,  y:9*S, color:PLAYER_COLORS_HEX[3], dark:PLAYER_COLORS_DARK[3], label:'BLUE' },
  ];

  homeData.forEach(h => {
    const sz = 6*S;
    // Outer colored square
    addRect(svg, h.x, h.y, sz, sz, h.color, h.dark, 2.5);
    // Inner white square
    const pad = 10;
    addRect(svg, h.x+pad, h.y+pad, sz-pad*2, sz-pad*2, '#ffffff', h.color, 1.5, 8);

    // 4 piece circles (home positions)
    const cx = [h.x+1.5*S, h.x+4.5*S, h.x+1.5*S, h.x+4.5*S];
    const cy = [h.y+1.5*S, h.y+1.5*S, h.y+4.5*S, h.y+4.5*S];
    cx.forEach((ccx,i) => {
      // Shadow
      addCircle(svg, ccx, cy[i]+3, S*0.52, 'rgba(0,0,0,0.15)');
      // Main circle
      addCircle(svg, ccx, cy[i], S*0.5, h.color+'dd', h.dark, 2.5);
      // Inner highlight
      addCircle(svg, ccx-S*0.14, cy[i]-S*0.14, S*0.18, 'rgba(255,255,255,0.5)');
    });

    // Player label
    addText(svg, h.x+sz/2, h.y+sz/2, '', '0px', textColor);
  });

  // ── Cross arms (path background) ──
  const crossParts = [
    // Left arm: cols 0-5, rows 6-8
    { x:0,    y:6*S, w:6*S,  h:3*S },
    // Right arm: cols 9-14, rows 6-8
    { x:9*S,  y:6*S, w:6*S,  h:3*S },
    // Top arm: cols 6-8, rows 0-5
    { x:6*S,  y:0,   w:3*S,  h:6*S },
    // Bottom arm: cols 6-8, rows 9-14
    { x:6*S,  y:9*S, w:3*S,  h:6*S },
    // Center: cols 6-8, rows 6-8
    { x:6*S,  y:6*S, w:3*S,  h:3*S },
  ];
  crossParts.forEach(p => addRect(svg, p.x, p.y, p.w, p.h, pathCell, gridLine, 0.5));

  // ── Grid lines on cross ──
  for (let c = 0; c <= COLS; c++) {
    for (let r = 0; r <= COLS; r++) {
      if (isCrossCell(c,r)) {
        addRect(svg, c*S, r*S, S, S, 'none', gridLine, 0.5);
      }
    }
  }

  // ── Home columns (colored strips) ──
  const hcColors = PLAYER_COLORS_HEX.map((h,i) => i < 4 ? h : h);
  HOME_COLS.forEach((col, pi) => {
    if (pi >= gameState.players.length && gameState.players.length > 0) return;
    col.forEach((coord, step) => {
      const alpha = Math.round(180 + step * 12).toString(16).padStart(2,'0');
      addRect(svg, coord.c*S, coord.r*S, S, S, PLAYER_COLORS_HEX[pi]+'bb', PLAYER_COLORS_HEX[pi], 1);
    });
  });

  // ── Path squares: mark starts & safe squares ──
  LUDO_PATH.forEach((coord, idx) => {
    const isPlayerStart = PLAYER_START.includes(idx);
    const isSafe        = SAFE_ABS.has(idx) && !isPlayerStart;

    if (isPlayerStart) {
      const slot = PLAYER_START.indexOf(idx);
      addCircle(svg, (coord.c+0.5)*S, (coord.r+0.5)*S, 14, 'rgba(30, 136, 229, 0.25)', '#1E88E5', 2);
      const arrows = ['▲','▶','▼','◀'];
      addText(svg, (coord.c+0.5)*S, (coord.r+0.5)*S+1, arrows[slot], '13px', '#1E88E5');
    }

    if (isSafe) {
      // Star safe square (star is colored green)
      addRect(svg, coord.c*S+1, coord.r*S+1, S-2, S-2,
        'rgba(67, 160, 71, 0.1)', 'rgba(67, 160, 71, 0.35)', 1, 4);
      addText(svg, (coord.c+0.5)*S, (coord.r+0.5)*S+1, '⭐', Math.floor(S*0.58)+'px', '#43A047');
    }
  });

  // ── Center 3×3: triangles + home circle ──
  drawCenter(svg, S, isSpecial);

  // ── Board border ──
  addRect(svg, 0,0, BOARD_SIZE,BOARD_SIZE, 'none',
    isSpecial ? 'rgba(200,100,120,0.5)' : 'rgba(255,255,255,0.15)', 3, 4);

  // ── Pieces layer (always on top) ──
  svg.appendChild(svgEl('g',{id:'pieces-layer'}));
}

function isCrossCell(c, r) {
  return (c>=0&&c<=5&&r>=6&&r<=8) || (c>=9&&c<=14&&r>=6&&r<=8) ||
         (c>=6&&c<=8&&r>=0&&r<=5) || (c>=6&&c<=8&&r>=9&&r<=14) ||
         (c>=6&&c<=8&&r>=6&&r<=8);
}

function drawCenter(svg, S, isSpecial) {
  const cx = 7.5*S, cy = 7.5*S, half = 1.5*S;
  const colors = PLAYER_COLORS_HEX;

  // 4 colored triangles (one per player corner)
  function tri(pts, fill) {
    const el = svgEl('polygon',{points:pts,fill,'opacity':'0.85'});
    svg.appendChild(el);
  }
  // Left triangle (Green)
  tri(`${cx-half},${cy-half} ${cx},${cy} ${cx-half},${cy+half}`, colors[1]);
  // Top triangle (Yellow)
  tri(`${cx-half},${cy-half} ${cx},${cy} ${cx+half},${cy-half}`, colors[2]);
  // Right triangle (Blue)
  tri(`${cx+half},${cy-half} ${cx},${cy} ${cx+half},${cy+half}`, colors[3]);
  // Bottom triangle (Red)
  tri(`${cx-half},${cy+half} ${cx},${cy} ${cx+half},${cy+half}`, colors[0]);

  // Center star/home symbol
  addCircle(svg, cx, cy, S*0.42, '#ffffff', 'rgba(0,0,0,0.15)', 1.5);
  addText(svg, cx, cy+1, '⭐', Math.floor(S*0.45)+'px');
}

// ═══════════════════════════════════════════════════════
//  PIECE RENDERING
// ═══════════════════════════════════════════════════════

function getPieceXY(playerSlot, pieceIdx, pos) {
  const S = CELL;

  if (pos === -1) {
    // Home base (fixed offsets)
    const bp = HOME_PIECE_POSITIONS[playerSlot][pieceIdx];
    return { x: bp.c * S, y: bp.r * S };
  }

  if (pos === 999) {
    // Won — near center (fixed angles)
    const angles = [225, 315, 45, 135];
    const ang = angles[playerSlot] * Math.PI / 180;
    return { x: 7.5*S + Math.cos(ang)*S*0.28, y: 7.5*S + Math.sin(ang)*S*0.28 };
  }

  if (pos >= 100) {
    // Home column step
    const step = Math.min(pos - 100, HOME_COLS[playerSlot].length-1);
    const col = HOME_COLS[playerSlot][step];
    return { x:(col.c+0.5)*S, y:(col.r+0.5)*S };
  }

  // Main track
  const absPos = (PLAYER_START[playerSlot] + pos) % TRACK_SIZE;
  const coord  = LUDO_PATH[absPos];
  return { x:(coord.c+0.5)*S, y:(coord.r+0.5)*S };
}

function drawPieces() {
  const layer = document.getElementById('pieces-layer');
  if (!layer) return;
  layer.innerHTML = '';
  const S = CELL;

  // Map of cellKey -> array of {playerIdx, pieceIdx, pos}
  const cellGroups = {};

  gameState.players.forEach((player, pi) => {
    player.pieces.forEach((pos, ii) => {
      let key = null;
      if (pos === -1) {
        key = `base_${pi}_${ii}`;
      } else if (pos === 999) {
        key = `won_${pi}_${ii}`;
      } else if (pos >= 100) {
        const step = Math.min(pos - 100, HOME_COLS[pi].length - 1);
        key = `homecol_${pi}_${step}`;
      } else {
        const absPos = (PLAYER_START[pi] + pos) % TRACK_SIZE;
        key = `main_${absPos}`;
      }
      if (!cellGroups[key]) cellGroups[key] = [];
      cellGroups[key].push({ pi, ii, pos });
    });
  });

  gameState.players.forEach((player, pi) => {
    const hex  = player.colorHex || PLAYER_COLORS_HEX[pi];
    const dark = PLAYER_COLORS_DARK[pi];
    const lite = PLAYER_COLORS_LIGHT[pi];

    player.pieces.forEach((pos, ii) => {
      let key = null;
      if (pos === -1)             key = `base_${pi}_${ii}`;
      else if (pos === 999)       key = `won_${pi}_${ii}`;
      else if (pos >= 100) {
        const step = Math.min(pos - 100, HOME_COLS[pi].length - 1);
        key = `homecol_${pi}_${step}`;
      } else {
        const absPos = (PLAYER_START[pi] + pos) % TRACK_SIZE;
        key = `main_${absPos}`;
      }

      const group = cellGroups[key];
      const groupIdx = group.findIndex(item => item.pi === pi && item.ii === ii);

      // Calculate offset based on group size
      let off = { x: 0, y: 0 };
      if (group.length === 2) {
        off = [
          { x: -S * 0.16, y: 0 },
          { x: S * 0.16,  y: 0 }
        ][groupIdx];
      } else if (group.length > 2) {
        off = [
          { x: -S * 0.16, y: -S * 0.16 },
          { x: S * 0.16,  y: -S * 0.16 },
          { x: -S * 0.16, y: S * 0.16 },
          { x: S * 0.16,  y: S * 0.16 }
        ][groupIdx % 4];
      }

      const baseXY = getPieceXY(pi, ii, pos);
      const x = baseXY.x + off.x;
      const y = baseXY.y + off.y;

      const canMove = canMovePiece(pi, ii);
      const R = S * 0.38;

      // Glow when movable
      if (canMove) {
        const glow = svgEl('circle',{
          cx:x, cy:y, r:R+5, fill:'none',
          stroke:hex, 'stroke-width':2,
          opacity:0.6,
        });
        const anim = svgEl('animate',{
          attributeName:'r', values:`${R+3};${R+8};${R+3}`,
          dur:'1s', repeatCount:'indefinite',
        });
        glow.appendChild(anim);
        layer.appendChild(glow);
      }

      // Shadow
      addCircle(layer, x, y+2, R, 'rgba(0,0,0,0.3)');
      // Piece body
      addCircle(layer, x, y, R, hex, dark, 2);
      // Inner ring
      addCircle(layer, x, y, R*0.65, dark+'55', lite, 1.5);
      // Highlight
      addCircle(layer, x-R*0.28, y-R*0.28, R*0.22, 'rgba(255,255,255,0.55)');
      // Number
      addText(layer, x, y+1, String(ii+1), Math.floor(S*0.3)+'px', '#fff');

      // Clickable area (exactly r=19.2px)
      const hit = svgEl('circle',{ cx:x, cy:y, r:19.2, fill:'transparent', cursor:'pointer' });
      hit.addEventListener('click', () => handlePieceClick(pi, ii));
      layer.appendChild(hit);

      // Won pieces at center
      if (pos === 999) {
        const {x:wx, y:wy} = getPieceXY(pi, ii, 999);
        addCircle(layer, wx, wy+1, R*0.7, 'rgba(0,0,0,0.25)');
        addCircle(layer, wx, wy, R*0.7, hex, dark, 1.5);
        addCircle(layer, wx-R*0.2, wy-R*0.2, R*0.15, 'rgba(255,255,255,0.5)');
      }
    });
  });
}

// ═══════════════════════════════════════════════════════
//  MOVEMENT LOGIC
// ═══════════════════════════════════════════════════════

function canMovePiece(playerIdx, pieceIdx) {
  if (!gameState.diceRolled) return false;
  if (gameMode === 'offline' && gameState.currentPlayer !== playerIdx) return false;
  if (gameMode === 'online'  && mySlot !== playerIdx) return false;
  if (gameMode === 'online'  && gameState.currentPlayer !== playerIdx) return false;

  const pos  = gameState.players[playerIdx].pieces[pieceIdx];
  const roll = gameState.lastRoll;
  if (pos === 999) return false;
  if (pos === -1) return roll === 6;

  if (pos >= 100) {
    const homeStep = pos - 100; // 0-5
    return (homeStep + roll) <= 6;
  }

  const newRelPos = pos + roll;
  return newRelPos <= WIN_REL;
}

function hasAnyMove(playerIdx) {
  return gameState.players[playerIdx].pieces.some((_,ii) => canMovePiece(playerIdx, ii));
}

// Apply a move (offline)
function applyOfflineMove(playerIdx, pieceIdx) {
  const player = gameState.players[playerIdx];
  const roll   = gameState.lastRoll;
  let pos      = player.pieces[pieceIdx];
  let killed   = false;

  // Enter board
  if (pos === -1) {
    if (roll !== 6) return false;
    player.pieces[pieceIdx] = 0;
    checkWin(playerIdx);
    return true;
  }
  if (pos === 999) return false;

  // Current relative position
  let relPos = pos >= 100 ? HOME_COL_START + (pos - 100) : pos;
  const newRel = relPos + roll;

  if (newRel > WIN_REL) return false;

  if (newRel === WIN_REL) {
    // WIN!
    player.pieces[pieceIdx] = 999;
    player.piecesWon = (player.piecesWon || 0) + 1;
    if (player.piecesWon === 4) { triggerWin(playerIdx); return true; }
    showToast(`${player.name} got a piece home! 🏠`, 'success');
    return true;
  }

  if (newRel >= HOME_COL_START) {
    // Enter / advance home column
    player.pieces[pieceIdx] = 100 + (newRel - HOME_COL_START);
    return true;
  }

  // Normal move on main track
  player.pieces[pieceIdx] = newRel;
  const absPos = (PLAYER_START[playerIdx] + newRel) % TRACK_SIZE;

  // Kill check (not on safe square)
  if (!SAFE_ABS.has(absPos)) {
    gameState.players.forEach((other, oi) => {
      if (oi === playerIdx) return;
      other.pieces.forEach((oPos, pi) => {
        if (oPos < 0 || oPos === 999 || oPos >= 100) return;
        const otherAbs = (PLAYER_START[oi] + oPos) % TRACK_SIZE;
        if (otherAbs === absPos) {
          other.pieces[pi] = -1;
          killed = true;
          showToast(`${player.name} killed ${other.name}'s piece! 💀`, 'success');
        }
      });
    });
  }

  return killed ? 'kill' : true;
}

function checkWin(playerIdx) {
  const all = gameState.players[playerIdx].pieces.every(p => p === 999);
  if (all) triggerWin(playerIdx);
}

// ═══════════════════════════════════════════════════════
//  DICE + TURN LOGIC
// ═══════════════════════════════════════════════════════

function rollDice() {
  if (gameState.diceRolled) {
    showToast('Move a piece first!', 'error'); return;
  }
  if (gameMode === 'online') {
    if (mySlot !== gameState.currentPlayer) {
      showToast("It's not your turn!", 'error'); return;
    }
    sendWS({ type:'roll-dice', roomId, playerId:myPlayerId });
    return;
  }
  // Offline
  const roll = Math.floor(Math.random() * 6) + 1;
  gameState.lastRoll  = roll;
  gameState.diceRolled = true;
  gameState.moveCount++;
  animateDice(roll);
  document.getElementById('lastRollDisplay').textContent = roll;

  // Check love question (lovers room, first 20 moves, one time)
  if (roomType === 'lovers' && gameState.moveCount <= 20 && !gameState.loveQuestionFired &&
      gameState.players.length >= 2 && Math.random() < 0.15) {
    gameState.loveQuestionFired = true;
    const asker  = gameState.players[gameState.currentPlayer];
    const target = gameState.players[(gameState.currentPlayer + 1) % gameState.players.length];
    pendingLoveQuestion = { askerIdx: gameState.currentPlayer, targetName: target.name };
    document.getElementById('loveQuestionText').textContent =
      `${asker.name}, do you love ${target.name}? 💖`;
    document.getElementById('loveModal').classList.remove('hidden');
    return; // Wait for answer before showing move options
  }

  if (!hasAnyMove(gameState.currentPlayer)) {
    showToast('No moves available — skipping turn', 'error');
    setTimeout(advanceTurn, 1200);
  } else {
    updateTurnDisplay();
    drawPieces();
  }
}

function animateDice(roll) {
  const el = document.getElementById('dice');
  el.classList.add('rolling');
  let i = 0;
  const interval = setInterval(() => {
    el.textContent = DICE_FACES[Math.floor(Math.random()*6)];
    if (++i >= 8) {
      clearInterval(interval);
      el.textContent = DICE_FACES[roll-1];
      el.classList.remove('rolling');
    }
  }, 60);
}

function handlePieceClick(playerIdx, pieceIdx) {
  if (!canMovePiece(playerIdx, pieceIdx)) return;

  if (gameMode === 'online') {
    sendWS({ type:'move-piece', roomId, playerId:myPlayerId, pieceIdx });
    return;
  }

  const result = applyOfflineMove(playerIdx, pieceIdx);
  if (!result && result !== 'kill') { showToast("Can't move that piece!", 'error'); return; }

  gameState.diceRolled = false;
  drawPieces();
  updateTurnDisplay();

  const rolled6 = gameState.lastRoll === 6;
  const killed  = result === 'kill';

  if (rolled6 || killed) {
    showToast(rolled6 ? '🎯 Rolled 6 — Roll again!' : '💀 Killed! Roll again!', 'success');
    gameState.diceRolled = false;
  } else {
    advanceTurn();
  }
}

function advanceTurn() {
  const np = gameState.players.length;
  let next = (gameState.currentPlayer + 1) % np;
  // Skip finished players
  let tries = 0;
  while (gameState.players[next].finished && tries < np) { next = (next+1)%np; tries++; }
  gameState.currentPlayer = next;
  gameState.diceRolled    = false;
  gameState.lastRoll      = 0;
  document.getElementById('dice').textContent = '🎲';
  updateTurnDisplay();
  drawPieces();
}

// ═══════════════════════════════════════════════════════
//  LOVE MECHANICS
// ═══════════════════════════════════════════════════════

function answerLoveQuestion(yes) {
  document.getElementById('loveModal').classList.add('hidden');
  if (yes) {
    // Gift a 6
    gameState.lastRoll = 6;
    gameState.diceRolled = true;
    animateDice(6);
    document.getElementById('lastRollDisplay').textContent = '6';

    const asker  = gameState.players[pendingLoveQuestion.askerIdx];
    showLovePopup(`💖 ${asker.name} loves ${pendingLoveQuestion.targetName}! 💖`);
    triggerLoveShower('heart');

    if (gameMode === 'online') {
      sendWS({ type:'love-answer', roomId, yes:true,
        askerName:asker.name, targetName:pendingLoveQuestion.targetName });
    }
  } else {
    // Keep the original random number rolled!
    if (gameMode === 'online') {
      sendWS({ type:'love-answer', roomId, yes:false });
    }
  }

  // Re-check move validity with the final roll
  if (!hasAnyMove(gameState.currentPlayer)) {
    showToast('No moves available — skipping turn', 'error');
    setTimeout(advanceTurn, 1200);
  } else {
    updateTurnDisplay();
    drawPieces();
  }
}

function sendLoveShower(kind) {
  triggerLoveShower(kind);
  if (gameMode === 'online') sendWS({ type:'love-shower', roomId, kind, senderName:myName });
}

function triggerLoveShower(kind='heart') {
  const emojis = kind === 'rose' ? ['🌹','🌷','💐'] : ['💖','💕','❤️','💗','💓'];
  for (let i = 0; i < 22; i++) {
    const el = document.createElement('div');
    el.className = 'floater';
    el.textContent = emojis[Math.floor(Math.random()*emojis.length)];
    el.style.left  = Math.random()*100 + 'vw';
    el.style.top   = Math.random()*60 + 20 + 'vh';
    el.style.setProperty('--r', (Math.random()*60-30)+'deg');
    el.style.animationDelay = Math.random()*1 + 's';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }
}

function showLovePopup(text) {
  const el = document.createElement('div');
  el.className = 'love-popup';
  el.innerHTML = `<h2>💖</h2><p>${text}</p>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ═══════════════════════════════════════════════════════
//  WIN / UI
// ═══════════════════════════════════════════════════════

function triggerWin(playerIdx) {
  const player = gameState.players[playerIdx];
  document.getElementById('winTitle').textContent = `${player.name} Wins! 🏆`;
  document.getElementById('winSub').textContent =
    roomType === 'lovers' ? '💖 The champion of love wins! 💖' : 'The Ludo Champion has been crowned 👑';
  document.getElementById('winScreen').classList.remove('hidden');
  if (roomType === 'lovers') triggerLoveShower('heart');
  else launchConfetti();
}

function launchConfetti() {
  const colors = ['#00f5ff','#bf00ff','#ff4d8d','#ffd700','#00ff88'];
  for (let i = 0; i < 60; i++) {
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed; left:${Math.random()*100}vw; top:-10px;
      width:${Math.random()*10+5}px; height:${Math.random()*10+5}px;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      border-radius:${Math.random()>0.5?'50%':'2px'};
      z-index:9999; pointer-events:none;
      animation:confettiFall ${Math.random()*2+2}s ease-in forwards;
      animation-delay:${Math.random()*1.5}s;
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }
  const style = document.createElement('style');
  style.textContent = `@keyframes confettiFall{to{transform:translateY(110vh) rotate(720deg);opacity:0}}`;
  document.head.appendChild(style);
}

function updateTurnDisplay() {
  const p = gameState.players[gameState.currentPlayer];
  if (!p) return;
  document.getElementById('turnDisplay').textContent =
    gameMode === 'online' && gameState.currentPlayer === mySlot
      ? `🎯 YOUR TURN — Roll the dice!`
      : `🎲 ${p?.name || '?'}'s turn`;
  document.getElementById('rollBtn').disabled = gameState.diceRolled;
  renderPlayersBar();
}

function renderPlayersBar() {
  const bar = document.getElementById('playersBar');
  bar.innerHTML = gameState.players.map((p,i) => {
    const won = (p.piecesWon || 0);
    const active = i === gameState.currentPlayer;
    return `<div class="player-slot ${active?'active':''}" style="${active?`border-color:${p.colorHex};box-shadow:0 0 12px ${p.colorHex}44`:''}">
      <span class="player-dot" style="background:${p.colorHex}"></span>
      <span>${p.name}</span>
      <span class="player-score">${won}/4 🏠</span>
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════
//  EMOTES
// ═══════════════════════════════════════════════════════

function sendEmote(text) {
  const p = gameState.players[gameMode==='online'?mySlot:gameState.currentPlayer];
  if (!p) return;
  showEmoteFeed(p.name, text, p.colorHex);
  if (gameMode === 'online') sendWS({ type:'emote', roomId, text, playerId:myPlayerId });
}

function showEmoteFeed(name, text, color='#fff') {
  const feed = document.getElementById('emoteFeed');
  const el   = document.createElement('div');
  el.className = 'emote-entry';
  el.innerHTML = `<span style="color:${color};font-weight:700">${name}:</span> ${text}`;
  feed.prepend(el);
  while (feed.children.length > 3) feed.lastChild.remove();
}

// ═══════════════════════════════════════════════════════
//  ONLINE MESSAGE HANDLER
// ═══════════════════════════════════════════════════════

function handleOnlineMessage(event) {
  const msg = JSON.parse(event.data);
  switch (msg.type) {

    case 'rejoined':
      if (msg.gameState) {
        gameState = msg.gameState;
        gameState.players.forEach((p,i) => { p.colorHex = PLAYER_COLORS_HEX[i]; p.piecesWon = p.piecesWon||0; });
      }
      mySlot = gameState.players.findIndex(p => p.id === myPlayerId);
      showToast('Reconnected ✅', 'success');
      renderPlayersBar(); drawPieces(); updateTurnDisplay();
      break;

    case 'player-reconnected':
      showToast(`${msg.playerName} reconnected 👋`, 'info');
      break;

    case 'dice-rolled':
      gameState.lastRoll  = msg.roll;
      gameState.diceRolled = true;
      if (msg.gameState) Object.assign(gameState, msg.gameState);
      animateDice(msg.roll);
      document.getElementById('lastRollDisplay').textContent = msg.roll;
      updateTurnDisplay(); drawPieces();

      if (msg.loveQuestion) {
        pendingLoveQuestion = msg.loveQuestion;
        if (msg.loveQuestion.askerIdx === mySlot) {
          const target = gameState.players[(mySlot+1)%gameState.players.length];
          document.getElementById('loveQuestionText').textContent =
            `${myName}, do you love ${target.name}? 💖`;
          document.getElementById('loveModal').classList.remove('hidden');
        }
      }
      break;

    case 'piece-moved':
      if (msg.gameState) {
        gameState = msg.gameState;
        gameState.players.forEach((p,i) => { p.colorHex=PLAYER_COLORS_HEX[i]; p.piecesWon=p.piecesWon||0; });
      }
      drawPieces(); updateTurnDisplay();
      break;

    case 'love-answer':
      if (msg.yes) {
        gameState.lastRoll  = 6;
        gameState.diceRolled = true;
        animateDice(6);
        document.getElementById('lastRollDisplay').textContent = '6';
        showLovePopup(`💖 ${msg.askerName} loves ${msg.targetName}!`);
        triggerLoveShower('heart');
        drawPieces(); updateTurnDisplay();
      }
      document.getElementById('loveModal').classList.add('hidden');
      break;

    case 'love-shower':
      triggerLoveShower(msg.kind);
      showToast(`${msg.senderName} sent ${msg.kind==='rose'?'🌹 roses':'💕 hearts'}!`, 'love');
      break;

    case 'emote':
      showEmoteFeed(msg.playerName, msg.text, msg.playerColor);
      break;

    case 'game-over':
      triggerWin(msg.winnerIndex);
      break;

    case 'player-disconnected':
      showToast(`${msg.playerName} disconnected 😢`, 'error');
      break;

    case 'error':
      showToast(msg.message, 'error');
      break;
  }
}

// ═══════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════

function showToast(msg, type='info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast show toast-${type}`;
  clearTimeout(t._to);
  t._to = setTimeout(() => t.className='toast', 3000);
}

function goHome() { window.location.href='index.html'; }
