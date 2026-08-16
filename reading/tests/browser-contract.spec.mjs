import { test, expect } from '@playwright/test';

test('Easy and Challenge panels remain keyboard-reachable', async ({ page }) => {
  const browserErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
  page.on('pageerror', (error) => browserErrors.push(error.message));

  await page.goto('/reading/');
  await expect(page.locator('#questions')).toBeHidden();

  await page.locator('.reveal-button').press('Enter');
  await expect(page.locator('#questions')).toBeVisible();
  await expect(page.locator('#questions-heading')).toBeFocused();
  await expect(page.locator('#easy-tab')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#easy-questions .question-item')).toHaveCount(10);
  await expect(page.locator('#challenge-questions')).toBeHidden();

  await page.locator('#easy-tab').focus();
  await page.locator('#easy-tab').press('ArrowRight');
  await expect(page.locator('#challenge-tab')).toBeFocused();
  await expect(page.locator('#challenge-tab')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#easy-questions')).toBeHidden();
  await expect(page.locator('#challenge-questions .question-item')).toHaveCount(10);
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
