// === State ===
const words = [];

// === Word Storage ===
// Words are loaded from words.js (portable file) + localStorage (UI additions).
// The merged set is used as the history.

const HISTORY_KEY = 'vocab-history-local';
let fileWords = Array.isArray(FILE_WORDS)
  ? FILE_WORDS.map((w) => w.trim().toLowerCase()).filter(Boolean)
  : [];

function getLocalStorageWords() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function saveLocalStorageWords(list) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
}

function getHistory() {
  const local = getLocalStorageWords();
  const merged = [...new Set([...fileWords, ...local])];
  merged.sort();
  return merged;
}

function saveToHistory(word) {
  const local = getLocalStorageWords();
  if (!local.includes(word) && !fileWords.includes(word)) {
    local.push(word);
    local.sort();
    saveLocalStorageWords(local);
  }
}

function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
}

function exportWords() {
  const allWords = getHistory();
  const js = `// Edit this file to bulk-manage your vocabulary words.\n// Just add or remove words from the array below.\nconst FILE_WORDS = ${JSON.stringify(allWords, null, 2)};\n`;
  const blob = new Blob([js], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'words.js';
  a.click();
  URL.revokeObjectURL(url);
}

// === DOM Elements ===
const vocabInput = document.getElementById('vocab-input');
const addBtn = document.getElementById('add-btn');
const wordList = document.getElementById('word-list');
const wordListSection = document.getElementById('word-list-section');
const generateBtn = document.getElementById('generate-btn');
const repeatCount = document.getElementById('repeat-count');
const historySection = document.getElementById('history-section');
const historyList = document.getElementById('history-list');
const clearHistoryBtn = document.getElementById('clear-history-btn');
const exportBtn = document.getElementById('export-btn');

const inputPage = document.getElementById('input-page');
const printPage = document.getElementById('print-page');
const backBtn = document.getElementById('back-btn');
const printBtn = document.getElementById('print-btn');
const practiceRows = document.getElementById('practice-rows');

const mainNav = document.getElementById('main-nav');

// === Tab Navigation ===
const navTabs = document.querySelectorAll('.nav-tab');
const pages = {
  'input-page': inputPage,
  'print-page': printPage,
  'hangman-page': document.getElementById('hangman-page'),
};

function switchTab(targetId) {
  Object.values(pages).forEach((p) => p.classList.add('hidden'));
  pages[targetId].classList.remove('hidden');

  navTabs.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.target === targetId);
  });

  mainNav.classList.toggle('hidden', targetId === 'print-page');

  if (targetId === 'hangman-page' && typeof window.onHangmanTabOpen === 'function') {
    window.onHangmanTabOpen();
  }
}

navTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    switchTab(tab.dataset.target);
  });
});

// === Functions ===
function addWord(word) {
  const w = (word || vocabInput.value).trim().toLowerCase();
  if (!w) return;
  if (words.includes(w)) {
    if (!word) {
      vocabInput.value = '';
      vocabInput.focus();
    }
    return;
  }

  words.push(w);
  saveToHistory(w);
  renderWordList();
  renderHistory();

  if (!word) {
    vocabInput.value = '';
    vocabInput.focus();
  }
}

function removeWord(index) {
  words.splice(index, 1);
  renderWordList();
  renderHistory();
}

function renderWordList() {
  wordList.innerHTML = '';
  words.forEach((word, index) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span>${word}</span>
      <button class="remove-word" data-index="${index}" aria-label="Remove ${word}">×</button>
    `;
    wordList.appendChild(li);
  });

  const hasWords = words.length > 0;
  wordListSection.classList.toggle('hidden', !hasWords);
  generateBtn.classList.toggle('hidden', !hasWords);
}

function renderHistory() {
  const history = getHistory();
  historyList.innerHTML = '';

  if (history.length === 0) {
    historySection.classList.add('hidden');
    return;
  }

  historySection.classList.remove('hidden');

  history.forEach((word) => {
    const li = document.createElement('li');
    li.textContent = word;
    li.dataset.word = word;

    if (words.includes(word)) {
      li.classList.add('in-list');
      li.title = 'Already in current list';
    } else {
      li.title = 'Click to add';
    }

    historyList.appendChild(li);
  });
}

function generateSheet() {
  const repeats = parseInt(repeatCount.value, 10);
  practiceRows.innerHTML = '';

  words.forEach((word) => {
    const row = document.createElement('div');
    row.className = 'practice-row';

    const label = document.createElement('div');
    label.className = 'word-label';
    label.textContent = word;
    row.appendChild(label);

    const trace = document.createElement('div');
    trace.className = 'trace-line';
    trace.textContent = word;
    row.appendChild(trace);

    for (let i = 0; i < repeats; i++) {
      const blank = document.createElement('div');
      blank.className = 'blank-line';
      row.appendChild(blank);
    }

    practiceRows.appendChild(row);
  });

  switchTab('print-page');
}

// === Event Listeners ===
addBtn.addEventListener('click', () => addWord());

vocabInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    addWord();
  }
});

generateBtn.addEventListener('click', generateSheet);

backBtn.addEventListener('click', () => {
  switchTab('input-page');
});

printBtn.addEventListener('click', () => {
  window.print();
});

wordList.addEventListener('click', (e) => {
  if (e.target.classList.contains('remove-word')) {
    const index = parseInt(e.target.dataset.index, 10);
    removeWord(index);
  }
});

historyList.addEventListener('click', (e) => {
  const li = e.target.closest('li');
  if (!li || li.classList.contains('in-list')) return;
  addWord(li.dataset.word);
});

clearHistoryBtn.addEventListener('click', () => {
  if (confirm('Remove all saved word history? (This only clears words added via the UI, not words.json)')) {
    clearHistory();
  }
});

exportBtn.addEventListener('click', exportWords);

// === Init ===
renderHistory();
