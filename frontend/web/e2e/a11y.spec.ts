import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility (axe-core)', () => {
  const pages = [
    { name: 'Home', path: '/' },
    { name: 'Login', path: '/login' },
    { name: 'Register', path: '/register' },
  ];

  for (const { name, path } of pages) {
    test(`${name} has no critical or serious violations`, async ({ page }) => {
      // Reveal/fade animations mid-transition read as low-contrast text to
      // axe — scan with motion reduced and let in-flight transitions settle.
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(path);
      // 'load' not 'networkidle': the home page animates continuously and
      // keeps the network busy, so networkidle can time the test out.
      await page.waitForLoadState('load');
      await page.waitForTimeout(500);

      // Excluded as purely decorative per WCAG 1.4.3's exception: the home
      // hero's ghosted feature lines (0.15 opacity by design; the active line
      // is shown at full contrast) and the giant footer wordmark backdrop.
      const results = await new AxeBuilder({ page })
        .exclude('.sf-focus-line')
        .exclude('.sf-footer-wordmark')
        .analyze();
      const violations = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      );

      expect(violations).toEqual([]);
    });
  }

  test('404 page has no critical violations', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/nonexistent-route');
    await page.waitForLoadState('load');
    await page.waitForTimeout(500);

    const results = await new AxeBuilder({ page }).analyze();
    const violations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(violations).toEqual([]);
  });
});
