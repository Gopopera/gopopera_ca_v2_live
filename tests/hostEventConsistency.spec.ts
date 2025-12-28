/**
 * Playwright E2E smoke test for Host Event Consistency
 * 
 * This test verifies that the number of events shown for a host
 * in the Explore page matches the Host Profile Events tab.
 * 
 * Bug prevented: HostProfile showed 0 events while Explore showed 2
 * for the same host due to extra filtering.
 */

import { test, expect } from '@playwright/test';

test.describe('Host Event Consistency', () => {
  test('events shown in Explore match events on Host Profile', async ({ page }) => {
    // Navigate to Explore page
    await page.goto('/explore');
    
    // Wait for events to load
    await page.waitForLoadState('networkidle');
    
    // Wait for at least one event card to appear
    const eventCards = page.locator('[class*="event-card"], [data-testid="event-card"], .event-card');
    const cardCount = await eventCards.count();
    
    // Skip test if no events are present
    if (cardCount === 0) {
      test.skip(true, 'No events available to test');
      return;
    }
    
    // Find the first event card's host name
    // Look for host name elements (they typically have "by" prefix or are clickable links)
    const firstCard = eventCards.first();
    
    // Get host name from the event card
    // The host name is typically displayed as a clickable element
    const hostElement = firstCard.locator('text=/hosted by|by/i').first()
      .or(firstCard.locator('[class*="host"]').first())
      .or(firstCard.locator('a:has-text("Popera")').first());
    
    // Try to get the host name text
    let hostName = '';
    try {
      const hostText = await hostElement.textContent({ timeout: 5000 });
      hostName = hostText?.replace(/hosted by|by/i, '').trim() || '';
    } catch {
      // If we can't find a host element, skip the test
      test.skip(true, 'Could not find host name element in event card');
      return;
    }
    
    if (!hostName) {
      test.skip(true, 'Host name is empty');
      return;
    }
    
    // Count events by this host in Explore
    const hostEventCards = page.locator(`[class*="event-card"]:has-text("${hostName}"), [data-testid="event-card"]:has-text("${hostName}")`);
    const hostEventsInExplore = await hostEventCards.count();
    
    console.log(`Found ${hostEventsInExplore} events for host "${hostName}" in Explore`);
    
    // Click on host name to navigate to host profile
    await hostElement.click();
    
    // Wait for host profile to load
    await page.waitForLoadState('networkidle');
    
    // Look for the Events tab in host profile
    const eventsTab = page.locator('button:has-text("Events")').first();
    await eventsTab.waitFor({ timeout: 5000 });
    
    // Get the event count from the tab label (e.g., "Events (2)")
    const eventsTabText = await eventsTab.textContent();
    const countMatch = eventsTabText?.match(/Events\s*\((\d+)\)/i);
    const hostEventsInProfile = countMatch ? parseInt(countMatch[1], 10) : -1;
    
    console.log(`Host Profile shows ${hostEventsInProfile} events for "${hostName}"`);
    
    // The counts should match
    expect(hostEventsInProfile).toBe(hostEventsInExplore);
    
    // Also verify that clicking the Events tab shows the correct number of cards
    await eventsTab.click();
    await page.waitForTimeout(500); // Allow tab content to render
    
    const profileEventCards = page.locator('[class*="event-card"], [data-testid="event-card"]');
    const actualProfileCards = await profileEventCards.count();
    
    // If tab says "Events (X)", there should be X cards visible
    if (hostEventsInProfile >= 0) {
      expect(actualProfileCards).toBe(hostEventsInProfile);
    }
  });

  test('Popera host profile shows all Popera events', async ({ page }) => {
    // Navigate directly to Popera host profile
    await page.goto('/host/Popera');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Get event count from Events tab
    const eventsTab = page.locator('button:has-text("Events")').first();
    
    try {
      await eventsTab.waitFor({ timeout: 5000 });
    } catch {
      // Host profile might not be accessible
      test.skip(true, 'Could not load Popera host profile');
      return;
    }
    
    const eventsTabText = await eventsTab.textContent();
    const countMatch = eventsTabText?.match(/Events\s*\((\d+)\)/i);
    const profileEventCount = countMatch ? parseInt(countMatch[1], 10) : 0;
    
    // Now check Explore page for Popera events
    await page.goto('/explore');
    await page.waitForLoadState('networkidle');
    
    // Count Popera events in Explore
    const poperaEvents = page.locator('[class*="event-card"]:has-text("Popera"), [data-testid="event-card"]:has-text("Popera")');
    const exploreEventCount = await poperaEvents.count();
    
    console.log(`Popera: Explore shows ${exploreEventCount}, Profile shows ${profileEventCount}`);
    
    // They should be equal
    expect(profileEventCount).toBe(exploreEventCount);
  });
});

