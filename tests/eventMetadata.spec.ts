import { test, expect } from '@playwright/test';

test.describe('Event metadata', () => {
  test('event OG tags are event-specific', async ({ page }) => {
    await page.goto('/explore');
    await page.waitForLoadState('networkidle');

    const eventCards = page.locator('[class*="event-card"], [data-testid="event-card"]');
    const cardCount = await eventCards.count();
    if (cardCount === 0) {
      test.skip(true, 'No events available to test');
      return;
    }

    await eventCards.first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const eventTitle = page.locator('h1, h2').first();
    await eventTitle.waitFor({ timeout: 5000 });
    const titleText = (await eventTitle.textContent())?.trim() || '';

    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect(ogTitle).toBeTruthy();
    expect(ogTitle).not.toContain('Popera — Small in-person experiences');
    if (titleText) {
      expect(ogTitle).toContain(titleText);
    }

    const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(ogImage).toBeTruthy();
    if (ogImage) {
      expect(ogImage).not.toContain('/2.jpg');
    }
  });
});

