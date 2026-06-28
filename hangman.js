// === Hangman Game ===
// Shares vocabulary from localStorage (HISTORY_KEY defined in app.js)

const MAX_WRONG = 6;
const BODY_PARTS = [
  'hm-head',
  'hm-body',
  'hm-left-arm',
  'hm-right-arm',
  'hm-left-leg',
  'hm-right-leg',
];

// State
let hangmanWord = '';
let guessedLetters = new Set();
let wrongCount = 0;
let wins = 0;
let losses = 0;
let gameActive = false;
let usedWords = [];
let currentMode = 'random'; // 'random' or 'choose'
let chosenWord = '';

// DOM
const hangmanNoWords = document.getElementById('hangman-no-words');
const hangmanModeSelector = document.getElementById('hangman-mode-selector');
const hangmanGame = document.getElementById('hangman-game');
const hangmanWordEl = document.getElementById('hangman-word');
const hangmanWrongEl = document.getElementById('hangman-wrong');
const hangmanKeyboard = document.getElementById('hangman-keyboard');
const hangmanResult = document.getElementById('hangman-result');
const hangmanResultText = document.getElementById('hangman-result-text');
const hangmanNextBtn = document.getElementById('hangman-next-btn');
const hangmanWinsEl = document.getElementById('hangman-wins');
const hangmanLossesEl = document.getElementById('hangman-losses');
const hangmanResetScore = document.getElementById('hangman-reset-score');
const hangmanStartBtn = document.getElementById('hangman-start-btn');
const hangmanWordPicker = document.getElementById('hangman-word-picker');
const hangmanPickList = document.getElementById('hangman-pick-list');
const modeBtns = document.querySelectorAll('.mode-btn');

// === Functions ===
function getAvailableWords() {
  return getHistory(); // from app.js
}

function pickWord() {
  const available = getAvailableWords();
  let pool = available.filter((w) => !usedWords.includes(w));
  if (pool.length === 0) {
    usedWords = [];
    pool = available;
  }
  const word = pool[Math.floor(Math.random() * pool.length)];
  usedWords.push(word);
  return word;
}

function showModeSelector() {
  const available = getAvailableWords();

  if (available.length === 0) {
    hangmanNoWords.classList.remove('hidden');
    hangmanModeSelector.classList.add('hidden');
    hangmanGame.classList.add('hidden');
    return;
  }

  hangmanNoWords.classList.add('hidden');
  hangmanGame.classList.add('hidden');
  hangmanModeSelector.classList.remove('hidden');

  // Reset chosen word
  chosenWord = '';
  updatePickerVisibility();
  renderPickList();
}

function updatePickerVisibility() {
  if (currentMode === 'choose') {
    hangmanWordPicker.classList.remove('hidden');
  } else {
    hangmanWordPicker.classList.add('hidden');
  }
}

function renderPickList() {
  const available = getAvailableWords();
  hangmanPickList.innerHTML = '';

  available.forEach((word) => {
    const li = document.createElement('li');
    li.textContent = word;
    li.dataset.word = word;
    if (word === chosenWord) {
      li.classList.add('selected');
    }
    hangmanPickList.appendChild(li);
  });
}

function startGame(word) {
  const targetWord = word || (currentMode === 'choose' ? chosenWord : pickWord());

  if (!targetWord) return;

  hangmanModeSelector.classList.add('hidden');
  hangmanGame.classList.remove('hidden');

  hangmanWord = targetWord;
  guessedLetters = new Set();
  wrongCount = 0;
  gameActive = true;

  hangmanResult.classList.add('hidden');
  hangmanResult.classList.remove('win', 'lose');

  renderHangmanWord();
  renderKeyboard();
  renderBody();
  renderWrong();
}

function renderHangmanWord() {
  hangmanWordEl.innerHTML = '';
  for (const ch of hangmanWord) {
    const slot = document.createElement('span');
    slot.className = 'letter-slot';

    if (ch === ' ') {
      slot.classList.add('space');
    } else if (guessedLetters.has(ch)) {
      slot.textContent = ch;
      slot.classList.add('revealed');
    } else {
      slot.textContent = '';
    }
    hangmanWordEl.appendChild(slot);
  }
}

function renderKeyboard() {
  hangmanKeyboard.innerHTML = '';
  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(97 + i);
    const btn = document.createElement('button');
    btn.className = 'key-btn';
    btn.textContent = letter;
    btn.dataset.letter = letter;

    if (guessedLetters.has(letter)) {
      btn.disabled = true;
      if (hangmanWord.includes(letter)) {
        btn.classList.add('correct');
      } else {
        btn.classList.add('wrong');
      }
    }

    hangmanKeyboard.appendChild(btn);
  }
}

function renderBody() {
  BODY_PARTS.forEach((id, index) => {
    const el = document.getElementById(id);
    if (index < wrongCount) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  });
}

function renderWrong() {
  const wrongLetters = [...guessedLetters].filter((l) => !hangmanWord.includes(l));
  hangmanWrongEl.textContent = wrongLetters.length
    ? `Wrong: ${wrongLetters.map((l) => l.toUpperCase()).join(', ')}`
    : '';
}

function checkWin() {
  const wordLetters = new Set(hangmanWord.replace(/ /g, '').split(''));
  return [...wordLetters].every((l) => guessedLetters.has(l));
}

function guessLetter(letter) {
  if (!gameActive || guessedLetters.has(letter)) return;

  guessedLetters.add(letter);

  if (!hangmanWord.includes(letter)) {
    wrongCount++;
  }

  renderHangmanWord();
  renderKeyboard();
  renderBody();
  renderWrong();

  if (checkWin()) {
    endGame(true);
  } else if (wrongCount >= MAX_WRONG) {
    endGame(false);
  }
}

function endGame(won) {
  gameActive = false;

  if (won) {
    wins++;
    hangmanResultText.textContent = `🎉 You got it! The word was "${hangmanWord}"`;
    hangmanResult.classList.add('win');
  } else {
    losses++;
    hangmanResultText.textContent = `😢 The word was "${hangmanWord}"`;
    hangmanResult.classList.add('lose');
    const slots = hangmanWordEl.querySelectorAll('.letter-slot');
    const wordChars = hangmanWord.split('');
    slots.forEach((slot, i) => {
      if (wordChars[i] !== ' ') {
        slot.textContent = wordChars[i];
        if (!slot.classList.contains('revealed')) {
          slot.style.color = '#c0392b';
        }
      }
    });
  }

  hangmanResult.classList.remove('hidden');
  updateScore();
}

function updateScore() {
  hangmanWinsEl.textContent = wins;
  hangmanLossesEl.textContent = losses;
}

// === Event Listeners ===

// Mode toggle
modeBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    modeBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentMode = btn.dataset.mode;
    chosenWord = '';
    updatePickerVisibility();
    renderPickList();
  });
});

// Word picker click
hangmanPickList.addEventListener('click', (e) => {
  const li = e.target.closest('li');
  if (!li) return;
  chosenWord = li.dataset.word;
  renderPickList();
});

// Start button
hangmanStartBtn.addEventListener('click', () => {
  if (currentMode === 'choose' && !chosenWord) {
    alert('Please select a word first!');
    return;
  }
  startGame();
});

// Keyboard clicks
hangmanKeyboard.addEventListener('click', (e) => {
  const btn = e.target.closest('.key-btn');
  if (!btn || btn.disabled) return;
  guessLetter(btn.dataset.letter);
});

// Physical keyboard
document.addEventListener('keydown', (e) => {
  if (document.getElementById('hangman-page').classList.contains('hidden')) return;
  const key = e.key.toLowerCase();
  if (/^[a-z]$/.test(key)) {
    guessLetter(key);
  }
});

// Next word → go back to mode selector
hangmanNextBtn.addEventListener('click', showModeSelector);

// Reset score
hangmanResetScore.addEventListener('click', () => {
  wins = 0;
  losses = 0;
  usedWords = [];
  updateScore();
});

// Called from app.js when switching to hangman tab
window.onHangmanTabOpen = function () {
  if (!gameActive) {
    showModeSelector();
  }
};
