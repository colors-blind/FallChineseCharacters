const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const mouthSizeEl = document.getElementById("mouthSize");

const config = {
  playerY: canvas.height - 55,
  playerSpeed: 5,
  dropIntervalMs: 800,
  fallSpeedMin: 1.2,
  fallSpeedMax: 2.6,
  itemFontSize: 36,
  playerFontBaseSize: 64,
  minScale: 0.45,
  maxScale: 2.2,
};

const foodChars = ["饭", "面", "果", "鱼", "菜", "肉", "粥", "饼"];
const nonFoodChars = ["石", "刀", "火", "雨", "钉", "尘", "铁", "沙"];

const state = {
  playerX: canvas.width / 2,
  playerScale: 1,
  score: 0,
  items: [],
  keys: { left: false, right: false },
  lastDropTime: 0,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomInRange(min, max) {
  return min + Math.random() * (max - min);
}

function spawnItem(timestamp) {
  const isFood = Math.random() < 0.62;
  const pool = isFood ? foodChars : nonFoodChars;
  const char = pool[Math.floor(Math.random() * pool.length)];

  state.items.push({
    char,
    isFood,
    x: randomInRange(24, canvas.width - 24),
    y: -25,
    speed: randomInRange(config.fallSpeedMin, config.fallSpeedMax),
  });

  state.lastDropTime = timestamp;
}

function updatePlayerPosition() {
  if (state.keys.left) {
    state.playerX -= config.playerSpeed;
  }
  if (state.keys.right) {
    state.playerX += config.playerSpeed;
  }

  const halfWidth = 18 * state.playerScale;
  state.playerX = clamp(state.playerX, halfWidth, canvas.width - halfWidth);
}

function isCaught(item) {
  const playerCatchWidth = 26 * state.playerScale;
  const catchY = config.playerY;
  return (
    Math.abs(item.x - state.playerX) < playerCatchWidth &&
    item.y + 8 >= catchY - 12 &&
    item.y <= catchY + 16
  );
}

function onCatch(item) {
  if (item.isFood) {
    state.playerScale = clamp(state.playerScale + 0.12, config.minScale, config.maxScale);
    state.score += 1;
  } else {
    state.playerScale = clamp(state.playerScale - 0.1, config.minScale, config.maxScale);
    state.score = Math.max(0, state.score - 1);
  }
}

function updateItems() {
  const remained = [];
  for (const item of state.items) {
    item.y += item.speed;

    if (isCaught(item)) {
      onCatch(item);
      continue;
    }

    if (item.y <= canvas.height + 30) {
      remained.push(item);
    }
  }
  state.items = remained;
}

function renderBackground() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fafdff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#edf2ff";
  for (let y = 20; y < canvas.height; y += 30) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function renderItems() {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${config.itemFontSize}px sans-serif`;

  for (const item of state.items) {
    ctx.fillStyle = item.isFood ? "#21a56a" : "#d9534f";
    ctx.fillText(item.char, item.x, item.y);
  }
}

function renderPlayer() {
  const fontSize = config.playerFontBaseSize * state.playerScale;
  ctx.font = `${fontSize}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#2d3f83";
  ctx.fillText("口", state.playerX, config.playerY);
}

function updateHud() {
  scoreEl.textContent = String(state.score);
  mouthSizeEl.textContent = `${Math.round(state.playerScale * 100)}%`;
}

function gameLoop(timestamp) {
  if (!state.lastDropTime) {
    state.lastDropTime = timestamp;
  }

  if (timestamp - state.lastDropTime > config.dropIntervalMs) {
    spawnItem(timestamp);
  }

  updatePlayerPosition();
  updateItems();

  renderBackground();
  renderItems();
  renderPlayer();
  updateHud();

  requestAnimationFrame(gameLoop);
}

function onKeyDown(event) {
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
    state.keys.left = true;
  }
  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
    state.keys.right = true;
  }
}

function onKeyUp(event) {
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
    state.keys.left = false;
  }
  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
    state.keys.right = false;
  }
}

function bindPointerControl() {
  const moveByClientX = (clientX) => {
    const rect = canvas.getBoundingClientRect();
    const ratio = canvas.width / rect.width;
    state.playerX = clamp((clientX - rect.left) * ratio, 12, canvas.width - 12);
  };

  canvas.addEventListener("pointerdown", (e) => moveByClientX(e.clientX));
  canvas.addEventListener("pointermove", (e) => {
    if (e.buttons > 0) {
      moveByClientX(e.clientX);
    }
  });
}

window.addEventListener("keydown", onKeyDown);
window.addEventListener("keyup", onKeyUp);
bindPointerControl();
requestAnimationFrame(gameLoop);
