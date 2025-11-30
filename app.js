/**
 * Sana Tenses - English Tense Learning App
 * Professional modular JavaScript implementation with Supabase integration
 */

// ============================================
// Supabase Initialization
// ============================================

let supabase = null;

function initSupabase() {
  if (typeof SUPABASE_URL !== 'undefined' &&
      typeof SUPABASE_ANON_KEY !== 'undefined' &&
      SUPABASE_URL !== 'YOUR_PROJECT_URL' &&
      SUPABASE_ANON_KEY !== 'YOUR_ANON_KEY') {
    try {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log('Supabase initialized');
      return true;
    } catch (e) {
      console.warn('Failed to initialize Supabase:', e);
      return false;
    }
  }
  console.log('Supabase not configured - using local storage only');
  return false;
}

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
const SYNC_DEBOUNCE_MS = 2000;

// ============================================
// State Management
// ============================================

const state = {
  tenseInfo: {},
  packs: [],
  progress: null,
  currentPack: null,
  currentSentences: [],
  currentIndex: 0,
  revealed: false,
  sessionStats: { correct: 0, total: 0 },
  reviewMode: false,
  user: null,
  syncTimeout: null,
  syncing: false
};

// ============================================
// Progress Management
// ============================================

function getDefaultProgress() {
  return {
    packProgress: {},
    recentlyCompleted: [],
    reviewQueue: []
  };
}

function loadLocalProgress() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error loading local progress:', e);
  }
  return getDefaultProgress();
}

function saveLocalProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
  } catch (e) {
    console.error('Error saving local progress:', e);
  }
}

async function loadCloudProgress() {
  if (!supabase || !state.user) return null;

  try {
    const { data, error } = await supabase
      .from('user_progress')
      .select('pack_progress, recently_completed')
      .eq('user_id', state.user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No record exists yet
        return null;
      }
      throw error;
    }

    return {
      packProgress: data.pack_progress || {},
      recentlyCompleted: data.recently_completed || [],
      reviewQueue: []
    };
  } catch (e) {
    console.error('Error loading cloud progress:', e);
    return null;
  }
}

async function saveCloudProgress() {
  if (!supabase || !state.user) return;

  state.syncing = true;
  updateSyncIndicator();

  try {
    const { error } = await supabase
      .from('user_progress')
      .upsert({
        user_id: state.user.id,
        pack_progress: state.progress.packProgress,
        recently_completed: state.progress.recentlyCompleted
      }, {
        onConflict: 'user_id'
      });

    if (error) throw error;
    console.log('Progress synced to cloud');
  } catch (e) {
    console.error('Error saving cloud progress:', e);
    updateSyncIndicator('error');
    return;
  }

  state.syncing = false;
  updateSyncIndicator();
}

function saveProgress() {
  // Always save locally first
  saveLocalProgress();

  // Debounced cloud sync
  if (supabase && state.user) {
    if (state.syncTimeout) {
      clearTimeout(state.syncTimeout);
    }
    state.syncTimeout = setTimeout(() => {
      saveCloudProgress();
    }, SYNC_DEBOUNCE_MS);
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

// Merge local and cloud progress, preferring newer/more practiced data
function mergeProgress(local, cloud) {
  if (!cloud) return local;
  if (!local) return cloud;

  const merged = {
    packProgress: {},
    recentlyCompleted: cloud.recentlyCompleted.length > 0 ? cloud.recentlyCompleted : local.recentlyCompleted,
    reviewQueue: []
  };

  // Get all pack IDs from both
  const allPacks = new Set([
    ...Object.keys(local.packProgress),
    ...Object.keys(cloud.packProgress)
  ]);

  allPacks.forEach(packId => {
    const localPack = local.packProgress[packId];
    const cloudPack = cloud.packProgress[packId];

    if (!localPack) {
      merged.packProgress[packId] = cloudPack;
    } else if (!cloudPack) {
      merged.packProgress[packId] = localPack;
    } else {
      // Both exist - prefer the one with more practice
      if (cloudPack.practiced >= localPack.practiced) {
        merged.packProgress[packId] = cloudPack;
      } else {
        merged.packProgress[packId] = localPack;
      }
    }
  });

  return merged;
}

// ============================================
// Authentication
// ============================================

function updateSyncIndicator(status) {
  const authSection = document.getElementById('auth-section');
  const existingIndicator = authSection.querySelector('.sync-indicator');
  if (existingIndicator) {
    existingIndicator.remove();
  }

  if (!state.user) return;

  const indicator = document.createElement('span');
  indicator.className = 'sync-indicator';

  if (status === 'error') {
    indicator.classList.add('error');
    indicator.textContent = 'Sync error';
  } else if (state.syncing) {
    indicator.classList.add('syncing');
    indicator.textContent = 'Syncing...';
  } else {
    indicator.textContent = 'Synced';
  }

  authSection.appendChild(indicator);
}

function renderAuthSection() {
  const authSection = document.getElementById('auth-section');

  if (state.user) {
    const email = state.user.email;
    const shortEmail = email.length > 20 ? email.substring(0, 17) + '...' : email;

    authSection.innerHTML = `
      <div class="user-info">
        <span class="user-email" title="${email}">${shortEmail}</span>
        <button class="btn-sign-out" onclick="signOut()">Sign Out</button>
      </div>
    `;
    updateSyncIndicator();
  } else {
    authSection.innerHTML = `
      <button class="btn-google-sign-in" onclick="signInWithGoogle()">
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Sign in with Google
      </button>
    `;
  }
}

async function signInWithGoogle() {
  if (!supabase) {
    alert('Supabase not configured. Check supabase-config.js');
    return;
  }

  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + window.location.pathname
      }
    });

    if (error) throw error;
  } catch (error) {
    console.error('Google sign-in error:', error);
    alert('Sign in failed: ' + error.message);
  }
}

async function signOut() {
  if (!supabase) return;

  try {
    await supabase.auth.signOut();
    state.user = null;
    state.progress = loadLocalProgress();
    renderAuthSection();
    renderHomeScreen();
  } catch (error) {
    console.error('Sign out error:', error);
  }
}

async function handleAuthStateChange(event, session) {
  console.log('Auth state changed:', event);

  if (session?.user) {
    state.user = session.user;

    // Load and merge progress
    const localProgress = loadLocalProgress();
    const cloudProgress = await loadCloudProgress();
    state.progress = mergeProgress(localProgress, cloudProgress);

    // Save merged progress to both places
    saveLocalProgress();
    await saveCloudProgress();

    renderAuthSection();
    renderHomeScreen();
  } else {
    state.user = null;
    state.progress = loadLocalProgress();
    renderAuthSection();
    if (state.packs.length > 0) {
      renderHomeScreen();
    }
  }
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
    document.getElementById('pack-list').innerHTML = `
      <div class="error-message" style="text-align: center; padding: 40px; color: var(--color-ink-muted);">
        <p>Error loading data. Please refresh the page.</p>
        <p style="font-size: 0.8rem; margin-top: 8px;">${error.message}</p>
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
  updateProgressBar();
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
  updateProgressBar();
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
  updateProgressBar();
}

function updateProgressBar() {
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

  // Info Modal close
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

async function initApp() {
  // Initialize Supabase
  initSupabase();

  // Initialize event listeners
  initEventListeners();

  // Load local progress first
  state.progress = loadLocalProgress();

  // Render auth section
  renderAuthSection();

  // Set up auth state listener
  if (supabase) {
    supabase.auth.onAuthStateChange(handleAuthStateChange);

    // Check for existing session
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await handleAuthStateChange('INITIAL_SESSION', session);
    }
  }

  // Load tense data
  await loadData();
}

document.addEventListener('DOMContentLoaded', initApp);

// Make functions available globally for onclick handlers
window.startPractice = startPractice;
window.startPackReview = startPackReview;
window.startCategoryReview = startCategoryReview;
window.showTenseInfo = showTenseInfo;
window.signInWithGoogle = signInWithGoogle;
window.signOut = signOut;
