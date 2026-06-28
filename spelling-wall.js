// === Spelling Wall Game ===
// Player must spell correctly to pass each wall.
// Wrong = stay at the same wall, try again.
// Tracks total right and wrong attempts across all walls.
// Hint system: button + auto-hint after 3 wrong attempts.

// State
let swWords = [];
let swCurrentIndex = 0;
let swCorrectAttempts = 0;
let swWrongAttempts = 0;
let swResults = [];       // per wall: { word, attempts: number, hintsUsed: number }
let swCurrentAttempts = 0; // attempts on current wall
let swCurrentHints = 0;    // hints used on current wall
let swTotalHints = 0;      // total hints used in game
let swGameActive = false;
let swSelectedWords = [];
let swAnimating = false;

// DOM
const spellingNoWords = document.getElementById('spelling-no-words');
const spellingSetup = document.getElementById('spelling-setup');
const spellingGame = document.getElementById('spelling-game');
const spellingResult = document.getElementById('spelling-result');

const spellingWallCount = document.getElementById('spelling-wall-count');
const spellingWordPicker = document.getElementById('spelling-word-picker');
const spellingStartBtn = document.getElementById('spelling-start-btn');

const spellingCurrentWall = document.getElementById('spelling-current-wall');
const spellingTotalWalls = document.getElementById('spelling-total-walls');
const spellingAttemptsEl = document.getElementById('spelling-attempts');
const spellingRunner = document.getElementById('spelling-runner');
const spellingWallsContainer = document.getElementById('spelling-walls');
const spellingHint = document.getElementById('spelling-hint');
const spellingInput = document.getElementById('spelling-input');
const spellingSubmitBtn = document.getElementById('spelling-submit-btn');
const spellingFeedback = document.getElementById('spelling-feedback');

const spellingResultTitle = document.getElementById('spelling-result-title');
const spellingStatCorrect = document.getElementById('spelling-stat-correct');
const spellingStatWrong = document.getElementById('spelling-stat-wrong');
const spellingHintBtn = document.getElementById('spelling-hint-btn');
const spellingHintDisplay = document.getElementById('spelling-hint-display');
const spellingResultDetails = document.getElementById('spelling-result-details');
const spellingPlayAgainBtn = document.getElementById('spelling-play-again-btn');

// === Helpers ===
function getWallPositions(total) {
  const positions = [];
  const start = 15;
  const end = 82;
  const step = (end - start) / total;
  for (let i = 0; i < total; i++) {
    positions.push(start + step * (i + 1));
  }
  return positions;
}

function getRunnerPosition(wallIndex, total) {
  const positions = getWallPositions(total);
  if (wallIndex >= total) return 95;
  return positions[wallIndex] - 8;
}

// === Setup Functions ===
function showSpellingSetup() {
  const available = getHistory();

  if (available.length === 0) {
    spellingNoWords.classList.remove('hidden');
    spellingSetup.classList.add('hidden');
    spellingGame.classList.add('hidden');
    spellingResult.classList.add('hidden');
    return;
  }

  spellingNoWords.classList.add('hidden');
  spellingSetup.classList.remove('hidden');
  spellingGame.classList.add('hidden');
  spellingResult.classList.add('hidden');

  swSelectedWords = [];
  renderSpellingPicker();
}

function renderSpellingPicker() {
  const available = getHistory();
  spellingWordPicker.innerHTML = '';

  available.forEach((word) => {
    const li = document.createElement('li');
    li.textContent = word;
    li.dataset.word = word;
    if (swSelectedWords.includes(word)) {
      li.classList.add('selected');
    }
    spellingWordPicker.appendChild(li);
  });
}

// === Game Functions ===
function startSpellingGame() {
  const wallCount = parseInt(spellingWallCount.value, 10);

  if (swSelectedWords.length === 0) {
    const available = getHistory();
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    swWords = shuffled.slice(0, wallCount);
  } else {
    swWords = [];
    for (let i = 0; i < wallCount; i++) {
      swWords.push(swSelectedWords[i % swSelectedWords.length]);
    }
  }

  swCurrentIndex = 0;
  swCorrectAttempts = 0;
  swWrongAttempts = 0;
  swCurrentAttempts = 0;
  swCurrentHints = 0;
  swTotalHints = 0;
  swResults = [];
  swGameActive = true;
  swAnimating = false;

  spellingSetup.classList.add('hidden');
  spellingGame.classList.remove('hidden');
  spellingResult.classList.add('hidden');

  spellingTotalWalls.textContent = swWords.length;
  updateAttemptsDisplay();
  renderAllWalls();
  showCurrentWall();
}

function renderAllWalls() {
  spellingWallsContainer.innerHTML = '';
  const positions = getWallPositions(swWords.length);

  swWords.forEach((word, i) => {
    const wall = document.createElement('div');
    wall.className = 'scene-wall-item';
    wall.dataset.index = i;
    wall.style.left = positions[i] + '%';

    for (let b = 0; b < 6; b++) {
      const brick = document.createElement('div');
      brick.className = 'brick';
      wall.appendChild(brick);
    }

    spellingWallsContainer.appendChild(wall);
  });
}

function updateWallStates() {
  const walls = spellingWallsContainer.querySelectorAll('.scene-wall-item');
  walls.forEach((wall, i) => {
    wall.classList.remove('wall-active', 'wall-cleared', 'wall-broken', 'wall-shake');
    if (i < swCurrentIndex) {
      wall.classList.add('wall-cleared');
    } else if (i === swCurrentIndex) {
      wall.classList.add('wall-active');
    }
  });
}

function showCurrentWall() {
  const word = swWords[swCurrentIndex];

  spellingCurrentWall.textContent = swCurrentIndex + 1;
  spellingFeedback.classList.add('hidden');
  spellingHintDisplay.classList.add('hidden');
  spellingInput.value = '';
  spellingInput.disabled = false;
  spellingSubmitBtn.disabled = false;
  spellingHintBtn.disabled = false;
  swAnimating = false;
  swCurrentAttempts = 0;
  swCurrentHints = 0;

  // Position runner before current wall
  const runnerPos = getRunnerPosition(swCurrentIndex, swWords.length);
  spellingRunner.style.left = runnerPos + '%';
  spellingRunner.className = 'scene-runner';
  spellingRunner.style.opacity = '1';

  updateWallStates();

  // Show hint: scrambled letters + length
  const scrambled = word.split('').sort(() => Math.random() - 0.5).join(' ');
  spellingHint.innerHTML = `
    <span class="hint-letters">${scrambled}</span>
    <span class="hint-length">(${word.length} letters)</span>
  `;

  setTimeout(() => spellingInput.focus(), 100);
}

// === Hint System ===
function revealHint() {
  if (!swGameActive || swAnimating) return;

  const word = swWords[swCurrentIndex];
  swCurrentHints++;
  swTotalHints++;

  // Progressive reveal: show more letters each time
  const revealCount = Math.min(swCurrentHints, word.length - 1);
  let hintText = '';
  for (let i = 0; i < word.length; i++) {
    if (i < revealCount) {
      hintText += word[i];
    } else {
      hintText += ' _';
    }
  }

  spellingHintDisplay.textContent = hintText;
  spellingHintDisplay.classList.remove('hidden');

  // Disable hint button if all letters revealed (leave last one hidden)
  if (revealCount >= word.length - 1) {
    spellingHintBtn.disabled = true;
  }
}

// Auto-hint after 3 wrong attempts on same wall
function checkAutoHint() {
  if (swCurrentAttempts >= 3 && swCurrentHints === 0) {
    revealHint();
  }
}

function checkSpelling() {
  if (!swGameActive || swAnimating) return;

  const word = swWords[swCurrentIndex];
  const answer = spellingInput.value.trim().toLowerCase();

  if (!answer) return;

  spellingInput.disabled = true;
  spellingSubmitBtn.disabled = true;
  swAnimating = true;
  swCurrentAttempts++;

  const correct = answer === word;
  const currentWall = spellingWallsContainer.querySelector(`[data-index="${swCurrentIndex}"]`);

  // Runner moves toward wall (disable transition during approach so jump is smooth)
  const positions = getWallPositions(swWords.length);
  const wallPos = positions[swCurrentIndex];
  spellingRunner.classList.add('running');
  spellingRunner.style.left = (wallPos - 5) + '%';

  setTimeout(() => {
    if (correct) {
      swCorrectAttempts++;
      swResults.push({ word, attempts: swCurrentAttempts, hintsUsed: swCurrentHints });

      // Mario jumps over the pipe
      spellingRunner.classList.remove('running');
      spellingRunner.style.transition = 'none'; // disable left transition during jump
      spellingRunner.classList.add('jumping');
      spellingFeedback.textContent = '⭐ Correct! Jump!';
      spellingFeedback.className = 'spelling-feedback correct';
      spellingFeedback.classList.remove('hidden');
      updateAttemptsDisplay();

      // After jump animation, update position to landed spot
      setTimeout(() => {
        // Set left to past-the-pipe position before removing jump class
        spellingRunner.classList.remove('jumping');
        spellingRunner.style.left = (wallPos + 5) + '%';
        // Re-enable transition
        setTimeout(() => {
          spellingRunner.style.transition = '';
          currentWall.classList.add('wall-cleared');
          swCurrentIndex++;
          if (swCurrentIndex >= swWords.length) {
            spellingRunner.style.left = '93%';
            spellingRunner.classList.add('celebrate');
            setTimeout(endSpellingGame, 800);
          } else {
            showCurrentWall();
          }
        }, 50);
      }, 800);

    } else {
      swWrongAttempts++;

      // Wall shakes, Mario hits and falls down
      spellingRunner.classList.remove('running');
      currentWall.classList.add('wall-shake');
      spellingRunner.classList.add('hit-wall');

      spellingFeedback.innerHTML = '🧱 Wrong! Try again!';
      spellingFeedback.className = 'spelling-feedback wrong';
      spellingFeedback.classList.remove('hidden');
      updateAttemptsDisplay();

      // Phase 2: Mario falls flat
      setTimeout(() => {
        spellingRunner.classList.remove('hit-wall');
        spellingRunner.classList.add('fallen');
      }, 500);

      // Phase 3: Mario gets back up
      setTimeout(() => {
        spellingRunner.classList.remove('fallen');
        spellingRunner.classList.add('getting-up');
      }, 1400);

      // Phase 4: Reset to starting position
      setTimeout(() => {
        currentWall.classList.remove('wall-shake');
        spellingRunner.classList.remove('getting-up');

        // Disable transition so moving back doesn't animate toward pipe
        spellingRunner.style.transition = 'none';
        const runnerPos = getRunnerPosition(swCurrentIndex, swWords.length);
        spellingRunner.style.left = runnerPos + '%';
        spellingRunner.className = 'scene-runner';

        // Re-enable transition after position is set
        setTimeout(() => {
          spellingRunner.style.transition = '';
          // Let player try again
          spellingInput.value = '';
          spellingInput.disabled = false;
          spellingSubmitBtn.disabled = false;
          swAnimating = false;
          checkAutoHint();
          setTimeout(() => spellingInput.focus(), 100);
        }, 50);
      }, 2000);
    }
  }, 400);
}

function updateAttemptsDisplay() {
  spellingAttemptsEl.textContent = swCorrectAttempts + swWrongAttempts;
}

function endSpellingGame() {
  swGameActive = false;
  spellingGame.classList.add('hidden');
  spellingResult.classList.remove('hidden');

  const total = swWords.length;

  if (swWrongAttempts === 0) {
    spellingResultTitle.textContent = '🏆 Perfect! No mistakes!';
  } else if (swWrongAttempts <= total) {
    spellingResultTitle.textContent = '🎉 Great job!';
  } else {
    spellingResultTitle.textContent = '👍 Keep practicing!';
  }

  spellingStatCorrect.textContent = swCorrectAttempts;
  spellingStatWrong.textContent = swWrongAttempts;

  // Show per-wall details
  spellingResultDetails.innerHTML = '';
  swResults.forEach((r, i) => {
    const div = document.createElement('div');
    div.className = 'result-row ' + (r.attempts === 1 ? 'correct' : 'wrong');
    let text = `Wall ${i + 1}: ${r.word} — `;
    if (r.attempts === 1) {
      text += '1st try ✅';
    } else {
      text += `${r.attempts} attempts`;
    }
    if (r.hintsUsed > 0) {
      text += ` (💡×${r.hintsUsed})`;
    }
    div.textContent = text;
    spellingResultDetails.appendChild(div);
  });
}

// === Event Listeners ===
spellingWordPicker.addEventListener('click', (e) => {
  const li = e.target.closest('li');
  if (!li) return;

  const word = li.dataset.word;
  const idx = swSelectedWords.indexOf(word);
  if (idx === -1) {
    swSelectedWords.push(word);
  } else {
    swSelectedWords.splice(idx, 1);
  }
  renderSpellingPicker();
});

spellingStartBtn.addEventListener('click', startSpellingGame);
spellingSubmitBtn.addEventListener('click', checkSpelling);
spellingHintBtn.addEventListener('click', revealHint);

spellingInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    checkSpelling();
  }
});

spellingPlayAgainBtn.addEventListener('click', showSpellingSetup);

// Called from app.js when switching to spelling tab
window.onSpellingTabOpen = function () {
  if (!swGameActive) {
    showSpellingSetup();
  }
};
