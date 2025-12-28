/**
 * Unit tests for event query helpers
 * These tests ensure consistency in how events are filtered by host
 */

import { describe, it, expect } from 'vitest';
import { filterEventsByHost, isEventVisible, getVisibleEvents } from '../utils/eventQueryHelpers';
import { Event } from '../types';

// Create a minimal mock event for testing
const createMockEvent = (overrides: Partial<Event>): Event => ({
  id: 'test-event-1',
  title: 'Test Event',
  description: 'A test event',
  city: 'Montreal',
  address: '123 Test St',
  date: '2025-01-15',
  time: '18:00',
  tags: ['test'],
  hostId: 'host-123',
  location: 'Montreal, 123 Test St',
  category: 'Community',
  price: 'Free',
  rating: 0,
  reviewCount: 0,
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe('filterEventsByHost', () => {
  it('should filter events by hostId (primary match)', () => {
    const events = [
      createMockEvent({ id: '1', hostId: 'host-a', hostName: 'Host A' }),
      createMockEvent({ id: '2', hostId: 'host-b', hostName: 'Host B' }),
      createMockEvent({ id: '3', hostId: 'host-a', hostName: 'Host A' }),
    ];

    const result = filterEventsByHost(events, 'host-a', 'Host A');
    
    expect(result).toHaveLength(2);
    expect(result.map(e => e.id)).toEqual(['1', '3']);
  });

  it('should fall back to hostName match when hostId is not available', () => {
    const events = [
      createMockEvent({ id: '1', hostId: '', hostName: 'Popera', host: 'Popera' }),
      createMockEvent({ id: '2', hostId: '', hostName: 'Other Host', host: 'Other Host' }),
      createMockEvent({ id: '3', hostId: '', hostName: 'Popera', host: 'Popera' }),
    ];

    const result = filterEventsByHost(events, null, 'Popera');
    
    expect(result).toHaveLength(2);
    expect(result.map(e => e.id)).toEqual(['1', '3']);
  });

  it('should fall back to host field match for backward compatibility', () => {
    const events = [
      createMockEvent({ id: '1', hostId: '', hostName: '', host: 'Legacy Host' }),
      createMockEvent({ id: '2', hostId: '', hostName: '', host: 'Other Host' }),
    ];

    const result = filterEventsByHost(events, null, 'Legacy Host');
    
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('should prioritize hostId over hostName', () => {
    const events = [
      createMockEvent({ id: '1', hostId: 'host-a', hostName: 'Wrong Name' }),
      createMockEvent({ id: '2', hostId: 'host-b', hostName: 'Host A' }),
    ];

    // When hostId matches, hostName doesn't need to match
    const result = filterEventsByHost(events, 'host-a', 'Host A');
    
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('should return empty array when no events match', () => {
    const events = [
      createMockEvent({ id: '1', hostId: 'host-a', hostName: 'Host A' }),
    ];

    const result = filterEventsByHost(events, 'host-z', 'Host Z');
    
    expect(result).toHaveLength(0);
  });

  // This is the key test - ensures no extra filtering happens
  it('should NOT filter by isOfficialLaunch or demoType', () => {
    const events = [
      createMockEvent({ id: '1', hostId: 'popera', hostName: 'Popera', isOfficialLaunch: true }),
      createMockEvent({ id: '2', hostId: 'popera', hostName: 'Popera', isOfficialLaunch: false }),
      createMockEvent({ id: '3', hostId: 'popera', hostName: 'Popera', demoType: 'city-launch' }),
      createMockEvent({ id: '4', hostId: 'popera', hostName: 'Popera' }), // No demoType or isOfficialLaunch
    ];

    const result = filterEventsByHost(events, 'popera', 'Popera');
    
    // ALL events from this host should be returned
    expect(result).toHaveLength(4);
    expect(result.map(e => e.id)).toEqual(['1', '2', '3', '4']);
  });
});

describe('isEventVisible', () => {
  it('should return true for events without isPublic or isDraft flags', () => {
    const event = createMockEvent({});
    expect(isEventVisible(event)).toBe(true);
  });

  it('should return false for explicitly private events', () => {
    const event = createMockEvent({}) as any;
    event.isPublic = false;
    expect(isEventVisible(event)).toBe(false);
  });

  it('should return false for draft events', () => {
    const event = createMockEvent({ isDraft: true });
    expect(isEventVisible(event)).toBe(false);
  });

  it('should return true for events with isPublic: true', () => {
    const event = createMockEvent({}) as any;
    event.isPublic = true;
    expect(isEventVisible(event)).toBe(true);
  });
});

describe('getVisibleEvents', () => {
  it('should filter out private and draft events', () => {
    const event1 = createMockEvent({ id: '1' });
    const event2 = createMockEvent({ id: '2', isDraft: true });
    const event3 = createMockEvent({ id: '3' }) as any;
    event3.isPublic = false;
    const event4 = createMockEvent({ id: '4' });

    const result = getVisibleEvents([event1, event2, event3, event4]);
    
    expect(result).toHaveLength(2);
    expect(result.map(e => e.id)).toEqual(['1', '4']);
  });
});

