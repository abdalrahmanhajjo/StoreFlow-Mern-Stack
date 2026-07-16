import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Primary-flow E2E + WCAG 2.2 AA accessibility smoke tests.
// Auth is mocked (role inferred from the email prefix); any non-"fail" password works.

test.describe('Login flow', () => {
  test('has no serious/critical axe violations on the login screen', async ({ page }) => {
    await page.goto('/login');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    const blocking = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''));
    expect(blocking, JSON.stringify(blocking.map((v) => v.id), null, 2)).toEqual([]);
  });

  test('shows an accessible inline error for an invalid submission', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email address').fill('owner@x.com');
    // Role-based: label-text matching would also hit the "Show password"
    // toggle, and the label's aria-hidden required marker breaks exact match.
    await page.getByRole('textbox', { name: 'Password' }).fill('fail');
    await page.getByRole('button', { name: 'Sign in' }).click();
    // The error banner is an ARIA alert.
    await expect(page.getByRole('alert')).toContainText(/invalid/i);
  });

  test('an owner can sign in and lands on the dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email address').fill('owner@x.com');
    await page.getByRole('textbox', { name: 'Password' }).fill('correct-horse');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('protected route redirects an unauthenticated user to login with returnTo', async ({ page }) => {
    await page.goto('/inventory');
    await expect(page).toHaveURL(/\/login\?returnTo=%2Finventory/);
  });
});
