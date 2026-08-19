import { test, expect } from '@playwright/test';

async function selectText(page, paragraphSelector, text) {
  await page.evaluate(({ paragraphSelector, text }) => {
    const paragraphs = [...document.querySelectorAll(paragraphSelector)];
    const paragraph = paragraphs.find((item) => item.textContent.includes(text));
    if (!paragraph) throw new Error(`Could not find selection text: ${text}`);
    const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const start = node.textContent.indexOf(text);
      if (start === -1) continue;
      const range = document.createRange();
      range.setStart(node, start);
      range.setEnd(node, start + text.length);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      document.dispatchEvent(new Event('selectionchange'));
      return;
    }
    throw new Error(`Selection text crossed unsupported text nodes: ${text}`);
  }, { paragraphSelector, text });
}

async function clearSelection(page) {
  await page.evaluate(() => {
    window.getSelection().removeAllRanges();
    document.dispatchEvent(new Event('selectionchange'));
  });
}

test('the reading library exposes every article and the chapter book', async ({ page }) => {
  await page.goto('/reading/');

  await expect(page.locator('#library')).toBeVisible();
  await expect(page.locator('#library-heading')).toHaveText('Sana’s reading library');
  await expect(page.locator('.library-card')).toHaveCount(3);
  await expect(page.locator('[data-library-id="2026-08-19-childrens-lung-recovery"]')).toContainText('The Clean-Air Surprise');
  await expect(page.locator('[data-library-id="2026-08-16-shark-photographs"]')).toContainText('The danger behind the perfect shark picture');
  await expect(page.locator('[data-library-id="the-wonderful-wizard-of-oz"]')).toContainText('The Wonderful Wizard of Oz');
  await expect(page.locator('[data-library-id="2026-08-19-childrens-lung-recovery"]')).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('[data-library-id="the-wonderful-wizard-of-oz"]')).toHaveAttribute('href', 'books/wizard-of-oz/');

  await page.locator('[data-library-id="2026-08-16-shark-photographs"]').click();
  await expect(page).toHaveURL(/\?article=2026-08-16-shark-photographs#reader$/);
  await expect(page.locator('#en-story h1')).toHaveText('The danger behind the perfect shark picture');
  await expect(page.locator('[data-library-id="2026-08-16-shark-photographs"]')).toHaveAttribute('aria-current', 'page');

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
});

test('native text selection saves a revisitable highlight without changing the reader', async ({ page }) => {
  await page.goto('/reading/?article=2026-08-16-shark-photographs#reader');
  await page.evaluate(() => localStorage.removeItem('sana-reading:highlights:v1'));
  await page.reload();

  await expect(page.locator('.article-body').first()).toHaveCSS('user-select', 'auto');
  await selectText(page, '#en-story .article-body p', 'touching or riding a wild shark');
  await expect(page.locator('.highlight-toast')).toContainText('Highlight saved');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('sana-reading:highlights:v1') || '[]').length)).toBe(1);
  await expect.poll(() => page.evaluate(() => window.getSelection().toString())).toBe('touching or riding a wild shark');
  expect(await page.evaluate(() => {
    const paragraph = document.querySelector('#en-story .article-body p');
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    paragraph.dispatchEvent(event);
    return event.defaultPrevented;
  })).toBe(false);

  await clearSelection(page);
  await expect(page.locator('#en-story mark.saved-highlight')).toHaveText('touching or riding a wild shark');
  await expect(page.locator('.highlights-toggle')).toContainText('Highlights · 1');

  await page.locator('.highlights-toggle').click();
  await expect(page.locator('#highlights-panel')).toBeVisible();
  await expect(page.locator('.highlight-review-item')).toContainText('touching or riding a wild shark');
  await expect(page.locator('.highlight-review-item')).toContainText('The danger behind the perfect shark picture');

  await page.locator('.highlight-review-link').click();
  await expect(page).toHaveURL(/highlight=[^&]+#reader$/);
  await expect(page.locator('#en-story mark.saved-highlight')).toBeFocused();

  await page.reload();
  await expect(page.locator('#en-story mark.saved-highlight')).toHaveText('touching or riding a wild shark');
});

test('a quick selection is not lost and malformed saved data cannot break the reader', async ({ page }) => {
  await page.goto('/reading/');
  await page.evaluate(() => localStorage.setItem('sana-reading:highlights:v1', JSON.stringify([
    { id: 'incomplete-record', contentId: 'old-article' }
  ])));
  await page.reload();
  await expect(page.locator('.reading-card')).toBeVisible();
  await expect(page.locator('.highlights-toggle')).toContainText('Highlights · 0');

  await page.evaluate(() => localStorage.removeItem('sana-reading:highlights:v1'));
  await page.goto('/reading/?article=2026-08-16-shark-photographs#reader');
  await selectText(page, '#en-story .article-body p', 'touching or riding a wild shark');
  await clearSelection(page);

  await expect(page.locator('.highlight-toast')).toContainText('Highlight saved');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('sana-reading:highlights:v1') || '[]').length)).toBe(1);
  await expect(page.locator('#en-story mark.saved-highlight')).toHaveText('touching or riding a wild shark');
});

test('Easy and Challenge panels remain keyboard-reachable', async ({ page }) => {
  const browserErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
  page.on('pageerror', (error) => browserErrors.push(error.message));

  await page.goto('/reading/');
  await expect(page.locator('#en-story h1')).toHaveText('The Clean-Air Surprise: How London Children’s Lungs Began to Recover');
  await expect(page.locator('.source-note a')).toHaveAttribute('href', 'https://www.bbc.co.uk/news/articles/c1l1r1zne1ro');
  await expect(page.locator('#questions')).toBeHidden();

  await page.locator('.reveal-button').press('Enter');
  await expect(page.locator('#questions')).toBeVisible();
  await expect(page.locator('#questions-heading')).toBeFocused();
  await expect(page.locator('#easy-tab')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#easy-questions .question-item')).toHaveCount(10);
  await expect(page.locator('#easy-questions .question-translation')).toHaveCount(10);
  await expect(page.locator('#easy-questions .question-translation').first()).toHaveAttribute('lang', 'ur');
  await expect(page.locator('#easy-questions .question-translation').first()).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('#easy-questions .question-text-urdu').first()).toContainText(/[\u0600-\u06ff]/);
  await expect(page.locator('#easy-questions .question-support-urdu')).toHaveCount(10);
  await expect(page.locator('#easy-questions .question-example bdi').first()).toHaveAttribute('lang', 'en');
  await expect(page.locator('#easy-questions .question-example bdi').first()).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('#challenge-questions')).toBeHidden();

  await page.locator('#easy-tab').focus();
  await page.locator('#easy-tab').press('ArrowRight');
  await expect(page.locator('#challenge-tab')).toBeFocused();
  await expect(page.locator('#challenge-tab')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#easy-questions')).toBeHidden();
  await expect(page.locator('#challenge-questions .question-item')).toHaveCount(10);
  await expect(page.locator('#challenge-questions .question-translation')).toHaveCount(10);
  await expect(page.locator('#challenge-questions .question-support-urdu')).toHaveCount(10);
  await expect(page.locator('#challenge-questions .question-example bdi').first()).toHaveAttribute('lang', 'en');
  await expect(page.locator('#challenge-questions .question-example bdi').first()).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('#challenge-questions')).toBeVisible();

  await page.keyboard.press('Tab');
  await expect(page.locator('#challenge-questions')).toBeFocused();

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
  expect(browserErrors).toEqual([]);
});

test('English and Urdu story tabs preserve the reading flow', async ({ page }) => {
  await page.goto('/reading/');

  await expect(page.locator('#en-language-tab')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#en-story')).toBeVisible();
  await expect(page.locator('#en-story')).toHaveAttribute('lang', 'en');
  await expect(page.locator('#en-story')).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('#ur-story')).toBeHidden();
  const englishTitle = await page.locator('#en-story h1').textContent();

  await page.locator('#en-language-tab').focus();
  await page.locator('#en-language-tab').press('ArrowRight');
  await expect(page.locator('#ur-language-tab')).toBeFocused();
  await expect(page.locator('#ur-language-tab')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#ur-story')).toBeVisible();
  await expect(page.locator('#ur-story')).toHaveAttribute('lang', 'ur');
  await expect(page.locator('#ur-story')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('#ur-story h1')).toContainText(/[\u0600-\u06ff]/);

  await page.locator('.reveal-button').click();
  await expect(page.locator('#questions')).toBeVisible();
  await page.locator('#ur-language-tab').click();
  await page.locator('#en-language-tab').click();
  await expect(page.locator('#en-story h1')).toHaveText(englishTitle || '');
  await expect(page.locator('#questions')).toBeVisible();

  await page.goto('/reading/?article=2026-08-19-childrens-lung-recovery&language=ur#reader');
  await expect(page.locator('#ur-language-tab')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#ur-story')).toBeVisible();
  await expect(page.locator('#en-story')).toBeHidden();

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
});
