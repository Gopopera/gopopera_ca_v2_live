/**
 * Stripe Payment Helpers
 * Utility functions for payment calculations and event type checks
 */

import { Event } from '../types';

// Platform fee is 10% including Stripe fees
// Stripe charges ~2.9% + $0.30 per transaction
// We calculate 10% of total, which covers our platform fee and Stripe fees
const PLATFORM_FEE_PERCENTAGE = 0.10; // 10%

/**
 * Calculate platform fee (10% of total amount, including Stripe fees)
 * @param amount Total amount in cents
 * @returns Platform fee in cents
 */
export function calculatePlatformFee(amount: number): number {
  return Math.round(amount * PLATFORM_FEE_PERCENTAGE);
}

/**
 * Calculate host payout amount
 * @param amount Total amount in cents
 * @param platformFee Platform fee in cents
 * @returns Host payout amount in cents
 */
export function calculateHostPayout(amount: number, platformFee: number): number {
  return amount - platformFee;
}

/**
 * Check if event is recurring (weekly or monthly)
 * @param event Event object
 * @returns True if event is recurring
 */
export function isRecurringEvent(event: Event): boolean {
  return event.sessionFrequency === 'weekly' || event.sessionFrequency === 'monthly';
}

/**
 * Check if event has a fee (checks both new and legacy payment fields)
 * @param event Event object
 * @returns True if event charges a fee
 */
export function hasEventFee(event: Event): boolean {
  // Check new payment fields first
  if (event.hasFee === true && (event.feeAmount ?? 0) > 0) {
    return true;
  }
  // Also check legacy price field for backwards compatibility
  if (event.price && event.price !== 'Free' && event.price !== '' && event.price !== '$0' && event.price !== '0') {
    return true;
  }
  return false;
}

/**
 * Get the fee amount in cents (from either new or legacy fields)
 * @param event Event object
 * @returns Fee amount in cents, or 0 if free
 */
export function getEventFeeAmount(event: Event): number {
  // Check new payment fields first
  if (event.hasFee === true && (event.feeAmount ?? 0) > 0) {
    return event.feeAmount!;
  }
  // Convert legacy price field to cents
  if (event.price && event.price !== 'Free' && event.price !== '' && event.price !== '$0' && event.price !== '0') {
    // Parse the price string (e.g., "5", "$5", "5.00")
    const priceStr = event.price.toString().replace(/[$,]/g, '');
    const priceNum = parseFloat(priceStr);
    if (!isNaN(priceNum) && priceNum > 0) {
      return Math.round(priceNum * 100); // Convert dollars to cents
    }
  }
  return 0;
}

/**
 * Get next event date for recurring events
 * @param event Event object
 * @returns Next event date or null if not recurring or invalid
 */
export function getNextEventDate(event: Event): Date | null {
  if (!isRecurringEvent(event)) {
    return null;
  }

  try {
    const currentDate = new Date(event.date);
    if (isNaN(currentDate.getTime())) {
      return null;
    }

    const nextDate = new Date(currentDate);

    if (event.sessionFrequency === 'weekly') {
      // Add 7 days
      nextDate.setDate(nextDate.getDate() + 7);
    } else if (event.sessionFrequency === 'monthly') {
      // Add 1 month
      nextDate.setMonth(nextDate.getMonth() + 1);
    }

    return nextDate;
  } catch (error) {
    console.error('Error calculating next event date:', error);
    return null;
  }

}

/**
 * Format amount for display (cents to dollars)
 * @param amount Amount in cents
 * @param currency Currency code (default: 'CAD')
 * @returns Formatted string
 */
export function formatPaymentAmount(amount: number, currency: string = 'CAD'): string {
  const dollars = amount / 100;
  const currencySymbol = currency === 'USD' ? '$' : '$'; // Both use $, but you could add more
  return `${currencySymbol}${dollars.toFixed(2)} ${currency}`;
}

/**
 * Convert dollars to cents
 * @param dollars Amount in dollars
 * @returns Amount in cents
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Convert cents to dollars
 * @param cents Amount in cents
 * @returns Amount in dollars
 */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

/**
 * Calculate total amount for reservation (including attendee count)
 * @param feeAmount Fee per attendee in cents
 * @param attendeeCount Number of attendees
 * @returns Total amount in cents
 */
export function calculateTotalAmount(feeAmount: number, attendeeCount: number = 1): number {
  return feeAmount * attendeeCount;
}

