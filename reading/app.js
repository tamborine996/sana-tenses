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

function makeLibraryCard({ id, href, type, meta, title, description, action, isCurrent, variant }) {
  const card = make('a', `library-card library-card--${variant}`);
  card.href = href;
  card.dataset.libraryId = id;
  if (isCurrent) {
    card.classList.add('is-current');
    card.setAttribute('aria-current', 'page');
  }

  const cardTop = make('div', 'library-card__top');
  cardTop.append(
    make('span', 'library-card__type', type),
    make('span', 'library-card__meta', meta)
  );
  const heading = make('h2', 'library-card__title', title);
  const summary = make('p', 'library-card__description', description);
  const footer = make('div', 'library-card__footer');
  footer.append(
    make('span', 'library-card__action', action),
    make('span', 'library-card__arrow', '→')
  );
  card.append(cardTop, heading, summary, footer);
  return card;
}

function makeHighlightsArea() {
  const toggle = make('button', 'highlights-toggle');
  toggle.type = 'button';
  toggle.setAttribute('aria-controls', 'highlights-panel');
  toggle.setAttribute('aria-expanded', 'false');

  const panel = make('section', 'highlights-panel');
  panel.id = 'highlights-panel';
  panel.hidden = true;
  panel.setAttribute('aria-labelledby', 'highlights-heading');

  function render() {
    const highlights = window.SanaHighlights?.getAll() || [];
    toggle.textContent = `Highlights · ${highlights.length}`;
    panel.replaceChildren();

    const header = make('header', 'highlights-panel__header');
    const heading = make('h2', '', 'Your highlights');
    heading.id = 'highlights-heading';
    heading.tabIndex = -1;
    header.append(
      heading,
      make('p', '', 'Select a word or short phrase while reading. It saves automatically and the browser’s Translate and Copy tools still work.')
    );
    panel.appendChild(header);

    if (highlights.length === 0) {
      panel.appendChild(make('p', 'highlights-empty', 'Nothing saved yet. Your first highlight will appear here.'));
      return;
    }

    const list = make('div', 'highlights-review-list');
    [...highlights].sort((left, right) => right.createdAt.localeCompare(left.createdAt)).forEach((highlight) => {
      const item = make('article', 'highlight-review-item');
      const link = make('a', 'highlight-review-link');
      link.href = highlight.href;
      const selectedText = make('strong', 'highlight-review-text', highlight.text);
      selectedText.lang = highlight.language;
      selectedText.dir = highlight.language === 'ur' ? 'rtl' : 'ltr';
      const context = make('span', 'highlight-review-context', highlight.context);
      context.lang = highlight.language;
      context.dir = highlight.language === 'ur' ? 'rtl' : 'ltr';
      link.append(
        selectedText,
        context,
        make('small', 'highlight-review-source', `${highlight.title} · ${highlight.locationLabel}`)
      );
      const remove = make('button', 'highlight-remove', 'Remove');
      remove.type = 'button';
      remove.setAttribute('aria-label', `Remove highlight: ${highlight.text}`);
      remove.addEventListener('click', () => window.SanaHighlights.remove(highlight.id));
      item.append(link, remove);
      list.appendChild(item);
    });
    panel.appendChild(list);
  }

  toggle.addEventListener('click', () => {
    const isOpen = toggle.getAttribute('aria-expanded') === 'true';
    panel.hidden = isOpen;
    toggle.setAttribute('aria-expanded', String(!isOpen));
    if (!isOpen) panel.querySelector('h2')?.focus({ preventScroll: true });
  });
  window.addEventListener('sana:highlights-changed', render);
  render();
  return { toggle, panel };
}

function makeLibrary(articles, selectedId) {
  const section = make('section', 'library-shelf');
  section.id = 'library';
  section.setAttribute('aria-labelledby', 'library-heading');

  const header = make('header', 'library-header');
  const headingCopy = make('div', 'library-heading-copy');
  const heading = make('h1', '', 'Sana’s reading library');
  heading.id = 'library-heading';
  headingCopy.append(
    make('p', 'eyebrow', 'Your reading shelf'),
    heading,
    make('p', 'library-intro', 'Choose a short article or settle into a chapter. Earlier readings stay on the shelf as the library grows.')
  );
  const highlightsArea = makeHighlightsArea();
  const libraryActions = make('div', 'library-actions');
  libraryActions.append(
    make('span', 'library-count', `${articles.length + 1} reads`),
    highlightsArea.toggle
  );
  header.append(
    headingCopy,
    libraryActions
  );

  const cards = make('div', 'library-grid');
  articles.forEach((article, index) => {
    cards.appendChild(makeLibraryCard({
      id: article.id,
      href: `?article=${encodeURIComponent(article.id)}#reader`,
      type: index === 0 ? 'Latest article' : 'Short article',
      meta: `${formatDate(article.date)} · ${article.readingTime}`,
      title: article.title,
      description: article.standfirst,
      action: article.id === selectedId ? 'Reading now' : 'Read article',
      isCurrent: article.id === selectedId,
      variant: index === 0 ? 'latest' : 'article'
    }));
  });
  cards.appendChild(makeLibraryCard({
    id: 'the-wonderful-wizard-of-oz',
    href: 'books/wizard-of-oz/',
    type: 'Chapter book',
    meta: '24 chapters · Full book',
    title: 'The Wonderful Wizard of Oz',
    description: 'Follow Dorothy and Toto along the yellow brick road, one chapter at a time.',
    action: 'Open the book',
    isCurrent: false,
    variant: 'book'
  }));

  section.append(header, highlightsArea.panel, cards);
  return section;
}

function makeQuestionPanel(setName, questions, urduQuestions, isActive) {
  const panel = make('div', 'question-set');
  panel.id = `${setName}-questions`;
  panel.setAttribute('role', 'tabpanel');
  panel.setAttribute('aria-labelledby', `${setName}-tab`);
  panel.tabIndex = 0;
  panel.hidden = !isActive;

  const list = make('ol', 'question-list');
  questions.forEach((question, index) => {
    const item = make('li', 'question-item');
    const labelRow = make('div', 'question-labels');
    labelRow.append(
      make('span', 'question-stage', question.label),
      make('span', 'tense-label', question.tense)
    );
    const urduQuestion = urduQuestions[index];
    const translation = make('div', 'question-translation');
    translation.lang = 'ur';
    translation.dir = 'rtl';
    translation.setAttribute('aria-label', 'Urdu translation');
    translation.append(
      make('p', 'question-text-urdu', urduQuestion.prompt),
      make('p', 'question-support-urdu', urduQuestion.support)
    );
    if (urduQuestion.englishExample) {
      const example = make('p', 'question-example');
      const isolatedEnglish = document.createElement('bdi');
      isolatedEnglish.lang = 'en';
      isolatedEnglish.dir = 'ltr';
      isolatedEnglish.textContent = urduQuestion.englishExample;
      example.appendChild(isolatedEnglish);
      translation.appendChild(example);
    }
    item.append(
      labelRow,
      make('p', 'question-text', question.prompt),
      make('p', 'question-support', question.support),
      translation
    );
    list.appendChild(item);
  });
  panel.appendChild(list);
  return panel;
}

function makeStoryPanel(article, language, content, isActive) {
  const panel = make('div', 'story-panel');
  panel.id = `${language}-story`;
  panel.setAttribute('role', 'tabpanel');
  panel.setAttribute('aria-labelledby', `${language}-language-tab`);
  panel.lang = language;
  panel.dir = language === 'ur' ? 'rtl' : 'ltr';
  panel.hidden = !isActive;

  const intro = make('header', 'article-header');
  intro.append(
    make('p', 'eyebrow', language === 'ur' ? 'آج کی تحریر' : 'Today’s reading'),
    make('h1', '', content.title),
    make('p', 'standfirst', content.standfirst)
  );

  const routineNote = make('div', 'routine-note');
  routineNote.append(
    make('span', 'routine-number', '1'),
    make('p', '', language === 'ur'
      ? 'آرام سے پڑھیں۔ کوئی وقت کی پابندی نہیں اور کچھ جمع نہیں کرانا۔'
      : 'Read at a comfortable pace. There is no timer and nothing to submit.')
  );

  const body = make('div', 'article-body');
  content.paragraphs.forEach((paragraph, index) => {
    const paragraphElement = make('p', index === 0 ? 'opening-paragraph' : '', paragraph);
    paragraphElement.dataset.highlightParagraph = String(index);
    paragraphElement.dataset.highlightSection = 'article';
    paragraphElement.dataset.highlightLanguage = language;
    body.appendChild(paragraphElement);
  });
  panel.append(intro, routineNote, body);
  return panel;
}

function renderArticle(article) {
  document.title = `${article.title} · English Reading Practice`;

  const articleElement = make('article', 'reading-card');
  articleElement.id = 'reader';
  const articleTop = make('div', 'article-top');
  const libraryLink = make('a', 'article-library-link', '← Back to the reading library');
  libraryLink.href = '#library';
  const meta = make('div', 'article-meta');
  meta.append(
    make('span', 'date-pill', formatDate(article.date)),
    make('span', 'meta-separator', '•'),
    make('span', '', article.category),
    make('span', 'meta-separator', '•'),
    make('span', '', article.readingTime)
  );

  const availableLanguages = [
    {
      key: 'en',
      label: 'English',
      content: { title: article.title, standfirst: article.standfirst, paragraphs: article.paragraphs }
    }
  ];
  if (article.translations?.ur) {
    availableLanguages.push({ key: 'ur', label: 'اردو', content: article.translations.ur });
  }
  const requestedLanguage = new URLSearchParams(window.location.search).get('language');
  const initialLanguageKey = availableLanguages.some((language) => language.key === requestedLanguage)
    ? requestedLanguage
    : 'en';

  const languageHeader = make('div', 'language-header');
  const languageCopy = make('div', 'language-copy');
  languageCopy.append(
    make('p', 'language-label', 'Story language'),
    make('p', 'language-help', 'Select a word or phrase to save it. Questions include Urdu help.')
  );
  const languageTabs = make('div', 'language-switch');
  languageTabs.setAttribute('role', 'tablist');
  languageTabs.setAttribute('aria-label', 'Story language');

  const languageButtons = availableLanguages.map((language) => {
    const isInitialLanguage = language.key === initialLanguageKey;
    const button = make('button', 'language-tab', language.label);
    button.type = 'button';
    button.id = `${language.key}-language-tab`;
    button.dataset.language = language.key;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', `${language.key}-story`);
    button.setAttribute('aria-selected', String(isInitialLanguage));
    button.tabIndex = isInitialLanguage ? 0 : -1;
    return button;
  });
  languageTabs.append(...languageButtons);
  languageHeader.append(languageCopy, languageTabs);
  articleTop.append(libraryLink, meta, languageHeader);

  const storyPanels = availableLanguages.map((language) => makeStoryPanel(
    article,
    language.key,
    language.content,
    language.key === initialLanguageKey
  ));

  function selectLanguage(languageKey, moveFocus = false) {
    languageButtons.forEach((button) => {
      const isSelected = button.dataset.language === languageKey;
      button.setAttribute('aria-selected', String(isSelected));
      button.tabIndex = isSelected ? 0 : -1;
      if (isSelected && moveFocus) button.focus();
    });
    storyPanels.forEach((panel) => {
      panel.hidden = panel.id !== `${languageKey}-story`;
    });
  }

  languageButtons.forEach((button, index) => {
    button.addEventListener('click', () => selectLanguage(button.dataset.language));
    button.addEventListener('keydown', (event) => {
      let nextIndex;
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % languageButtons.length;
      if (event.key === 'ArrowLeft') nextIndex = (index - 1 + languageButtons.length) % languageButtons.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = languageButtons.length - 1;
      if (nextIndex === undefined) return;
      event.preventDefault();
      selectLanguage(languageButtons[nextIndex].dataset.language, true);
    });
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
    make('p', 'questions-intro', 'Start with ten easy questions, or switch to ten challenge questions. Each one includes Urdu help. Answer out loud with your tutor and take your time.')
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
    article.questionTranslations.ur[setName],
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

  articleElement.append(articleTop, ...storyPanels, source, finish, questions);
  app.appendChild(articleElement);

  const highlighter = window.SanaHighlights?.attach(articleElement, {
    getContext(paragraph) {
      const language = paragraph.dataset.highlightLanguage || 'en';
      return {
        contentId: article.id,
        contentType: 'article',
        title: article.title,
        section: 'article',
        language,
        locationLabel: language === 'ur' ? 'Urdu article' : 'English article'
      };
    },
    makeHref(highlight) {
      return `?article=${encodeURIComponent(article.id)}&language=${encodeURIComponent(highlight.language)}&highlight=${encodeURIComponent(highlight.id)}#reader`;
    }
  });
  const requestedHighlight = new URLSearchParams(window.location.search).get('highlight');
  if (requestedHighlight) highlighter?.reveal(requestedHighlight);
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
    const requestedId = new URLSearchParams(window.location.search).get('article');
    const selectedArticle = articles.find((article) => article.id === requestedId) || articles[0];
    app.replaceChildren(makeLibrary(articles, selectedArticle.id));
    renderArticle(selectedArticle);
    if (window.location.hash === '#reader' && !new URLSearchParams(window.location.search).has('highlight')) {
      requestAnimationFrame(() => document.querySelector('#reader')?.scrollIntoView({ block: 'start' }));
    }
  } catch (error) {
    console.error(error);
    renderError();
  }
}

init();
