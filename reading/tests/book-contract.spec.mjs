import { test, expect } from '@playwright/test';

async function selectText(page, text) {
  await page.evaluate((text) => {
    const paragraph = [...document.querySelectorAll('.chapter-body p')].find((item) => item.textContent.includes(text));
    const node = paragraph?.firstChild;
    const start = node?.textContent.indexOf(text) ?? -1;
    if (!node || start < 0) throw new Error(`Could not find selection text: ${text}`);
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, start + text.length);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
  }, text);
}

test('chapter reader keeps a single linear path and saves progress', async ({ page }) => {
  const browserErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
  page.on('pageerror', (error) => browserErrors.push(error.message));

  await page.goto('/reading/books/wizard-of-oz/');
  await expect(page.locator('.back-link')).toHaveText('← Sana’s Reading Library');
  await expect(page.locator('.back-link')).toHaveAttribute('href', '../../#library');
  await expect(page.locator('.progress-label')).toHaveText('Chapter 1 of 24');
  await expect(page.locator('.chapter-title')).toHaveText('The Cyclone');
  await expect(page.locator('.chapter-body p')).toHaveCount(20);
  await expect(page.locator('.chapter-art')).toBeVisible();
  await expect(page.locator('.chapter-button-secondary')).toBeHidden();

  await page.evaluate(() => localStorage.removeItem('sana-reading:highlights:v1'));
  await selectText(page, 'great Kansas prairies');
  await expect(page.locator('.highlight-toast')).toContainText('Highlight saved');
  await page.evaluate(() => {
    window.getSelection().removeAllRanges();
    document.dispatchEvent(new Event('selectionchange'));
  });
  await expect(page.locator('.chapter-body mark.saved-highlight')).toHaveText('great Kansas prairies');

  await page.evaluate(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('highlight', 'stale-highlight-id');
    history.replaceState({}, '', url);
  });
  await page.locator('.chapter-button-primary').click();
  await expect(page.locator('.chapter-title')).toBeFocused();
  await expect(page.locator('.progress-label')).toHaveText('Chapter 2 of 24');
  await expect(page.locator('.chapter-title')).toHaveText('The Council with the Munchkins');
  await expect(page).not.toHaveURL(/highlight=/);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('sana-reading:wizard-of-oz:chapter'))).toBe('1');

  await page.reload();
  await expect(page.locator('.progress-label')).toHaveText('Chapter 2 of 24');
  await expect(page.locator('.chapter-title')).toHaveText('The Council with the Munchkins');

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
  expect(browserErrors).toEqual([]);
});
