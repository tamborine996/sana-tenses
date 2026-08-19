import { test, expect } from '@playwright/test';

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

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
});
