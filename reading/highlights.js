(() => {
  const STORAGE_KEY = 'sana-reading:highlights:v1';
  const CHANGE_EVENT = 'sana:highlights-changed';
  const MAX_SELECTION_LENGTH = 180;
  let toastTimer;

  function isValidHighlight(item) {
    return item
      && typeof item.id === 'string'
      && typeof item.contentId === 'string'
      && typeof item.title === 'string'
      && typeof item.locationLabel === 'string'
      && typeof item.language === 'string'
      && typeof item.text === 'string'
      && typeof item.context === 'string'
      && typeof item.href === 'string'
      && typeof item.createdAt === 'string'
      && Number.isInteger(item.paragraphIndex)
      && Number.isFinite(item.start)
      && Number.isFinite(item.end)
      && item.start >= 0
      && item.end > item.start;
  }

  function getAll() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(saved) ? saved.filter(isValidHighlight) : [];
    } catch (error) {
      console.warn('Saved highlights could not be read.', error);
      return [];
    }
  }

  function store(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { items } }));
      return true;
    } catch (error) {
      console.warn('The highlight could not be saved.', error);
      return false;
    }
  }

  function remove(id) {
    const items = getAll();
    const nextItems = items.filter((item) => item.id !== id);
    if (nextItems.length === items.length) return false;
    return store(nextItems);
  }

  function makeId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `highlight-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function scheduleToastHide(toast) {
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.hidden = true;
    }, 4200);
  }

  function showToast(id, message = 'Highlight saved') {
    let toast = document.querySelector('.highlight-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'highlight-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      toast.addEventListener('mouseenter', () => window.clearTimeout(toastTimer));
      toast.addEventListener('mouseleave', () => scheduleToastHide(toast));
      toast.addEventListener('focusin', () => window.clearTimeout(toastTimer));
      toast.addEventListener('focusout', () => scheduleToastHide(toast));
      document.body.appendChild(toast);
    }

    const copy = document.createElement('span');
    copy.textContent = message;
    const undo = document.createElement('button');
    undo.type = 'button';
    undo.textContent = 'Undo';
    undo.hidden = !id;
    undo.addEventListener('click', () => {
      if (id) remove(id);
      toast.hidden = true;
    });
    toast.replaceChildren(copy, undo);
    toast.hidden = false;

    scheduleToastHide(toast);
  }

  function offsetWithin(paragraph, node, offset) {
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    range.setEnd(node, offset);
    return range.toString().length;
  }

  function paragraphForNode(node, root) {
    const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    const paragraph = element?.closest('[data-highlight-paragraph]');
    return paragraph && root.contains(paragraph) ? paragraph : null;
  }

  function contextAround(text, start, end) {
    const punctuation = /[.!?۔]/;
    let contextStart = Math.max(0, start - 90);
    let contextEnd = Math.min(text.length, end + 90);

    for (let index = start - 1; index >= contextStart; index -= 1) {
      if (punctuation.test(text[index])) {
        contextStart = index + 1;
        break;
      }
    }
    for (let index = end; index < contextEnd; index += 1) {
      if (punctuation.test(text[index])) {
        contextEnd = index + 1;
        break;
      }
    }
    return text.slice(contextStart, contextEnd).trim();
  }

  function sameLocation(left, right) {
    return left.contentId === right.contentId
      && String(left.section) === String(right.section)
      && left.language === right.language
      && Number(left.paragraphIndex) === Number(right.paragraphIndex);
  }

  function exactMatchFor(items, details) {
    return items.find((item) => sameLocation(item, details)
      && item.start === details.start
      && item.end === details.end);
  }

  class HighlightController {
    constructor(root, options) {
      this.root = root;
      this.options = options;
      this.sourceText = new WeakMap();
      this.saveTimer = null;
      this.pendingDetails = null;
      this.activeHighlightId = null;
      this.selectionWasActive = false;
      this.actionDetails = null;
      this.action = document.createElement('div');
      this.action.className = 'highlight-action';
      this.action.hidden = true;
      this.action.setAttribute('role', 'group');
      this.action.setAttribute('aria-label', 'Selected text actions');
      this.actionText = document.createElement('span');
      this.actionText.className = 'highlight-action__text';
      this.actionButton = document.createElement('button');
      this.actionButton.type = 'button';
      this.actionButton.className = 'highlight-action__button';
      this.actionButton.addEventListener('pointerdown', (event) => event.preventDefault());
      this.actionButton.addEventListener('click', () => this.commitAction());
      this.action.append(this.actionText, this.actionButton);
      document.body.appendChild(this.action);
      this.handleSelectionChange = this.handleSelectionChange.bind(this);
      this.handleStoredChange = this.handleStoredChange.bind(this);
      document.addEventListener('selectionchange', this.handleSelectionChange);
      window.addEventListener(CHANGE_EVENT, this.handleStoredChange);
      this.refresh();
    }

    showAction(details) {
      const match = exactMatchFor(getAll(), details);
      this.actionDetails = details;
      this.activeHighlightId = match?.id || null;
      this.actionText.textContent = `“${details.text.length > 54 ? `${details.text.slice(0, 51)}…` : details.text}”`;
      this.actionButton.textContent = match ? 'Remove highlight' : 'Save highlight';
      this.action.dataset.mode = match ? 'remove' : 'save';
      this.action.hidden = false;
    }

    hideAction() {
      this.action.hidden = true;
      this.actionDetails = null;
    }

    commitAction() {
      const details = this.actionDetails;
      if (!details) return;
      const match = exactMatchFor(getAll(), details);
      if (match) {
        if (remove(match.id)) {
          this.activeHighlightId = null;
          this.hideAction();
          showToast(null, 'Highlight removed');
        }
        return;
      }
      this.save(details);
      this.hideAction();
    }

    refresh() {
      this.root.querySelectorAll('[data-highlight-paragraph]').forEach((paragraph) => {
        if (!this.sourceText.has(paragraph)) this.sourceText.set(paragraph, paragraph.textContent);
      });
      if (window.getSelection()?.isCollapsed !== false) this.paintAll();
    }

    handleStoredChange() {
      if (!this.selectionWasActive && window.getSelection()?.isCollapsed !== false) this.paintAll();
    }

    selectionDetails() {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount !== 1 || selection.isCollapsed) return null;
      const range = selection.getRangeAt(0);
      const startParagraph = paragraphForNode(range.startContainer, this.root);
      const endParagraph = paragraphForNode(range.endContainer, this.root);
      if (!startParagraph || startParagraph !== endParagraph) return null;

      const fullText = this.sourceText.get(startParagraph) || startParagraph.textContent;
      let start = offsetWithin(startParagraph, range.startContainer, range.startOffset);
      let end = offsetWithin(startParagraph, range.endContainer, range.endOffset);
      if (end < start) [start, end] = [end, start];

      const rawText = fullText.slice(start, end);
      const leadingSpace = rawText.length - rawText.trimStart().length;
      const trailingSpace = rawText.length - rawText.trimEnd().length;
      start += leadingSpace;
      end -= trailingSpace;
      const text = fullText.slice(start, end);
      if (!text || text.length > MAX_SELECTION_LENGTH) return null;

      const context = this.options.getContext(startParagraph);
      if (!context) return null;
      return {
        ...context,
        paragraphIndex: Number(startParagraph.dataset.highlightParagraph),
        section: startParagraph.dataset.highlightSection || context.section || 'article',
        language: startParagraph.dataset.highlightLanguage || context.language || 'en',
        start,
        end,
        text,
        context: contextAround(fullText, start, end)
      };
    }

    handleSelectionChange() {
      window.clearTimeout(this.saveTimer);
      const selection = window.getSelection();
      if (selection && selection.rangeCount === 1 && !selection.isCollapsed) {
        const details = this.selectionDetails();
        if (!details) {
          const range = selection.getRangeAt(0);
          const startsInside = this.root.contains(range.startContainer);
          const endsInside = this.root.contains(range.endContainer);
          if (startsInside || endsInside) {
            this.selectionWasActive = true;
            this.pendingDetails = null;
            this.hideAction();
          } else if (this.selectionWasActive) {
            this.pendingDetails = null;
            this.selectionWasActive = false;
            this.activeHighlightId = null;
            this.hideAction();
            this.paintAll();
          }
          return;
        }

        this.selectionWasActive = true;
        this.pendingDetails = details;
        this.saveTimer = window.setTimeout(() => {
          if (this.pendingDetails === details && window.getSelection()?.isCollapsed === false) {
            this.showAction(details);
          }
        }, 450);
        return;
      }

      if (this.selectionWasActive) {
        this.pendingDetails = null;
        this.selectionWasActive = false;
        this.activeHighlightId = null;
        this.hideAction();
        window.setTimeout(() => {
          if (window.getSelection()?.isCollapsed !== false) this.paintAll();
        }, 0);
      }
    }

    save(details) {
      const items = getAll();
      const exactMatch = exactMatchFor(items, details);
      if (exactMatch) {
        this.activeHighlightId = exactMatch.id;
        this.showAction(details);
        return;
      }

      const activeIndex = items.findIndex((item) => item.id === this.activeHighlightId && sameLocation(item, details));
      const id = activeIndex >= 0 ? items[activeIndex].id : makeId();
      const record = {
        id,
        ...details,
        createdAt: activeIndex >= 0 ? items[activeIndex].createdAt : new Date().toISOString()
      };
      record.href = this.options.makeHref(record);

      if (activeIndex >= 0) items[activeIndex] = record;
      else items.push(record);
      if (!store(items)) {
        showToast(null, 'Highlight could not be saved');
        return;
      }

      this.activeHighlightId = id;
      showToast(id);
    }

    paintAll() {
      const items = getAll();
      this.root.querySelectorAll('[data-highlight-paragraph]').forEach((paragraph) => {
        const source = this.sourceText.get(paragraph) || paragraph.textContent;
        this.sourceText.set(paragraph, source);
        const context = this.options.getContext(paragraph);
        if (!context) return;
        const paragraphIndex = Number(paragraph.dataset.highlightParagraph);
        const section = paragraph.dataset.highlightSection || context.section || 'article';
        const language = paragraph.dataset.highlightLanguage || context.language || 'en';
        const matches = items
          .filter((item) => item.contentId === context.contentId
            && String(item.section) === String(section)
            && item.language === language
            && Number(item.paragraphIndex) === paragraphIndex
            && item.start >= 0
            && item.end <= source.length
            && item.end > item.start)
          .filter((item) => source.slice(item.start, item.end) === item.text)
          .sort((left, right) => left.start - right.start);

        if (matches.length === 0) {
          if (paragraph.childNodes.length !== 1 || paragraph.firstChild?.nodeType !== Node.TEXT_NODE) {
            paragraph.textContent = source;
          }
          return;
        }

        const merged = [];
        matches.forEach((item) => {
          const previous = merged[merged.length - 1];
          if (previous && item.start <= previous.end) {
            previous.end = Math.max(previous.end, item.end);
            previous.ids.push(item.id);
          } else {
            merged.push({ start: item.start, end: item.end, ids: [item.id] });
          }
        });

        const fragment = document.createDocumentFragment();
        let cursor = 0;
        merged.forEach((range) => {
          if (range.start > cursor) fragment.append(document.createTextNode(source.slice(cursor, range.start)));
          const mark = document.createElement('mark');
          mark.className = 'saved-highlight';
          mark.dataset.highlightIds = range.ids.join(' ');
          mark.textContent = source.slice(range.start, range.end);
          fragment.append(mark);
          cursor = range.end;
        });
        if (cursor < source.length) fragment.append(document.createTextNode(source.slice(cursor)));
        paragraph.replaceChildren(fragment);
      });
    }

    reveal(id) {
      this.paintAll();
      const mark = [...this.root.querySelectorAll('mark.saved-highlight')]
        .find((item) => item.dataset.highlightIds.split(' ').includes(id));
      if (!mark) return false;
      mark.tabIndex = -1;
      requestAnimationFrame(() => {
        mark.scrollIntoView({ behavior: 'auto', block: 'center' });
        mark.focus({ preventScroll: true });
      });
      return true;
    }
  }

  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) {
      window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { items: getAll() } }));
    }
  });

  window.SanaHighlights = {
    storageKey: STORAGE_KEY,
    attach(root, options) {
      return new HighlightController(root, options);
    },
    getAll,
    remove
  };
})();
