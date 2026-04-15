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

/**
 * 检测下落物体是否被口字接住
 * 
 * 碰撞检测原理：
 * 1. 水平方向：物体中心与口字中心的距离小于口字宽度的一半
 * 2. 垂直方向：物体底部接触到口字顶部时触发碰撞
 * 
 * 坐标系统说明：
 * - 所有文字使用 textBaseline = "middle"，所以 y 坐标是文字中心点
 * - 物体字体大小：config.itemFontSize (36px)
 * - 口字字体大小：config.playerFontBaseSize * state.playerScale (64px * 缩放比例)
 * 
 * @param {Object} item - 下落物体对象，包含 x, y, char, isFood, speed 等属性
 * @returns {boolean} - 是否发生碰撞
 */
function isCaught(item) {
  // ========== 水平方向碰撞检测 ==========
  // 口字的实际宽度：基于字体大小计算，约为字体大小的 0.8 倍
  // 乘以缩放比例 state.playerScale 得到当前实际宽度
  const playerActualWidth = config.playerFontBaseSize * state.playerScale * 0.8;
  
  // 碰撞判定宽度：口字宽度的一半
  // 当物体中心与口字中心的距离小于此值时，认为水平方向发生碰撞
  const playerCatchWidth = playerActualWidth / 2;
  
  // 水平方向碰撞条件：物体中心与口字中心的距离小于碰撞判定宽度
  const horizontalCollision = Math.abs(item.x - state.playerX) < playerCatchWidth;
  
  // ========== 垂直方向碰撞检测 ==========
  // 物体的实际高度：约为字体大小的 0.8 倍
  // 物体底部 = 物体中心 + 物体高度的一半
  const itemHeight = config.itemFontSize * 0.8;
  const itemBottom = item.y + itemHeight / 2;
  
  // 口字的实际高度：基于字体大小计算，约为字体大小的 0.8 倍
  // 口字顶部 = 口字中心 - 口字高度的一半
  const playerHeight = config.playerFontBaseSize * state.playerScale * 0.8;
  const playerTop = config.playerY - playerHeight / 2;
  
  // 垂直方向碰撞条件：物体底部接触到或超过口字顶部
  // 这样物体一碰到口字顶部就会立即消失，而不是继续下落
  const verticalCollision = itemBottom >= playerTop;
  
  // ========== 综合碰撞判定 ==========
  // 只有水平和垂直方向都发生碰撞时，才认为物体被接住
  return horizontalCollision && verticalCollision;
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
    ctx.fillStyle = "#000000";
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
