const app = document.querySelector('#app');

function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function formatDate(isoDate) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(`${isoDate}T12:00:00Z`));
}

function renderArticle(article) {
  document.title = `${article.title} · English Reading Practice`;
  app.replaceChildren();

  const articleElement = make('article', 'reading-card');
  const intro = make('header', 'article-header');

  const meta = make('div', 'article-meta');
  meta.append(
    make('span', 'date-pill', formatDate(article.date)),
    make('span', 'meta-separator', '•'),
    make('span', '', article.category),
    make('span', 'meta-separator', '•'),
    make('span', '', article.readingTime)
  );

  const eyebrow = make('p', 'eyebrow', 'Today’s reading');
  const title = make('h1', '', article.title);
  const standfirst = make('p', 'standfirst', article.standfirst);
  intro.append(meta, eyebrow, title, standfirst);

  const routineNote = make('div', 'routine-note');
  routineNote.append(
    make('span', 'routine-number', '1'),
    make('p', '', 'Read at a comfortable pace. There is no timer and nothing to submit.')
  );

  const body = make('div', 'article-body');
  article.paragraphs.forEach((paragraph, index) => {
    const p = make('p', index === 0 ? 'opening-paragraph' : '', paragraph);
    body.appendChild(p);
  });

  const source = make('p', 'source-note');
  source.append('Faithfully adapted for English practice from ');
  const sourceLink = make('a', '', article.source.originalTitle);
  sourceLink.href = article.source.url;
  sourceLink.target = '_blank';
  sourceLink.rel = 'noopener noreferrer';
  source.append(sourceLink, ` (${article.source.name}).`);

  const finish = make('section', 'finish-section');
  const finishPrompt = make('p', 'finish-prompt', 'Finished reading?');
  const revealButton = make('button', 'reveal-button', 'I’ve finished — show the questions');
  revealButton.type = 'button';
  revealButton.setAttribute('aria-expanded', 'false');
  revealButton.setAttribute('aria-controls', 'questions');
  finish.append(finishPrompt, revealButton);

  const questions = make('section', 'questions-panel');
  questions.id = 'questions';
  questions.hidden = true;
  questions.setAttribute('aria-labelledby', 'questions-heading');

  const questionHeader = make('header', 'questions-header');
  questionHeader.append(
    make('p', 'eyebrow', 'Talk it through'),
    make('h2', '', 'Five questions for conversation'),
    make('p', 'questions-intro', 'Answer out loud with your tutor. Take your time; complete sentences matter more than speed.')
  );
  const questionHeading = questionHeader.querySelector('h2');
  questionHeading.id = 'questions-heading';
  questionHeading.tabIndex = -1;

  const list = make('ol', 'question-list');
  article.questions.forEach((question) => {
    const item = make('li', 'question-item');
    const labelRow = make('div', 'question-labels');
    labelRow.append(
      make('span', 'question-stage', question.label),
      make('span', 'tense-label', question.tense)
    );
    item.append(
      labelRow,
      make('p', 'question-text', question.prompt),
      make('p', 'question-support', question.support)
    );
    list.appendChild(item);
  });

  const closeNote = make('p', 'closing-note', 'That’s enough for today. A short conversation done regularly is the goal.');
  questions.append(questionHeader, list, closeNote);

  revealButton.addEventListener('click', () => {
    const isOpen = revealButton.getAttribute('aria-expanded') === 'true';
    if (isOpen) return;
    questions.hidden = false;
    revealButton.setAttribute('aria-expanded', 'true');
    revealButton.textContent = 'Questions ready';
    questionHeading.focus({ preventScroll: true });
    revealButton.disabled = true;
    requestAnimationFrame(() => questions.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  });

  articleElement.append(intro, routineNote, body, source, finish, questions);
  app.appendChild(articleElement);
}

function renderError() {
  app.replaceChildren();
  const card = make('section', 'error-card');
  card.append(
    make('p', 'eyebrow', 'Reading unavailable'),
    make('h1', '', 'Today’s article could not be opened.'),
    make('p', '', 'Please check your connection and refresh the page.')
  );
  app.appendChild(card);
}

async function init() {
  try {
    const response = await fetch('data/articles.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Article request failed: ${response.status}`);
    const articles = await response.json();
    if (!Array.isArray(articles) || articles.length === 0) throw new Error('No articles found');
    articles.sort((a, b) => b.date.localeCompare(a.date));
    renderArticle(articles[0]);
  } catch (error) {
    console.error(error);
    renderError();
  }
}

init();
