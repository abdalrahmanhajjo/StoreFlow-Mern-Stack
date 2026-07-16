import { test, expect, type Page } from '@playwright/test';

// The signup wizard must fit small phones — fixed-width step dots and OTP
// boxes have overflowed 375px viewports before. Checks every wizard step.

const PHONE = { width: 375, height: 720 }; // iPhone SE class — smaller than Pixel 7

async function expectNoHorizontalOverflow(page: Page, label: string) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth, `${label}: page scrolls horizontally (${scrollWidth} > ${clientWidth})`)
    .toBeLessThanOrEqual(clientWidth);
}

test.describe('Signup on a small phone', () => {
  test.use({ viewport: PHONE });

  test('every register step fits the viewport', async ({ page }) => {
    await page.goto('/register');
    await expectNoHorizontalOverflow(page, 'step 0 (business)');

    // Business
    await page.getByLabel('Store name').fill('Blue Palm Grocers');
    await page.locator('input[name="businessPhone"]').fill('5551234567');
    await page.getByLabel('Business address').fill('123 Main St, Springfield');
    await page.getByRole('button', { name: 'Continue' }).click();
    await expectNoHorizontalOverflow(page, 'step 1 (owner)');

    // Owner identity
    await page.getByLabel('Owner full name').fill('Amara Reyes');
    await page.locator('input[name="ownerPhone"]').fill('5559876543');
    await page.getByLabel('ID number').fill('AB123456');
    await page.getByRole('button', { name: 'Continue' }).click();
    await expectNoHorizontalOverflow(page, 'step 2 (account)');

    // Account
    await page.getByLabel('Work email').fill('owner@example.com');
    await page.getByRole('textbox', { name: 'Password' }).fill('Str0ng!Pass1');
    await expectNoHorizontalOverflow(page, 'step 2 with password checklist');
    await page.getByRole('button', { name: 'Continue' }).click();
    await expectNoHorizontalOverflow(page, 'step 3 (plan)');

    // Plan → registration (mocked) → OTP verify step
    await page.getByRole('button', { name: 'Create store' }).click();
    await expect(page.getByText('Verify your email')).toBeVisible();
    await expectNoHorizontalOverflow(page, 'step 4 (OTP verify)');
  });

  test('home nav keeps the Sign in button on a phone', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    // Both nav CTAs must stay visible — a blanket ghost-button hide once
    // removed "Sign in" (and the plan-card CTAs) from phone layouts.
    await expect(page.locator('.sf-home-nav-cta .sf-home-ghost')).toBeVisible();
    await expect(page.locator('.sf-home-nav-cta .sf-home-solid')).toBeVisible();
  });

  test('resend-verification OTP screen fits the viewport', async ({ page }) => {
    await page.goto('/resend-verification');
    await page.getByLabel('Email address').fill('owner@example.com');
    await page.getByRole('button', { name: 'Send verification code' }).click();
    await expect(page.getByText('Check your email')).toBeVisible();
    await expectNoHorizontalOverflow(page, 'resend-verification OTP');
  });
});
