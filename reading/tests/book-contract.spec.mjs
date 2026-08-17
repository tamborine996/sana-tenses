import { test, expect } from '@playwright/test';

test('chapter reader keeps a single linear path and saves progress', async ({ page }) => {
  const browserErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
  page.on('pageerror', (error) => browserErrors.push(error.message));

  await page.goto('/reading/books/wizard-of-oz/');
  await expect(page.locator('.progress-label')).toHaveText('Chapter 1 of 24');
  await expect(page.locator('.chapter-title')).toHaveText('The Cyclone');
  await expect(page.locator('.chapter-body p')).toHaveCount(20);
  await expect(page.locator('.chapter-art')).toBeVisible();
  await expect(page.locator('.chapter-button-secondary')).toBeHidden();

  await page.locator('.chapter-button-primary').click();
  await expect(page.locator('.chapter-title')).toBeFocused();
  await expect(page.locator('.progress-label')).toHaveText('Chapter 2 of 24');
  await expect(page.locator('.chapter-title')).toHaveText('The Council with the Munchkins');
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
