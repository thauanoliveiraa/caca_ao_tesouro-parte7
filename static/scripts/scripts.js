
// --------- Setup básico ----------
const wrapper = document.getElementById('gameWrapper');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const restartBtn = document.getElementById('restartBtn');

// Alta definição em telas com DPR > 1 (celulares)
let W = 0, H = 0, dpr = Math.max(1, window.devicePixelRatio || 1);
function resizeCanvas() {
  const cssW = wrapper.clientWidth;
  const cssH = wrapper.clientHeight;
  dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);
  // Desenha em "pixels CSS" mesmo com DPR alto
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  W = cssW; H = cssH;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// --------- Recursos (imagem do pássaro) ----------
const birdImg = new Image();
birdImg.src = 'ela.jpg'; // 👉 troque pelo caminho da sua imagem .png
  
// --------- Estado do jogo ----------
let bird, pipes, score, gameOver, lastTime, spawnTimer;
const GRAVITY = 2000;       // px/s²
const JUMP_VY = -520;       // px/s (impulso)
const PIPE_SPEED = 180;     // px/s
const PIPE_INTERVAL = 1.4;  // s entre canos
const PIPE_WIDTH = 60;      // px
const GAP_MIN = 140;        // px
const GAP_MAX = 180;        // px
const MARGIN_TOP = 30;      // segurança topo
const MARGIN_BOTTOM = 30;   // segurança base

function resetGame() {
  score = 0;
  gameOver = false;
  spawnTimer = 0;
  lastTime = performance.now();

  const birdSize = Math.max(28, Math.min(44, Math.floor(W * 0.08)));
  bird = {
    x: Math.max(40, Math.floor(W * 0.12)),
    y: H * 0.45,
    w: birdSize,
    h: birdSize,
    vy: 0
  };

  pipes = [];
  scoreEl.textContent = '0';
  restartBtn.style.display = 'none';
}

// --------- Lógica dos canos ----------
function spawnPipe() {
  const gap = Math.floor(GAP_MIN + Math.random() * (GAP_MAX - GAP_MIN));
  const maxTop = H - MARGIN_BOTTOM - gap - MARGIN_TOP;
  const topHeight = Math.floor(MARGIN_TOP + Math.random() * Math.max(1, maxTop));
  const bottomHeight = H - topHeight - gap;
  pipes.push({
    x: W,
    w: PIPE_WIDTH,
    top: topHeight,
    bottom: bottomHeight,
    passed: false
  });
}

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// --------- Controles ----------
function jump() {
  if (gameOver) return;
  bird.vy = JUMP_VY;
}

// pointerdown cobre mouse e toque
wrapper.addEventListener('pointerdown', jump);
// Teclado: Espaço/Seta Cima/W
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.key.toLowerCase() === 'w') {
    e.preventDefault(); // evita scroll com espaço
    jump();
  }
});

restartBtn.addEventListener('click', () => {
  resetGame();
  requestAnimationFrame(gameLoop);
});

// --------- Loop principal ----------
function update(dt) {
  // Física do pássaro
  bird.vy += GRAVITY * dt;
  bird.y += bird.vy * dt;

  // Colisão com chão/teto
  if (bird.y + bird.h >= H - 1) {
    bird.y = H - bird.h - 1;
    gameOver = true;
  }
  if (bird.y <= 0) {
    bird.y = 0;
    bird.vy = 0;
  }

  // Canos
  spawnTimer += dt;
  if (spawnTimer >= PIPE_INTERVAL) {
    spawnPipe();
    spawnTimer = 0;
  }

  for (const p of pipes) {
    p.x -= PIPE_SPEED * dt;

    // Colisão com as duas partes do cano
    const hitTop = rectsOverlap(bird.x, bird.y, bird.w, bird.h, p.x, 0, p.w, p.top);
    const hitBottom = rectsOverlap(bird.x, bird.y, bird.w, bird.h, p.x, H - p.bottom, p.w, p.bottom);
    if (hitTop || hitBottom) gameOver = true;

    // Pontuação quando passar pelo cano
    if (!p.passed && p.x + p.w < bird.x) {
      p.passed = true;
      score++;
      scoreEl.textContent = String(score);
    }
  }

  // Remove canos que saíram da tela
  pipes = pipes.filter(p => p.x + p.w > 0);
}

function draw() {
  // Fundo
  ctx.clearRect(0, 0, W, H);

  // Piso "fake" (opcional)
  // ctx.fillStyle = '#5da75d';
  // ctx.fillRect(0, H - 10, W, 10);

  // Canos
  ctx.fillStyle = '#2ecc71';
  for (const p of pipes) {
    // cano de cima
    ctx.fillRect(p.x, 0, p.w, p.top);
    // cano de baixo
    ctx.fillRect(p.x, H - p.bottom, p.w, p.bottom);
  }

  // Pássaro
  const imgOk = birdImg && birdImg.complete && birdImg.naturalWidth > 0;
  if (imgOk) {
    ctx.drawImage(birdImg, bird.x, bird.y, bird.w, bird.h);
  } else {
    // Fallback visual se a imagem não carregou
    ctx.fillStyle = '#ffdc00';
    ctx.beginPath();
    ctx.ellipse(bird.x + bird.w / 2, bird.y + bird.h / 2, bird.w / 2, bird.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.fillRect(bird.x + bird.w * 0.2, bird.y + bird.h * 0.35, bird.w * 0.15, bird.h * 0.15); // olho
  }

  if (gameOver) {
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Você perdeu momô, tenta de novo!', W / 2, H / 2 - 10);
    ctx.font = 'bold 20px Arial';
    ctx.fillText('Pontuação: ' + score, W / 2, H / 2 + 22);
  }
}

function gameLoop(t) {
  const dt = Math.min(0.033, (t - lastTime) / 1000); // máx ~30ms para estabilidade
  lastTime = t;

  if (!gameOver) {
    update(dt);
    draw();
    requestAnimationFrame(gameLoop);
  } else {
    draw();
    restartBtn.style.display = 'block';
  }
}

// Inicia somente após (tentar) carregar a imagem (não trava se falhar)
function start() {
  resetGame();
  requestAnimationFrame((ts) => {
    lastTime = ts;
    requestAnimationFrame(gameLoop);
  });
}

// Garante início mesmo se a imagem falhar
birdImg.addEventListener('load', start);
birdImg.addEventListener('error', start);
