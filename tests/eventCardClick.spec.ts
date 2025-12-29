/**
 * Playwright E2E smoke test for Event Card Click
 * 
 * This test verifies that clicking an event card successfully navigates
 * to the EventDetail page without initialization errors.
 * 
 * Bug prevented: "Cannot access 'V' before initialization" error when
 * clicking event cards due to circular import between userStore and db.
 */

import { test, expect } from '@playwright/test';

test.describe('Event Card Click Smoke Test', () => {
  test('clicking event card loads EventDetail page without errors', async ({ page }) => {
    // Navigate to Explore page
    await page.goto('/explore');
    
    // Wait for events to load
    await page.waitForLoadState('networkidle');
    
    // Wait for at least one event card to appear
    const eventCards = page.locator('[class*="event-card"], [data-testid="event-card"], .event-card, [role="button"]:has-text("RSVP")').first();
    
    // Check if any event cards exist
    const cardCount = await page.locator('[class*="event-card"], [data-testid="event-card"]').count();
    
    if (cardCount === 0) {
      test.skip(true, 'No events available to test');
      return;
    }
    
    // Capture console errors before clicking
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Capture page errors
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });
    
    // Click the first event card
    await eventCards.first().click();
    
    // Wait for navigation and page load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Allow React to render
    
    // Verify we're on EventDetail page by checking for event title
    // EventDetail page should have an h1 or h2 with the event title
    const eventTitle = page.locator('h1, h2, [class*="event-title"], [class*="title"]').first();
    
    try {
      await eventTitle.waitFor({ timeout: 5000 });
      const titleText = await eventTitle.textContent();
      
      // Title should not be empty
      expect(titleText).toBeTruthy();
      expect(titleText?.trim().length).toBeGreaterThan(0);
      
      // Verify no initialization errors occurred
      const hasInitError = consoleErrors.some(err => 
        err.includes('Cannot access') || 
        err.includes('before initialization') ||
        err.includes('ReferenceError')
      );
      
      expect(hasInitError).toBe(false);
      
      // Verify no page errors
      const hasPageError = pageErrors.some(err =>
        err.includes('Cannot access') ||
        err.includes('before initialization') ||
        err.includes('ReferenceError')
      );
      
      expect(hasPageError).toBe(false);
      
      console.log('✅ EventDetail page loaded successfully');
      console.log(`   Event title: ${titleText}`);
      
    } catch (error) {
      // If we can't find the title, check if there's an error page
      const errorPage = page.locator('text=/something went wrong|error|failed/i');
      const errorCount = await errorPage.count();
      
      if (errorCount > 0) {
        const errorText = await errorPage.first().textContent();
        throw new Error(`EventDetail page failed to load. Error: ${errorText}`);
      }
      
      // Log console errors for debugging
      if (consoleErrors.length > 0) {
        console.error('Console errors:', consoleErrors);
      }
      
      if (pageErrors.length > 0) {
        console.error('Page errors:', pageErrors);
      }
      
      throw error;
    }
  });
  
  test('hard refresh on EventDetail page does not cause initialization error', async ({ page }) => {
    // Navigate to Explore page
    await page.goto('/explore');
    await page.waitForLoadState('networkidle');
    
    // Find first event card
    const eventCards = page.locator('[class*="event-card"], [data-testid="event-card"]');
    const cardCount = await eventCards.count();
    
    if (cardCount === 0) {
      test.skip(true, 'No events available to test');
      return;
    }
    
    // Click first event card
    await eventCards.first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Get current URL
    const eventDetailUrl = page.url();
    
    // Capture errors before refresh
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });
    
    // Hard refresh (Cmd+Shift+R equivalent)
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    
    // Verify no initialization errors
    const hasInitError = consoleErrors.some(err => 
      err.includes('Cannot access') || 
      err.includes('before initialization') ||
      err.includes('ReferenceError')
    );
    
    expect(hasInitError).toBe(false);
    
    // Verify page still loads
    const eventTitle = page.locator('h1, h2, [class*="event-title"], [class*="title"]').first();
    await eventTitle.waitFor({ timeout: 5000 });
    
    const titleText = await eventTitle.textContent();
    expect(titleText).toBeTruthy();
    
    console.log('✅ Hard refresh on EventDetail page succeeded');
  });
});

