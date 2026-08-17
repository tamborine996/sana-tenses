import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function expectNoWcagViolations(page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(results.violations, results.violations.map((violation) => `${violation.id}: ${violation.help}`).join('\n')).toEqual([]);
}

test('English, Urdu and chapter-book surfaces pass automated WCAG checks', async ({ page }) => {
  await page.goto('/reading/');
  await expectNoWcagViolations(page);

  await page.locator('#ur-language-tab').click();
  await expectNoWcagViolations(page);

  await page.locator('.reveal-button').click();
  await expectNoWcagViolations(page);

  await page.goto('/reading/books/wizard-of-oz/');
  await expectNoWcagViolations(page);
});
