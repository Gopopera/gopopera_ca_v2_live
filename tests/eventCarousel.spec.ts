import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['iPhone 13'] });

test.describe('Event image carousel', () => {
  test('carousel snaps one image per swipe', async ({ page }) => {
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

    const carousel = page.locator('[data-testid="event-image-carousel"]');
    if ((await carousel.count()) === 0) {
      test.skip(true, 'No carousel available (single image event)');
      return;
    }

    const slideCount = await carousel.locator('img').count();
    if (slideCount < 2) {
      test.skip(true, 'Not enough images to test snapping');
      return;
    }

    const viewportWidth = await carousel.evaluate((el) => el.clientWidth);

    await carousel.evaluate((el, width) => {
      el.scrollTo({ left: width * 1.1, behavior: 'smooth' });
    }, viewportWidth);

    await page.waitForTimeout(800);

    const scrollLeft = await carousel.evaluate((el) => el.scrollLeft);
    expect(Math.abs(scrollLeft - viewportWidth)).toBeLessThan(8);
  });
});

