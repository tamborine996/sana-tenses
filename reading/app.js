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

function makeQuestionPanel(setName, questions, isActive) {
  const panel = make('div', 'question-set');
  panel.id = `${setName}-questions`;
  panel.setAttribute('role', 'tabpanel');
  panel.setAttribute('aria-labelledby', `${setName}-tab`);
  panel.tabIndex = 0;
  panel.hidden = !isActive;

  const list = make('ol', 'question-list');
  questions.forEach((question) => {
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
  panel.appendChild(list);
  return panel;
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
    make('h2', '', 'Choose your questions'),
    make('p', 'questions-intro', 'Start with ten easy questions, or switch to ten challenge questions. Answer out loud with your tutor and take your time.')
  );
  const questionHeading = questionHeader.querySelector('h2');
  questionHeading.id = 'questions-heading';
  questionHeading.tabIndex = -1;

  const switcher = make('div', 'question-switch');
  switcher.setAttribute('role', 'tablist');
  switcher.setAttribute('aria-label', 'Question difficulty');

  const setNames = ['easy', 'challenge'];
  const tabs = setNames.map((setName, index) => {
    const tab = make('button', 'question-tab', `${setName === 'easy' ? 'Easy' : 'Challenge'} · 10`);
    tab.type = 'button';
    tab.id = `${setName}-tab`;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', `${setName}-questions`);
    tab.setAttribute('aria-selected', String(index === 0));
    tab.tabIndex = index === 0 ? 0 : -1;
    tab.dataset.questionSet = setName;
    return tab;
  });
  switcher.append(...tabs);

  const questionSets = make('div', 'question-sets');
  const panels = setNames.map((setName, index) => makeQuestionPanel(
    setName,
    article.questionSets[setName],
    index === 0
  ));
  questionSets.append(...panels);

  function selectQuestionSet(setName, moveFocus = false) {
    tabs.forEach((tab) => {
      const isSelected = tab.dataset.questionSet === setName;
      tab.setAttribute('aria-selected', String(isSelected));
      tab.tabIndex = isSelected ? 0 : -1;
      if (isSelected && moveFocus) tab.focus();
    });
    panels.forEach((panel) => {
      panel.hidden = panel.id !== `${setName}-questions`;
    });
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectQuestionSet(tab.dataset.questionSet));
    tab.addEventListener('keydown', (event) => {
      let nextIndex;
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = tabs.length - 1;
      if (nextIndex === undefined) return;
      event.preventDefault();
      selectQuestionSet(tabs[nextIndex].dataset.questionSet, true);
    });
  });

  const closeNote = make('p', 'closing-note', 'That’s enough for today. A short conversation done regularly is the goal.');
  questions.append(questionHeader, switcher, questionSets, closeNote);

  revealButton.addEventListener('click', () => {
    const isOpen = revealButton.getAttribute('aria-expanded') === 'true';
    if (isOpen) return;
    questions.hidden = false;
    revealButton.setAttribute('aria-expanded', 'true');
    revealButton.textContent = 'Questions ready';
    questionHeading.focus({ preventScroll: true });
    revealButton.disabled = true;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    requestAnimationFrame(() => questions.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start'
    }));
  });

  articleElement.append(intro, routineNote, body, source, finish, questions);
  app.appendChild(articleElement);
}

function renderError() {
  app.replaceChildren();
  const card = make('section', 'error-card');
  card.setAttribute('role', 'status');
  card.setAttribute('aria-live', 'polite');
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
