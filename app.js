/**
 * Sana Tenses - English Tense Learning App
 * Professional modular JavaScript implementation
 */

// ============================================
// Constants & Configuration
// ============================================

const TENSE_FILES = [
  'present-simple',
  'present-continuous',
  'past-simple',
  'past-continuous',
  'present-perfect',
  'present-perfect-continuous',
  'past-perfect',
  'future-simple'
];

const TENSE_CATEGORIES = {
  'Present Tenses': ['present-simple', 'present-continuous'],
  'Past Tenses': ['past-simple', 'past-continuous'],
  'Perfect Tenses': ['present-perfect', 'present-perfect-continuous', 'past-perfect'],
  'Future Tenses': ['future-simple']
};

const STORAGE_KEY = 'sanaTensesProgress';

// ============================================
// State Management
// ============================================

const state = {
  tenseInfo: {},
  packs: [],
  progress: loadProgress(),
  currentPack: null,
  currentSentences: [],
  currentIndex: 0,
  revealed: false,
  sessionStats: { correct: 0, total: 0 },
  reviewMode: false
};

function loadProgress() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error loading progress:', e);
  }
  return {
    packProgress: {},
    recentlyCompleted: [],
    reviewQueue: []
  };
}

function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
  } catch (e) {
    console.error('Error saving progress:', e);
  }
}

function getPackProgress(packId) {
  if (!state.progress.packProgress[packId]) {
    state.progress.packProgress[packId] = {
      practiced: 0,
      correct: 0,
      lastPracticed: null,
      wrongSentences: []
    };
  }
  return state.progress.packProgress[packId];
}

// ============================================
// Data Loading
// ============================================

async function loadData() {
  try {
    // Load tense info
    const infoResponse = await fetch('data/tense-info.json');
    state.tenseInfo = await infoResponse.json();

    // Load all pack files
    const packPromises = TENSE_FILES.map(async (tense) => {
      const response = await fetch(`data/${tense}.json`);
      return response.json();
    });

    const packData = await Promise.all(packPromises);

    // Flatten packs
    state.packs = packData.flatMap(data =>
      data.packs.map(pack => ({
        ...pack,
        tense: data.tense,
        tenseName: state.tenseInfo[data.tense]?.name || data.tense
      }))
    );

    console.log(`Loaded ${state.packs.length} packs with ${state.packs.reduce((sum, p) => sum + p.sentences.length, 0)} sentences`);

    renderHomeScreen();
  } catch (error) {
    console.error('Error loading data:', error);
    document.getElementById('home-screen').innerHTML = `
      <div class="error-message">
        <p>Error loading data. Please refresh the page.</p>
        <p style="font-size: 0.8rem; color: var(--color-ink-muted);">${error.message}</p>
      </div>
    `;
  }
}

// ============================================
// Rendering - Home Screen
// ============================================

function renderHomeScreen() {
  const container = document.getElementById('pack-list');
  container.innerHTML = '';

  // Review All Mistakes Button
  const totalWrong = getTotalWrongCount();
  const reviewAllBtn = document.createElement('button');
  reviewAllBtn.className = 'review-all-btn';
  reviewAllBtn.disabled = totalWrong === 0;
  reviewAllBtn.innerHTML = `
    <span>Review All Mistakes</span>
    <span class="count">${totalWrong}</span>
  `;
  reviewAllBtn.onclick = () => startReviewAll();
  container.appendChild(reviewAllBtn);

  // Recently Completed
  if (state.progress.recentlyCompleted.length > 0) {
    const recentSection = document.createElement('div');
    recentSection.className = 'recently-completed';
    recentSection.innerHTML = `<div class="section-title">Recently Completed</div>`;

    const recentPacks = document.createElement('div');
    recentPacks.className = 'recent-packs';

    state.progress.recentlyCompleted.slice(0, 5).forEach(packId => {
      const pack = state.packs.find(p => p.id === packId);
      if (!pack) return;

      const progress = getPackProgress(packId);
      const accuracy = progress.practiced > 0
        ? Math.round((progress.correct / progress.practiced) * 100)
        : 0;

      const card = document.createElement('div');
      card.className = 'recent-pack-card';
      card.innerHTML = `
        <div class="recent-pack-name">${pack.tenseName}</div>
        <div class="recent-pack-meta">${pack.levelName} · ${accuracy}%</div>
      `;
      card.onclick = () => startPractice(packId);
      recentPacks.appendChild(card);
    });

    recentSection.appendChild(recentPacks);
    container.appendChild(recentSection);
  }

  // Tense Categories
  Object.entries(TENSE_CATEGORIES).forEach(([categoryName, tenses]) => {
    const categorySection = document.createElement('div');
    categorySection.className = 'tense-category';

    const categoryWrong = getCategoryWrongCount(tenses);

    categorySection.innerHTML = `
      <div class="category-header">
        <h2 class="category-name">${categoryName}</h2>
        ${categoryWrong > 0 ? `
          <button class="category-review-btn" onclick="startCategoryReview('${tenses.join(',')}')">
            Review ${categoryWrong} mistakes
          </button>
        ` : ''}
      </div>
    `;

    // Create table for this category
    const table = document.createElement('table');
    table.className = 'tense-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>Tense</th>
          <th>Level</th>
          <th>Description</th>
          <th>Count</th>
          <th>Progress</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');

    tenses.forEach(tenseId => {
      const tensePacks = state.packs.filter(p => p.tense === tenseId);
      const tenseInfo = state.tenseInfo[tenseId];

      tensePacks.forEach((pack, index) => {
        const progress = getPackProgress(pack.id);
        const accuracy = progress.practiced > 0
          ? Math.round((progress.correct / progress.practiced) * 100)
          : 0;
        const wrongCount = progress.wrongSentences.length;

        let progressClass = '';
        if (progress.practiced > 0) {
          if (accuracy >= 80) progressClass = 'high';
          else if (accuracy >= 60) progressClass = 'medium';
          else progressClass = 'low';
        }

        const row = document.createElement('tr');
        row.innerHTML = `
          <td>
            <div class="tense-name-cell">
              <span class="tense-name">${pack.tenseName}</span>
              ${index === 0 ? `
                <button class="tense-info-btn" onclick="showTenseInfo('${tenseId}')" title="Learn about this tense">
                  i
                </button>
              ` : ''}
            </div>
          </td>
          <td><span class="level-name">${pack.levelName}</span></td>
          <td><span class="pack-description">${pack.description}</span></td>
          <td><span class="pack-count">${pack.sentences.length}</span></td>
          <td>
            <div class="progress-cell">
              <div class="progress-text">
                ${progress.practiced > 0 ? `${accuracy}%` : '—'}
              </div>
              <div class="progress-bar">
                <div class="progress-fill ${progressClass}" style="width: ${accuracy}%"></div>
              </div>
            </div>
          </td>
          <td class="action-cell">
            <button class="btn-practice" onclick="startPractice('${pack.id}')">Practice</button>
            ${wrongCount > 0 ? `
              <button class="btn-review-pack" onclick="startPackReview('${pack.id}')">
                Review ${wrongCount}
              </button>
            ` : ''}
          </td>
        `;

        tbody.appendChild(row);
      });
    });

    categorySection.appendChild(table);
    container.appendChild(categorySection);
  });
}

// ============================================
// Review Functions
// ============================================

function getTotalWrongCount() {
  let count = 0;
  Object.values(state.progress.packProgress).forEach(progress => {
    count += progress.wrongSentences.length;
  });
  return count;
}

function getCategoryWrongCount(tenses) {
  let count = 0;
  state.packs
    .filter(p => tenses.includes(p.tense))
    .forEach(pack => {
      const progress = getPackProgress(pack.id);
      count += progress.wrongSentences.length;
    });
  return count;
}

function startReviewAll() {
  const sentences = [];
  state.packs.forEach(pack => {
    const progress = getPackProgress(pack.id);
    progress.wrongSentences.forEach(sentenceIndex => {
      if (pack.sentences[sentenceIndex]) {
        sentences.push({
          ...pack.sentences[sentenceIndex],
          packId: pack.id,
          sentenceIndex: sentenceIndex,
          tenseName: pack.tenseName
        });
      }
    });
  });

  if (sentences.length === 0) return;

  state.reviewMode = true;
  state.currentPack = { id: 'review-all', tenseName: 'Review All Mistakes', levelName: '' };
  state.currentSentences = shuffle(sentences);
  state.currentIndex = 0;
  state.revealed = false;
  state.sessionStats = { correct: 0, total: 0 };

  showPracticeScreen();
}

function startCategoryReview(tensesStr) {
  const tenses = tensesStr.split(',');
  const sentences = [];

  state.packs
    .filter(p => tenses.includes(p.tense))
    .forEach(pack => {
      const progress = getPackProgress(pack.id);
      progress.wrongSentences.forEach(sentenceIndex => {
        if (pack.sentences[sentenceIndex]) {
          sentences.push({
            ...pack.sentences[sentenceIndex],
            packId: pack.id,
            sentenceIndex: sentenceIndex,
            tenseName: pack.tenseName
          });
        }
      });
    });

  if (sentences.length === 0) return;

  state.reviewMode = true;
  state.currentPack = { id: 'review-category', tenseName: 'Review Mistakes', levelName: '' };
  state.currentSentences = shuffle(sentences);
  state.currentIndex = 0;
  state.revealed = false;
  state.sessionStats = { correct: 0, total: 0 };

  showPracticeScreen();
}

function startPackReview(packId) {
  const pack = state.packs.find(p => p.id === packId);
  if (!pack) return;

  const progress = getPackProgress(packId);
  const sentences = progress.wrongSentences.map(index => ({
    ...pack.sentences[index],
    packId: packId,
    sentenceIndex: index,
    tenseName: pack.tenseName
  })).filter(s => s.urdu);

  if (sentences.length === 0) return;

  state.reviewMode = true;
  state.currentPack = pack;
  state.currentSentences = shuffle(sentences);
  state.currentIndex = 0;
  state.revealed = false;
  state.sessionStats = { correct: 0, total: 0 };

  showPracticeScreen();
}

// ============================================
// Practice Functions
// ============================================

function startPractice(packId) {
  const pack = state.packs.find(p => p.id === packId);
  if (!pack) return;

  state.reviewMode = false;
  state.currentPack = pack;
  state.currentSentences = shuffle(pack.sentences.map((s, i) => ({
    ...s,
    packId: packId,
    sentenceIndex: i,
    tenseName: pack.tenseName
  })));
  state.currentIndex = 0;
  state.revealed = false;
  state.sessionStats = { correct: 0, total: 0 };

  showPracticeScreen();
}

function showPracticeScreen() {
  document.getElementById('home-screen').classList.remove('active');
  document.getElementById('practice-screen').classList.add('active');

  renderCard();
  updateProgress();
}

function showHomeScreen() {
  document.getElementById('practice-screen').classList.remove('active');
  document.getElementById('home-screen').classList.add('active');

  renderHomeScreen();
}

function renderCard() {
  if (state.currentIndex >= state.currentSentences.length) {
    endSession();
    return;
  }

  const sentence = state.currentSentences[state.currentIndex];
  const card = document.getElementById('flashcard');
  const urduEl = document.getElementById('urdu-text');
  const englishEl = document.getElementById('english-answer');
  const tenseEl = document.getElementById('tense-badge');
  const answerSection = document.getElementById('answer-section');
  const cardActions = document.getElementById('card-actions');
  const tapHint = document.getElementById('tap-hint');

  urduEl.textContent = sentence.urdu;
  englishEl.textContent = sentence.english;
  tenseEl.textContent = sentence.tenseName;

  card.classList.remove('revealed');
  answerSection.classList.remove('visible');
  cardActions.classList.remove('visible');
  tapHint.style.display = 'block';
  state.revealed = false;

  // Update title
  document.getElementById('practice-title').textContent =
    state.currentPack.tenseName + (state.currentPack.levelName ? ` - ${state.currentPack.levelName}` : '');

  // Update counter
  document.getElementById('practice-counter').textContent =
    `${state.currentIndex + 1} / ${state.currentSentences.length}`;
}

function revealAnswer() {
  if (state.revealed) return;

  state.revealed = true;
  document.getElementById('flashcard').classList.add('revealed');
  document.getElementById('answer-section').classList.add('visible');
  document.getElementById('card-actions').classList.add('visible');
  document.getElementById('tap-hint').style.display = 'none';
}

function hideAnswer() {
  if (!state.revealed) return;

  state.revealed = false;
  document.getElementById('flashcard').classList.remove('revealed');
  document.getElementById('answer-section').classList.remove('visible');
  document.getElementById('card-actions').classList.remove('visible');
  document.getElementById('tap-hint').style.display = 'block';
}

function markCorrect() {
  const sentence = state.currentSentences[state.currentIndex];
  state.sessionStats.correct++;
  state.sessionStats.total++;

  // Update progress
  const progress = getPackProgress(sentence.packId);
  progress.practiced++;
  progress.correct++;
  progress.lastPracticed = new Date().toISOString();

  // Remove from wrong list if present
  const wrongIndex = progress.wrongSentences.indexOf(sentence.sentenceIndex);
  if (wrongIndex > -1) {
    progress.wrongSentences.splice(wrongIndex, 1);
  }

  saveProgress();

  state.currentIndex++;
  renderCard();
  updateProgress();
}

function markWrong() {
  const sentence = state.currentSentences[state.currentIndex];
  state.sessionStats.total++;

  // Update progress
  const progress = getPackProgress(sentence.packId);
  progress.practiced++;
  progress.lastPracticed = new Date().toISOString();

  // Add to wrong list if not present
  if (!progress.wrongSentences.includes(sentence.sentenceIndex)) {
    progress.wrongSentences.push(sentence.sentenceIndex);
  }

  saveProgress();

  state.currentIndex++;
  renderCard();
  updateProgress();
}

function updateProgress() {
  const progress = (state.currentIndex / state.currentSentences.length) * 100;
  document.getElementById('practice-progress-fill').style.width = `${progress}%`;
}

function endSession() {
  // Add to recently completed if not review mode
  if (!state.reviewMode && state.currentPack.id) {
    const recentIndex = state.progress.recentlyCompleted.indexOf(state.currentPack.id);
    if (recentIndex > -1) {
      state.progress.recentlyCompleted.splice(recentIndex, 1);
    }
    state.progress.recentlyCompleted.unshift(state.currentPack.id);
    state.progress.recentlyCompleted = state.progress.recentlyCompleted.slice(0, 10);
    saveProgress();
  }

  // Show completion message
  const accuracy = state.sessionStats.total > 0
    ? Math.round((state.sessionStats.correct / state.sessionStats.total) * 100)
    : 0;

  alert(`Session Complete!\n\nCorrect: ${state.sessionStats.correct}/${state.sessionStats.total}\nAccuracy: ${accuracy}%`);

  showHomeScreen();
}

// ============================================
// Info Modal
// ============================================

function showTenseInfo(tenseId) {
  const info = state.tenseInfo[tenseId];
  if (!info) return;

  const modal = document.getElementById('info-modal');

  document.getElementById('modal-title').textContent = info.name;
  document.getElementById('modal-urdu-name').textContent = info.urduName;
  document.getElementById('modal-formula').textContent = info.formula;
  document.getElementById('modal-explanation').textContent = info.explanation;

  const whenToUseList = document.getElementById('modal-when-to-use');
  whenToUseList.innerHTML = info.whenToUse.map(item => `<li>${item}</li>`).join('');

  const examplesContainer = document.getElementById('modal-examples');
  examplesContainer.innerHTML = info.examples.map(ex => `
    <div class="example-item">
      <div class="example-urdu">${ex.urdu}</div>
      <div class="example-english">${ex.english}</div>
    </div>
  `).join('');

  modal.classList.add('active');
}

function closeModal() {
  document.getElementById('info-modal').classList.remove('active');
}

// ============================================
// Utilities
// ============================================

function shuffle(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ============================================
// Event Listeners
// ============================================

function initEventListeners() {
  // Flashcard click to reveal
  document.getElementById('flashcard').addEventListener('click', (e) => {
    if (!state.revealed && !e.target.closest('.card-actions')) {
      revealAnswer();
    }
  });

  // Answer section click to hide
  document.getElementById('answer-section').addEventListener('click', (e) => {
    if (!e.target.closest('.card-actions')) {
      e.stopPropagation();
      hideAnswer();
    }
  });

  // Action buttons
  document.getElementById('btn-wrong').addEventListener('click', (e) => {
    e.stopPropagation();
    markWrong();
  });

  document.getElementById('btn-right').addEventListener('click', (e) => {
    e.stopPropagation();
    markCorrect();
  });

  // Back button
  document.getElementById('btn-back').addEventListener('click', showHomeScreen);

  // Modal close
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('info-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (!document.getElementById('practice-screen').classList.contains('active')) return;

    if (e.code === 'Space') {
      e.preventDefault();
      if (!state.revealed) {
        revealAnswer();
      }
    } else if (e.code === 'ArrowLeft' && state.revealed) {
      markWrong();
    } else if (e.code === 'ArrowRight' && state.revealed) {
      markCorrect();
    } else if (e.code === 'Escape') {
      showHomeScreen();
    }
  });
}

// ============================================
// Initialize App
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  loadData();
});

// Make functions available globally for onclick handlers
window.startPractice = startPractice;
window.startPackReview = startPackReview;
window.startCategoryReview = startCategoryReview;
window.showTenseInfo = showTenseInfo;
