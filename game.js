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
  minScale: 0.5,
  maxScale: 2.5,
};

const foodChars = [
  "饭", "面", "果", "鱼", "菜", "肉", "粥", "饼",
  "米", "蛋", "奶", "糖", "茶", "酒", "水", "汤",
  "鸡", "鸭", "猪", "牛", "羊", "虾", "蟹", "贝",
  "瓜", "桃", "李", "杏", "枣", "梨", "橙", "桔",
  "茄", "豆", "葱", "姜", "蒜", "椒", "笋", "菇",
  "包", "饺", "糕", "点", "团", "圆", "条", "丝"
];

const nonFoodChars = [
  "石", "刀", "火", "雨", "钉", "尘", "铁", "沙",
  "木", "土", "金", "银", "铜", "锡", "铅", "钢",
  "风", "雷", "电", "霜", "雪", "冰", "雾", "云",
  "书", "笔", "纸", "墨", "尺", "刀", "剪", "针",
  "车", "船", "机", "枪", "炮", "弹", "弓", "箭",
  "山", "河", "海", "湖", "江", "洋", "泉", "溪"
];

const state = {
  playerX: canvas.width / 2,
  playerScale: 1,
  score: 0,
  items: [],
  keys: { left: false, right: false },
  lastDropTime: 0,
  isGameOver: false,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomInRange(min, max) {
  return min + Math.random() * (max - min);
}

/**
 * 计算口字的实际半宽
 * 用于边界控制和碰撞检测，确保两者使用一致的宽度计算
 * 
 * 计算逻辑：
 * - 基础字体大小：config.playerFontBaseSize (64px)
 * - 宽度系数：0.8（汉字实际宽度约为字体大小的80%）
 * - 半宽 = 字体大小 × 缩放比例 × 宽度系数 ÷ 2
 * 
 * @returns {number} 口字的半宽（像素）
 */
function getPlayerHalfWidth() {
  return (config.playerFontBaseSize * state.playerScale * 0.8) / 2;
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

  const halfWidth = getPlayerHalfWidth();
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
  // 使用统一的 getPlayerHalfWidth() 函数计算口字半宽
  // 确保与边界控制使用相同的宽度计算
  const playerHalfWidth = getPlayerHalfWidth();
  
  // 水平方向碰撞条件：物体中心与口字中心的距离小于口字半宽
  const horizontalCollision = Math.abs(item.x - state.playerX) < playerHalfWidth;
  
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

/**
 * 检测游戏结束条件
 * 当口字缩小到最小值且分数小于等于0时，游戏结束
 * 
 * 结束条件：
 * 1. 口字缩放比例等于最小值（50%）
 * 2. 当前分数小于等于0
 * 
 * @returns {boolean} 是否满足游戏结束条件
 */
function checkGameOver() {
  return state.playerScale <= config.minScale && state.score <= 0;
}

/**
 * 显示游戏结束模态框
 * 1. 暂停游戏循环
 * 2. 显示最终得分
 * 3. 显示模态框
 */
function showGameOverModal() {
  state.isGameOver = true;

  const modal = document.getElementById("gameOverModal");
  const finalScoreEl = document.getElementById("finalScore");

  finalScoreEl.textContent = String(state.score);
  modal.classList.remove("hidden");
}

/**
 * 隐藏游戏结束模态框
 */
function hideGameOverModal() {
  const modal = document.getElementById("gameOverModal");
  modal.classList.add("hidden");
}

/**
 * 重新开始游戏
 * 1. 隐藏模态框
 * 2. 重置所有游戏状态
 * 3. 重新启动游戏循环
 */
function restartGame() {
  hideGameOverModal();

  state.playerX = canvas.width / 2;
  state.playerScale = 1;
  state.score = 0;
  state.items = [];
  state.keys = { left: false, right: false };
  state.lastDropTime = 0;
  state.isGameOver = false;

  updateHud();
  requestAnimationFrame(gameLoop);
}

function gameLoop(timestamp) {
  if (state.isGameOver) {
    return;
  }

  if (!state.lastDropTime) {
    state.lastDropTime = timestamp;
  }

  if (timestamp - state.lastDropTime > config.dropIntervalMs) {
    spawnItem(timestamp);
  }

  updatePlayerPosition();
  updateItems();

  if (checkGameOver()) {
    showGameOverModal();
    return;
  }

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
    const halfWidth = getPlayerHalfWidth();
    state.playerX = clamp((clientX - rect.left) * ratio, halfWidth, canvas.width - halfWidth);
  };

  canvas.addEventListener("pointerdown", (e) => moveByClientX(e.clientX));
  canvas.addEventListener("pointermove", (e) => {
    if (e.buttons > 0) {
      moveByClientX(e.clientX);
    }
  });
}

/**
 * 全屏控制功能
 * 支持点击按钮切换全屏模式，全屏时游戏区域占满整个屏幕
 */
function bindFullscreenControl() {
  const fullscreenBtn = document.getElementById("fullscreenBtn");
  const gameShell = document.querySelector(".game-shell");

  /**
   * 检查当前是否处于全屏模式
   * 兼容不同浏览器的全屏API
   */
  function isFullscreen() {
    return (
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );
  }

  /**
   * 更新按钮文字
   * 根据当前全屏状态显示"全屏"或"退出全屏"
   */
  function updateButtonText() {
    if (isFullscreen()) {
      fullscreenBtn.textContent = "退出全屏";
    } else {
      fullscreenBtn.textContent = "全屏";
    }
  }

  /**
   * 进入全屏模式
   * 兼容不同浏览器的全屏API
   */
  function enterFullscreen() {
    if (gameShell.requestFullscreen) {
      gameShell.requestFullscreen();
    } else if (gameShell.webkitRequestFullscreen) {
      gameShell.webkitRequestFullscreen();
    } else if (gameShell.mozRequestFullScreen) {
      gameShell.mozRequestFullScreen();
    } else if (gameShell.msRequestFullscreen) {
      gameShell.msRequestFullscreen();
    }
  }

  /**
   * 退出全屏模式
   * 兼容不同浏览器的全屏API
   */
  function exitFullscreen() {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  }

  /**
   * 切换全屏状态
   */
  function toggleFullscreen() {
    if (isFullscreen()) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  }

  // 绑定按钮点击事件
  fullscreenBtn.addEventListener("click", toggleFullscreen);

  // 监听全屏状态变化，更新按钮文字
  document.addEventListener("fullscreenchange", updateButtonText);
  document.addEventListener("webkitfullscreenchange", updateButtonText);
  document.addEventListener("mozfullscreenchange", updateButtonText);
  document.addEventListener("MSFullscreenChange", updateButtonText);

  // 初始化按钮文字
  updateButtonText();
}

/**
 * 绑定重新开始按钮的点击事件
 */
function bindRestartControl() {
  const restartBtn = document.getElementById("restartBtn");
  restartBtn.addEventListener("click", restartGame);
}

window.addEventListener("keydown", onKeyDown);
window.addEventListener("keyup", onKeyUp);
bindPointerControl();
bindFullscreenControl();
bindRestartControl();
requestAnimationFrame(gameLoop);
