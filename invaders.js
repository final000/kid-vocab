// === Vocab Invaders ===
// Space Invaders style: aliens descend, player completes words to fire.

// Config
const INV_ROWS = 3;
const INV_COLS = 6;
const INV_DROP_RATIO = 0.03;
const INV_LIVES = 3;

const INV_DIFFICULTY = {
  easy:   { speedMult: 1.0, dropMult: 0.7, accel: 0.5 },
  normal: { speedMult: 2.0, dropMult: 1.2, accel: 1.0 },
  hard:   { speedMult: 3.5, dropMult: 1.8, accel: 2.0 },
};

let invDifficulty = 'normal';

// State
let invWords = [];
let invSelectedWords = [];
let invAliens = [];
let invScore = 0;
let invLives = 0;
let invGameActive = false;
let invAnimFrame = null;
let invDirection = 1; // 1 = right, -1 = left
let invSpeed = 0.3;
let invCurrentWord = '';
let invMissingIndices = [];
let invBullet = null; // { x, y }
let invWordsUsed = [];
let invCorrectCount = 0;
let invWrongCount = 0;

// DOM
const invNoWords = document.getElementById('invaders-no-words');
const invSetup = document.getElementById('invaders-setup');
const invGame = document.getElementById('invaders-game');
const invGameover = document.getElementById('invaders-gameover');
const invWordPicker = document.getElementById('invaders-word-picker');
const invStartBtn = document.getElementById('invaders-start-btn');
const invCanvas = document.getElementById('invaders-canvas');
const invCtx = invCanvas.getContext('2d');
const invScoreEl = document.getElementById('invaders-score');
const invLivesEl = document.getElementById('invaders-lives');
const invGunWord = document.getElementById('invaders-gun-word');
const invInput = document.getElementById('invaders-input');
const invFireBtn = document.getElementById('invaders-fire-btn');
const invResultTitle = document.getElementById('invaders-result-title');
const invFinalScore = document.getElementById('invaders-final-score');
const invResultDetails = document.getElementById('invaders-result-details');
const invPlayAgainBtn = document.getElementById('invaders-play-again-btn');

// === Setup ===
function showInvadersSetup() {
  const available = getHistory();

  if (available.length === 0) {
    invNoWords.classList.remove('hidden');
    invSetup.classList.add('hidden');
    invGame.classList.add('hidden');
    invGameover.classList.add('hidden');
    return;
  }

  invNoWords.classList.add('hidden');
  invSetup.classList.remove('hidden');
  invGame.classList.add('hidden');
  invGameover.classList.add('hidden');

  invSelectedWords = [];
  renderInvadersPicker();
}

function renderInvadersPicker() {
  const available = getHistory();
  invWordPicker.innerHTML = '';

  available.forEach((word) => {
    const li = document.createElement('li');
    li.textContent = word;
    li.dataset.word = word;
    if (invSelectedWords.includes(word)) {
      li.classList.add('selected');
    }
    invWordPicker.appendChild(li);
  });
}

// === Game Init ===
function startInvadersGame() {
  if (invSelectedWords.length === 0) {
    const available = getHistory();
    invWords = [...available];
  } else {
    invWords = [...invSelectedWords];
  }

  invScore = 0;
  invLives = INV_LIVES;
  invDirection = 1;
  const diff = INV_DIFFICULTY[invDifficulty];
  invSpeed = invCanvas.width * 0.0004 * diff.speedMult;
  invBullet = null;
  invGameActive = true;
  invWordsUsed = [];
  invCorrectCount = 0;
  invWrongCount = 0;

  invSetup.classList.add('hidden');
  invGame.classList.remove('hidden');
  invGameover.classList.add('hidden');

  resizeCanvas();
  createAliens();
  loadNewWord();
  updateHUD();
  invInput.focus();
  gameLoop();
}

function resizeCanvas() {
  const container = invCanvas.parentElement;
  const w = container.clientWidth - 6;
  invCanvas.width = w;
  invCanvas.height = Math.min(Math.floor(w * 0.55), 400);
}

// Only resize before game starts, not during
window.addEventListener('resize', () => {
  if (!invGameActive) {
    resizeCanvas();
  }
});

function createAliens() {
  invAliens = [];
  const cellW = invCanvas.width / (INV_COLS + 1);
  const cellH = Math.floor(invCanvas.height / 8);

  for (let row = 0; row < INV_ROWS; row++) {
    for (let col = 0; col < INV_COLS; col++) {
      invAliens.push({
        x: cellW * (col + 0.5),
        y: 20 + row * cellH,
        w: 32,
        h: 24,
        alive: true,
        row: row,
      });
    }
  }
}

// === Word Logic ===
function loadNewWord() {
  // Pick a random word from the pool
  const word = invWords[Math.floor(Math.random() * invWords.length)];
  invCurrentWord = word;

  // Remove some letters (30-60% of them)
  const letterCount = word.length;
  const removeCount = Math.max(1, Math.floor(letterCount * 0.4 + Math.random() * 0.2 * letterCount));

  // Pick random indices to hide
  const indices = [];
  for (let i = 0; i < letterCount; i++) indices.push(i);
  // Shuffle
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  invMissingIndices = indices.slice(0, removeCount).sort((a, b) => a - b);

  renderGunWord();
  // Don't re-focus here — let the caller handle it to avoid iOS keyboard flicker
}

function renderGunWord() {
  invGunWord.innerHTML = '';
  const inputVal = invInput ? invInput.value.toLowerCase() : '';
  let fillIndex = 0;

  for (let i = 0; i < invCurrentWord.length; i++) {
    const span = document.createElement('span');
    span.className = 'gun-letter';
    if (invMissingIndices.includes(i)) {
      if (fillIndex < inputVal.length) {
        span.textContent = inputVal[fillIndex];
        span.classList.add('filled');
        fillIndex++;
      } else {
        span.textContent = '_';
        span.classList.add('missing');
      }
    } else {
      span.textContent = invCurrentWord[i];
    }
    invGunWord.appendChild(span);
  }
}

function checkAnswer() {
  if (!invGameActive) return;

  const answer = invInput.value.trim().toLowerCase();
  if (!answer) return;

  // Build the expected missing letters
  const expected = invMissingIndices.map((i) => invCurrentWord[i]).join('');

  if (answer === expected) {
    // Correct! Fire bullet
    invCorrectCount++;
    invScore += 10;
    fireBullet();
    invInput.value = '';
    renderGunWord();
    invWordsUsed.push({ word: invCurrentWord, correct: true });
    // Load next word after short delay
    setTimeout(() => {
      if (invGameActive) {
        loadNewWord();
        invInput.focus();
      }
    }, 600);
  } else {
    // Wrong
    invWrongCount++;
    invInput.value = '';
    renderGunWord();
    invInput.classList.add('shake');
    setTimeout(() => invInput.classList.remove('shake'), 400);
  }

  // Always keep focus on input (prevents iOS keyboard dismiss)
  invInput.focus();
  updateHUD();
}

function fireBullet() {
  // Find the nearest (lowest) alive alien and target it
  let target = null;
  let maxY = -1;
  invAliens.forEach((alien) => {
    if (alien.alive && alien.y > maxY) {
      maxY = alien.y;
      target = alien;
    }
  });

  if (target) {
    invBullet = {
      x: invCanvas.width / 2,
      y: invCanvas.height - 40,
      targetX: target.x + target.w / 2,
      targetY: target.y + target.h / 2,
      target: target,
    };
  }
}

// === Game Loop ===
function gameLoop() {
  if (!invGameActive) return;

  update();
  draw();
  invAnimFrame = requestAnimationFrame(gameLoop);
}

function update() {
  // Move aliens
  let hitEdge = false;
  invAliens.forEach((alien) => {
    if (!alien.alive) return;
    alien.x += invSpeed * invDirection;
    if (alien.x + alien.w > invCanvas.width - 5 || alien.x < 5) {
      hitEdge = true;
    }
  });

  if (hitEdge) {
    invDirection *= -1;
    const diff = INV_DIFFICULTY[invDifficulty];
    invAliens.forEach((alien) => {
      if (alien.alive) alien.y += invCanvas.height * INV_DROP_RATIO * diff.dropMult;
    });
    invSpeed += invCanvas.width * 0.00005 * diff.accel;
  }

  // Check if aliens reached bottom
  invAliens.forEach((alien) => {
    if (alien.alive && alien.y + alien.h > invCanvas.height - 50) {
      alien.alive = false;
      invLives--;
      updateHUD();
      if (invLives <= 0) {
        endInvadersGame(false);
      }
    }
  });

  // Check if all aliens dead → spawn new wave
  if (invAliens.every((a) => !a.alive)) {
    const diff = INV_DIFFICULTY[invDifficulty];
    invSpeed += invCanvas.width * 0.0001 * diff.accel;
    createAliens();
  }

  // Move bullet toward target
  if (invBullet) {
    const dx = invBullet.targetX - invBullet.x;
    const dy = invBullet.targetY - invBullet.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 10) {
      // Hit the target
      invBullet.target.alive = false;
      invBullet = null;
    } else {
      const speed = 10;
      invBullet.x += (dx / dist) * speed;
      invBullet.y += (dy / dist) * speed;
    }

    // Bullet off screen (safety)
    if (invBullet && invBullet.y < 0) {
      invBullet = null;
    }
  }
}

function draw() {
  invCtx.clearRect(0, 0, invCanvas.width, invCanvas.height);

  // Background
  invCtx.fillStyle = '#0a0a2e';
  invCtx.fillRect(0, 0, invCanvas.width, invCanvas.height);

  // Stars
  invCtx.fillStyle = '#ffffff88';
  for (let i = 0; i < 40; i++) {
    const sx = (i * 97 + 13) % invCanvas.width;
    const sy = (i * 53 + 7) % (invCanvas.height - 60);
    invCtx.fillRect(sx, sy, 2, 2);
  }

  // Draw aliens with glow background
  invAliens.forEach((alien) => {
    if (!alien.alive) return;

    // Glow circle behind alien
    const cx = alien.x + alien.w / 2;
    const cy = alien.y + alien.h / 2;
    invCtx.beginPath();
    invCtx.arc(cx, cy + 4, 16, 0, Math.PI * 2);
    const colors = ['rgba(180,0,255,0.3)', 'rgba(0,255,100,0.3)', 'rgba(0,150,255,0.3)'];
    invCtx.fillStyle = colors[alien.row % 3];
    invCtx.fill();

    // Alien emoji - bigger
    invCtx.font = `${alien.h + 6}px monospace`;
    invCtx.textAlign = 'center';
    const aliens = ['👾', '👽', '🛸'];
    invCtx.fillText(aliens[alien.row % 3], cx, alien.y + alien.h + 3);
  });

  // Draw bullet
  if (invBullet) {
    invCtx.fillStyle = '#ffcc00';
    invCtx.fillRect(invBullet.x - 2, invBullet.y, 4, 12);
    // Glow
    invCtx.fillStyle = '#ffcc0066';
    invCtx.fillRect(invBullet.x - 4, invBullet.y + 2, 8, 8);
  }

  // Draw ship
  invCtx.font = '28px monospace';
  invCtx.textAlign = 'center';
  invCtx.fillText('🚀', invCanvas.width / 2, invCanvas.height - 15);
}

function updateHUD() {
  invScoreEl.textContent = invScore;
  invLivesEl.textContent = '❤️'.repeat(Math.max(0, invLives));
}

function endInvadersGame(won) {
  invGameActive = false;
  if (invAnimFrame) cancelAnimationFrame(invAnimFrame);

  invGame.classList.add('hidden');
  invGameover.classList.remove('hidden');

  if (won) {
    invResultTitle.textContent = '🏆 You cleared all the aliens!';
  } else {
    invResultTitle.textContent = '💀 Game Over! Aliens invaded!';
  }

  invFinalScore.textContent = invScore;

  invResultDetails.innerHTML = '';
  const div1 = document.createElement('div');
  div1.className = 'result-row correct';
  div1.textContent = `✅ Words completed: ${invCorrectCount}`;
  invResultDetails.appendChild(div1);

  const div2 = document.createElement('div');
  div2.className = 'result-row wrong';
  div2.textContent = `❌ Wrong attempts: ${invWrongCount}`;
  invResultDetails.appendChild(div2);
}

// === Event Listeners ===
invWordPicker.addEventListener('click', (e) => {
  const li = e.target.closest('li');
  if (!li) return;
  const word = li.dataset.word;
  const idx = invSelectedWords.indexOf(word);
  if (idx === -1) {
    invSelectedWords.push(word);
  } else {
    invSelectedWords.splice(idx, 1);
  }
  renderInvadersPicker();
});

invStartBtn.addEventListener('click', startInvadersGame);

// Difficulty buttons
const diffBtns = document.querySelectorAll('#invaders-setup .difficulty-options .mode-btn');
diffBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    diffBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    invDifficulty = btn.dataset.speed;
  });
});
invFireBtn.addEventListener('mousedown', (e) => {
  e.preventDefault(); // prevent focus steal from input
});
invFireBtn.addEventListener('click', () => {
  checkAnswer();
  invInput.focus();
});

invInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    checkAnswer();
  }
});

invInput.addEventListener('input', () => {
  renderGunWord();
});

invPlayAgainBtn.addEventListener('click', showInvadersSetup);

// Tab hook
window.onInvadersTabOpen = function () {
  if (!invGameActive) {
    showInvadersSetup();
  }
};
