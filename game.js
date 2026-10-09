'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
  [[8,8,8],[8,0,8],[8,8,8]],                  // N - tuerca (hueco central)
];

const LINE_SCORES = [0, 100, 300, 500, 800];
const MAX_START_LEVEL = 15;
const MAX_RECORDS = 5;

const THEME_KEY = 'tetris-theme';
const SKIN_KEY = 'tetris-skin';
const START_LEVEL_KEY = 'tetris-start-level';
const RECORDS_KEY = 'tetris-records';
const LAST_NAME_KEY = 'tetris-last-name';

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const screens = {
  start: document.getElementById('start-screen'),
  pause: document.getElementById('pause-menu'),
  over: document.getElementById('gameover-screen'),
};
const playBtn = document.getElementById('play-btn');
const resumeBtn = document.getElementById('resume-btn');
const pauseRestartBtn = document.getElementById('pause-restart-btn');
const controlsBtn = document.getElementById('controls-btn');
const pauseControls = document.getElementById('pause-controls');
const startLevelSelects = document.querySelectorAll('.start-level-select');
const gameoverScore = document.getElementById('gameover-score');
const gameoverStats = document.getElementById('gameover-stats');
const newRecordMsg = document.getElementById('new-record-msg');
const nameForm = document.getElementById('name-form');
const nameInput = document.getElementById('name-input');
const playAgainBtn = document.getElementById('play-again-btn');
const mainMenuBtn = document.getElementById('main-menu-btn');
const themeToggle = document.getElementById('theme-toggle');
const skinSelect = document.getElementById('skin-select');

const themeColors = { grid: '', highlight: '' };

function storageGet(key) {
  try { return localStorage.getItem(key); }
  catch { return null; }
}

function storageSet(key, value) {
  try { localStorage.setItem(key, value); }
  catch { /* sin persistencia */ }
}

// ---- Skins ----
// Cada paleta debe tener PIECES.length entradas (índice 0 = vacío).

function roundRectPath(context, x, y, w, h, r) {
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
}

const SKINS = {
  retro: {
    label: 'Retro',
    colors: [null, '#4dd0e1', '#ffd54f', '#ba68c8', '#81c784', '#e57373', '#90caf9', '#ffb74d', '#b0bec5'],
    boardBg: null,
    gridColor: null,
    drawCell(context, x, y, size, color) {
      context.fillStyle = color;
      context.fillRect(x + 1, y + 1, size - 2, size - 2);
      context.fillStyle = themeColors.highlight;
      context.fillRect(x + 1, y + 1, size - 2, 4);
    },
  },
  neon: {
    label: 'Neón',
    colors: [null, '#00f0ff', '#fff200', '#d400ff', '#39ff14', '#ff073a', '#2979ff', '#ff9100', '#e0e0ff'],
    boardBg: '#000000',
    gridColor: '#101020',
    drawCell(context, x, y, size, color) {
      const alpha = context.globalAlpha;
      context.shadowColor = color;
      context.shadowBlur = 12;
      context.globalAlpha = alpha * 0.3;
      context.fillStyle = color;
      context.fillRect(x + 3, y + 3, size - 6, size - 6);
      context.globalAlpha = alpha;
      context.strokeStyle = color;
      context.lineWidth = 2;
      context.strokeRect(x + 3, y + 3, size - 6, size - 6);
    },
  },
  pastel: {
    label: 'Pastel',
    colors: [null, '#a8e6ef', '#fff1a8', '#d9b8e8', '#b9e4c0', '#f5b5b5', '#b8d4f5', '#ffd3a8', '#d5dbe0'],
    boardBg: null,
    gridColor: null,
    drawCell(context, x, y, size, color) {
      context.fillStyle = color;
      roundRectPath(context, x + 2, y + 2, size - 4, size - 4, size * 0.25);
      context.fill();
      context.fillStyle = 'rgba(255, 255, 255, 0.45)';
      roundRectPath(context, x + 6, y + 5, size - 12, size * 0.2, size * 0.1);
      context.fill();
    },
  },
  pixel: {
    label: 'Pixel art',
    colors: [null, '#3cbcfc', '#f8b800', '#9878f8', '#58d854', '#e40058', '#0058f8', '#f87858', '#bcbcbc'],
    boardBg: null,
    gridColor: null,
    drawCell(context, x, y, size, color) {
      const p = Math.max(2, Math.floor(size / 6));
      const n = Math.floor(size / p);
      context.fillStyle = color;
      context.fillRect(x, y, size, size);
      // bordes: luz arriba/izquierda, sombra abajo/derecha
      context.fillStyle = 'rgba(255, 255, 255, 0.45)';
      context.fillRect(x, y, size - p, p);
      context.fillRect(x, y, p, size - p);
      context.fillStyle = 'rgba(0, 0, 0, 0.4)';
      context.fillRect(x + p, y + size - p, size - p, p);
      context.fillRect(x + size - p, y + p, p, size - p);
      // textura interior determinista
      context.fillStyle = 'rgba(0, 0, 0, 0.18)';
      for (let i = 1; i < n - 1; i++)
        for (let j = 1; j < n - 1; j++)
          if ((i * 3 + j * 5) % 7 === 0) context.fillRect(x + i * p, y + j * p, p, p);
      context.fillStyle = 'rgba(255, 255, 255, 0.7)';
      context.fillRect(x + p, y + p, p, p);
    },
  },
};

let skin = SKINS.retro;

function applySkin(name) {
  const key = Object.hasOwn(SKINS, name) ? name : 'retro';
  skin = SKINS[key];
  skinSelect.value = key;
  if (board) { draw(); drawNext(); }
}

// ---- Tema claro/oscuro ----

// Aplica el tema (oscuro por defecto) y cachea los colores que usa el canvas.
function applyTheme(theme) {
  const light = theme === 'light';
  if (light) document.documentElement.setAttribute('data-theme', 'light');
  else document.documentElement.removeAttribute('data-theme');
  const styles = getComputedStyle(document.documentElement);
  themeColors.grid = styles.getPropertyValue('--grid').trim();
  themeColors.highlight = styles.getPropertyValue('--block-highlight').trim();
  themeToggle.textContent = light ? 'Modo oscuro' : 'Modo claro';
  themeToggle.setAttribute('aria-pressed', String(light));
  if (board) { draw(); drawNext(); }
}

function loadTheme() {
  return storageGet(THEME_KEY) === 'light' ? 'light' : 'dark';
}

// ---- Récords ----

function emptyRecords() {
  return { top: [], bestCombo: 0, maxLines: 0 };
}

function loadRecords() {
  try {
    const data = JSON.parse(storageGet(RECORDS_KEY));
    if (data && Array.isArray(data.top)) {
      return {
        top: data.top.slice(0, MAX_RECORDS),
        bestCombo: Number(data.bestCombo) || 0,
        maxLines: Number(data.maxLines) || 0,
      };
    }
  } catch { /* datos corruptos: se ignoran */ }
  return emptyRecords();
}

function saveRecords() {
  storageSet(RECORDS_KEY, JSON.stringify(records));
}

function qualifiesForTop(s) {
  return s > 0 && (records.top.length < MAX_RECORDS || s > records.top[records.top.length - 1].score);
}

function renderRecords(highlightIdx = -1) {
  document.querySelectorAll('.records-body').forEach(tbody => {
    tbody.replaceChildren();
    if (!records.top.length) {
      const tr = tbody.insertRow();
      const td = tr.insertCell();
      td.colSpan = 4;
      td.className = 'empty';
      td.textContent = 'Sin récords todavía';
      return;
    }
    records.top.forEach((r, i) => {
      const tr = tbody.insertRow();
      if (i === highlightIdx) tr.classList.add('highlight');
      for (const text of [i + 1, r.name, r.score.toLocaleString(), r.lines]) {
        tr.insertCell().textContent = text;
      }
    });
  });
  document.querySelectorAll('.records-stats').forEach(el => {
    el.textContent = `Mejor combo: ${records.bestCombo} · Líneas máx.: ${records.maxLines}`;
  });
}

let records = loadRecords();

// ---- Estado de la partida ----

// state: 'start' | 'playing' | 'paused' | 'over'
let board, current, next, score, lines, level, state, lastTime, dropAccum, dropInterval, animId;
let combo, gameBestCombo, pendingRecord;
let resumeGuard = false; // ignora teclas mantenidas (auto-repeat) justo al reanudar
let startLevel = clampLevel(Number(storageGet(START_LEVEL_KEY)));

function clampLevel(n) {
  return Math.min(MAX_START_LEVEL, Math.max(1, Math.floor(n) || 1));
}

function setStartLevel(n) {
  startLevel = clampLevel(n);
  storageSet(START_LEVEL_KEY, String(startLevel));
  startLevelSelects.forEach(sel => { sel.value = String(startLevel); });
}

function intervalFor(lvl) {
  return Math.max(100, 1000 - (lvl - 1) * 90);
}

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece() {
  const type = Math.floor(Math.random() * (PIECES.length - 1)) + 1;
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.max(startLevel, Math.floor(lines / 10) + 1);
    dropInterval = intervalFor(level);
    updateHUD();
  }
  return cleared;
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  merge();
  // combo = piezas consecutivas que limpian al menos una línea
  combo = clearLines() ? combo + 1 : 0;
  gameBestCombo = Math.max(gameBestCombo, combo);
  spawn();
}

function spawn() {
  current = next;
  next = randomPiece();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

// ---- Dibujo ----

function paintBackground(context, target) {
  if (skin.boardBg) {
    context.fillStyle = skin.boardBg;
    context.fillRect(0, 0, target.width, target.height);
  } else {
    context.clearRect(0, 0, target.width, target.height);
  }
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  context.save();
  context.globalAlpha = alpha ?? 1;
  skin.drawCell(context, x * size, y * size, size, skin.colors[colorIndex]);
  context.restore();
}

function drawGrid() {
  ctx.strokeStyle = skin.gridColor ?? themeColors.grid;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  paintBackground(ctx, canvas);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  if (!current) return; // pantalla de inicio: solo tablero

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
}

function drawNext() {
  const NB = 30;
  paintBackground(nextCtx, nextCanvas);
  if (!next) return;
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
}

// ---- Pantallas ----

function showScreen(name) {
  overlay.classList.toggle('hidden', !name);
  for (const [key, el] of Object.entries(screens)) el.classList.toggle('hidden', key !== name);
}

function showStartScreen() {
  state = 'start';
  cancelAnimationFrame(animId);
  renderRecords();
  showScreen('start');
  playBtn.focus();
}

function endGame() {
  state = 'over';
  cancelAnimationFrame(animId);
  draw();

  records.bestCombo = Math.max(records.bestCombo, gameBestCombo);
  records.maxLines = Math.max(records.maxLines, lines);
  saveRecords();

  gameoverScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  gameoverStats.textContent = `Líneas: ${lines} · Nivel: ${level} · Mejor combo: ${gameBestCombo}`;

  pendingRecord = qualifiesForTop(score);
  nameForm.classList.toggle('hidden', !pendingRecord);
  newRecordMsg.classList.toggle('hidden', !pendingRecord);
  if (pendingRecord) {
    const position = records.top.filter(r => r.score >= score).length + 1;
    newRecordMsg.textContent = `¡Nuevo récord! Puesto #${position}`;
  }
  renderRecords();
  showScreen('over');

  if (pendingRecord) {
    nameInput.value = storageGet(LAST_NAME_KEY) || '';
    nameInput.focus();
    nameInput.select();
  } else {
    playAgainBtn.focus();
  }
}

function saveRecord() {
  if (!pendingRecord) return;
  pendingRecord = false;
  const name = nameInput.value.trim().slice(0, 12) || 'Anónimo';
  storageSet(LAST_NAME_KEY, name);
  const entry = { name, score, lines, level };
  records.top.push(entry);
  records.top.sort((a, b) => b.score - a.score);
  records.top = records.top.slice(0, MAX_RECORDS);
  saveRecords();
  nameForm.classList.add('hidden');
  newRecordMsg.textContent = '¡Récord guardado!';
  renderRecords(records.top.indexOf(entry));
  playAgainBtn.focus();
}

function resetRecords() {
  if (!confirm('¿Borrar todos los récords?')) return;
  records = emptyRecords();
  saveRecords();
  renderRecords();
}

function togglePause() {
  if (state === 'playing') {
    state = 'paused';
    cancelAnimationFrame(animId);
    pauseControls.hidden = true;
    controlsBtn.setAttribute('aria-expanded', 'false');
    controlsBtn.textContent = 'Ver controles';
    showScreen('pause');
    resumeBtn.focus();
  } else if (state === 'paused') {
    state = 'playing';
    showScreen(null);
    document.activeElement?.blur();
    resumeGuard = true;
    dropAccum = 0;
    lastTime = performance.now();
    animId = requestAnimationFrame(loop);
  }
}

function toggleControls() {
  const show = pauseControls.hidden;
  pauseControls.hidden = !show;
  controlsBtn.setAttribute('aria-expanded', String(show));
  controlsBtn.textContent = show ? 'Ocultar controles' : 'Ver controles';
}

function loop(ts) {
  if (state !== 'playing') return;
  const dt = ts - lastTime;
  lastTime = ts;
  dropAccum += dt;
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
    } else {
      lockPiece();
    }
  }
  if (state !== 'playing') return; // endGame() se llamó durante este frame
  draw();
  animId = requestAnimationFrame(loop);
}

function startGame() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = startLevel;
  combo = 0;
  gameBestCombo = 0;
  pendingRecord = false;
  resumeGuard = false;
  dropInterval = intervalFor(level);
  dropAccum = 0;
  state = 'playing';
  next = randomPiece();
  spawn();
  updateHUD();
  showScreen(null);
  document.activeElement?.blur();
  cancelAnimationFrame(animId);
  lastTime = performance.now();
  animId = requestAnimationFrame(loop);
}

// ---- Entrada ----

const GAME_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'KeyX', 'Space']);

document.addEventListener('keydown', e => {
  if (e.target instanceof HTMLInputElement) return; // escribiendo el nombre
  if (e.code === 'KeyP' || e.code === 'Escape') {
    if (!e.repeat) togglePause();
    return;
  }
  // Con el menú abierto (o fuera de partida) las teclas de juego no hacen nada.
  if (state !== 'playing' || !GAME_KEYS.has(e.code)) return;
  e.preventDefault(); // evita scroll y que un select/botón con foco reaccione
  if (document.activeElement !== document.body) document.activeElement.blur();
  if (resumeGuard && e.repeat) return;
  resumeGuard = false;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      hardDrop();
      break;
  }
  updateHUD();
});

document.addEventListener('keyup', () => { resumeGuard = false; });

playBtn.addEventListener('click', startGame);
resumeBtn.addEventListener('click', togglePause);
pauseRestartBtn.addEventListener('click', startGame);
controlsBtn.addEventListener('click', toggleControls);
playAgainBtn.addEventListener('click', startGame);
mainMenuBtn.addEventListener('click', showStartScreen);
nameForm.addEventListener('submit', e => { e.preventDefault(); saveRecord(); });
document.querySelectorAll('.reset-records-btn').forEach(btn => btn.addEventListener('click', resetRecords));

for (let n = 1; n <= MAX_START_LEVEL; n++) {
  startLevelSelects.forEach(sel => sel.add(new Option(String(n), String(n))));
}
startLevelSelects.forEach(sel => sel.addEventListener('change', () => setStartLevel(Number(sel.value))));
setStartLevel(startLevel);

for (const [key, s] of Object.entries(SKINS)) skinSelect.add(new Option(s.label, key));
skinSelect.addEventListener('change', () => {
  storageSet(SKIN_KEY, skinSelect.value);
  applySkin(skinSelect.value);
  skinSelect.blur(); // evita que las flechas cambien la skin en juego
});

themeToggle.addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  storageSet(THEME_KEY, next);
  applyTheme(next);
  themeToggle.blur(); // evita que Space reactive el botón
});

applyTheme(loadTheme());
applySkin(storageGet(SKIN_KEY));
board = createBoard();
current = null;
next = null;
draw();
drawNext();
showStartScreen();
