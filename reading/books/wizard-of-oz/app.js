const app = document.querySelector('#app');
const BOOK_URL = 'data/book.json';
const STORAGE_KEY = 'sana-reading:wizard-of-oz:chapter';

function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function readSavedChapter(chapterCount) {
  const queryChapter = Number.parseInt(new URLSearchParams(window.location.search).get('chapter'), 10);
  if (Number.isInteger(queryChapter) && queryChapter >= 1 && queryChapter <= chapterCount) {
    return queryChapter - 1;
  }

  try {
    const saved = Number.parseInt(localStorage.getItem(STORAGE_KEY), 10);
    if (Number.isInteger(saved) && saved >= 0 && saved < chapterCount) return saved;
  } catch (error) {
    console.warn('Reading progress could not be loaded.', error);
  }
  return 0;
}

function saveChapter(index) {
  try {
    localStorage.setItem(STORAGE_KEY, String(index));
  } catch (error) {
    console.warn('Reading progress could not be saved.', error);
  }
  const url = new URL(window.location.href);
  url.searchParams.set('chapter', String(index + 1));
  history.replaceState({}, '', url);
}

function renderError() {
  app.replaceChildren();
  const card = make('section', 'error-card');
  card.setAttribute('role', 'status');
  card.setAttribute('aria-live', 'polite');
  card.append(
    make('p', 'eyebrow', 'Book unavailable'),
    make('h1', '', 'The book could not be opened.'),
    make('p', '', 'Please check your connection and refresh the page.')
  );
  app.appendChild(card);
}

function renderBook(book) {
  let currentIndex = readSavedChapter(book.chapters.length);

  const masthead = make('section', 'book-masthead');
  const cover = make('img', 'book-cover');
  cover.src = book.cover;
  cover.alt = `Original 1900 cover of ${book.title}`;
  cover.width = 600;
  cover.height = 825;

  const mastheadCopy = make('div', 'masthead-copy');
  mastheadCopy.append(
    make('p', 'eyebrow', 'One complete adventure'),
    make('h1', '', book.title),
    make('p', 'book-byline', `By ${book.author} · Pictures by ${book.illustrator}`),
    make('p', 'book-description', book.description)
  );
  masthead.append(cover, mastheadCopy);

  const progressSection = make('section', 'progress-card');
  const progressCopy = make('div', 'progress-copy');
  const progressLabel = make('p', 'progress-label');
  const progressTitle = make('p', 'progress-title');
  progressCopy.append(progressLabel, progressTitle);
  const progress = make('progress', 'book-progress');
  progress.max = book.chapters.length;
  progressSection.append(progressCopy, progress);

  const chapterCard = make('article', 'chapter-card');
  const chapterHeader = make('header', 'chapter-header');
  const chapterKicker = make('p', 'chapter-kicker');
  const chapterTitle = make('h2', 'chapter-title');
  chapterTitle.tabIndex = -1;
  const chapterArt = make('img', 'chapter-art');
  chapterArt.alt = '';
  chapterArt.loading = 'eager';
  chapterHeader.append(chapterKicker, chapterTitle, chapterArt);

  const chapterBody = make('div', 'chapter-body');
  const chapterNavigation = make('nav', 'chapter-navigation');
  chapterNavigation.setAttribute('aria-label', 'Chapter navigation');
  const previousButton = make('button', 'chapter-button chapter-button-secondary', '← Previous chapter');
  const nextButton = make('button', 'chapter-button chapter-button-primary');
  previousButton.type = 'button';
  nextButton.type = 'button';
  chapterNavigation.append(previousButton, nextButton);
  chapterCard.append(chapterHeader, chapterBody, chapterNavigation);

  const sourceNote = make('section', 'source-note');
  sourceNote.append(
    make('p', 'source-title', 'About this edition'),
    make('p', '', book.source.editionNote)
  );
  const sourceLink = make('a', '', `Project Gutenberg eBook ${book.source.ebookNumber}`);
  sourceLink.href = book.source.metadataUrl;
  sourceLink.target = '_blank';
  sourceLink.rel = 'noopener noreferrer';
  sourceNote.appendChild(sourceLink);

  function showChapter(index, moveFocus = false) {
    currentIndex = index;
    const chapter = book.chapters[currentIndex];
    saveChapter(currentIndex);

    document.title = `Chapter ${chapter.number}: ${chapter.title} · ${book.title}`;
    progress.value = currentIndex + 1;
    progressLabel.textContent = `Chapter ${currentIndex + 1} of ${book.chapters.length}`;
    progressTitle.textContent = chapter.title;
    chapterKicker.textContent = `Chapter ${chapter.roman}`;
    chapterTitle.textContent = chapter.title;
    chapterArt.src = chapter.image;
    chapterArt.width = 600;
    chapterArt.height = 768;

    chapterBody.replaceChildren();
    chapter.paragraphs.forEach((paragraph, paragraphIndex) => {
      chapterBody.appendChild(make('p', paragraphIndex === 0 ? 'opening-paragraph' : '', paragraph));
    });

    previousButton.disabled = currentIndex === 0;
    previousButton.hidden = currentIndex === 0;
    const isLast = currentIndex === book.chapters.length - 1;
    nextButton.textContent = isLast
      ? 'Book complete ✓'
      : `Next: Chapter ${currentIndex + 2} →`;
    nextButton.disabled = isLast;

    if (moveFocus) {
      window.scrollTo({ top: progressSection.offsetTop - 12, behavior: 'auto' });
      chapterTitle.focus({ preventScroll: true });
    }
  }

  previousButton.addEventListener('click', () => {
    if (currentIndex > 0) showChapter(currentIndex - 1, true);
  });
  nextButton.addEventListener('click', () => {
    if (currentIndex < book.chapters.length - 1) showChapter(currentIndex + 1, true);
  });

  app.replaceChildren(masthead, progressSection, chapterCard, sourceNote);
  showChapter(currentIndex);
}

async function init() {
  try {
    const response = await fetch(BOOK_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Book request failed: ${response.status}`);
    const book = await response.json();
    if (!Array.isArray(book.chapters) || book.chapters.length !== 24) {
      throw new Error('The complete 24-chapter book was not found');
    }
    renderBook(book);
  } catch (error) {
    console.error(error);
    renderError();
  }
}

init();
