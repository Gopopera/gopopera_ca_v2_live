/**
 * Stripe Payment Helpers
 * Utility functions for payment calculations and event type checks
 * EU-compatible: supports EUR and proper currency formatting
 */

import { Event } from '../types';

// 2026 PROMOTIONAL PERIOD: Popera takes NO platform fee
// Hosts only pay Stripe processing fees:
// - Canada/US: 2.9% + $0.30 per transaction
// - Europe (EEA): 1.5% + €0.25 (EU cards) / 2.5% + €0.25 (international cards)
const PLATFORM_FEE_PERCENTAGE = 0; // 0% - 2026 Promo: No Popera fee

/**
 * Calculate platform fee (0% during 2026 promotional period)
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
    // Parse the price string (e.g., "5", "$5", "5.00", "€5")
    const priceStr = event.price.toString().replace(/[$€£,]/g, '');
    const priceNum = parseFloat(priceStr);
    if (!isNaN(priceNum) && priceNum > 0) {
      return Math.round(priceNum * 100); // Convert dollars to cents
    }
  }
  return 0;
}

/**
 * Get the currency for an event
 * @param event Event object
 * @returns Currency code in lowercase (e.g., "cad", "eur")
 */
export function getEventCurrency(event: Event): string {
  return (event.currency || 'cad').toLowerCase();
}

/**
 * Pricing type for events
 * - free: no charge
 * - online: pay via Stripe
 * - door: pay at the door (in person)
 */
export type PricingType = 'free' | 'online' | 'door';

/**
 * Get the pricing type for an event (backward compatible)
 * - If event.pricingType is set, use it directly
 * - If hasFee/feeAmount is set, it's "online" (legacy paid events)
 * - If price is set and not "Free", it's "online" (legacy)
 * - Otherwise, it's "free"
 * @param event Event object
 * @returns Pricing type: 'free' | 'online' | 'door'
 */
export function getEventPricingType(event: Event): PricingType {
  // Use explicit pricingType if set
  if (event.pricingType && ['free', 'online', 'door'].includes(event.pricingType)) {
    return event.pricingType;
  }
  
  // Backward compatibility: derive from legacy fields
  if (hasEventFee(event)) {
    return 'online'; // Legacy paid events default to online
  }
  
  return 'free';
}

/**
 * Format event price for display based on pricing type
 * @param event Event object
 * @param showPricingMode Whether to include the pricing mode (e.g., "Pay at the door:")
 * @returns Formatted price string
 */
export function formatEventPriceDisplay(event: Event, showPricingMode: boolean = false): string {
  const pricingType = getEventPricingType(event);
  const currency = getEventCurrency(event);
  const amountCents = getEventFeeAmount(event);
  
  if (pricingType === 'free') {
    return 'Free';
  }
  
  const formattedAmount = formatPaymentAmount(amountCents, currency);
  
  if (!showPricingMode) {
    return formattedAmount;
  }
  
  if (pricingType === 'door') {
    return `Pay at the door: ${formattedAmount}`;
  }
  
  return formattedAmount; // Online payment - no prefix needed
}

/**
 * Check if event requires online payment (Stripe)
 * @param event Event object
 * @returns True if payment happens via Stripe
 */
export function requiresOnlinePayment(event: Event): boolean {
  return getEventPricingType(event) === 'online';
}

/**
 * Check if event is pay-at-door
 * @param event Event object
 * @returns True if payment happens in person
 */
export function isPayAtDoor(event: Event): boolean {
  return getEventPricingType(event) === 'door';
}

/**
 * Check if event is completely free
 * @param event Event object
 * @returns True if event has no charge
 */
export function isEventFree(event: Event): boolean {
  return getEventPricingType(event) === 'free';
}

/**
 * STRIPE GATING GUARD
 * Use this before calling any Stripe API function to prevent accidental charges for door events.
 * Logs an error and returns false if the event is pay-at-door.
 * 
 * @param event Event object
 * @param callerContext Context string for logging (e.g., "PaymentModal.handleSubmit")
 * @returns True if Stripe call is allowed, false if blocked
 */
export function assertStripeAllowed(event: Event, callerContext: string): boolean {
  const pricingType = getEventPricingType(event);
  
  if (pricingType === 'door') {
    console.error(`[STRIPE_GUARD] ❌ BLOCKED: Stripe call attempted for pay-at-door event!`, {
      callerContext,
      eventId: event?.id,
      pricingType,
      eventTitle: event?.title,
    });
    return false;
  }
  
  if (pricingType === 'free') {
    console.warn(`[STRIPE_GUARD] ⚠️ Warning: Stripe call for free event`, {
      callerContext,
      eventId: event?.id,
      pricingType,
    });
    // Allow but warn - some flows might use Stripe for tips/donations on free events
    return true;
  }
  
  return true; // 'online' pricing type - Stripe allowed
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
 * Get appropriate locale for a currency
 */
function getCurrencyLocale(currency: string): string {
  switch (currency.toUpperCase()) {
    case 'EUR':
      return 'de-DE'; // Euro formatting with comma decimal
    case 'GBP':
      return 'en-GB';
    case 'USD':
      return 'en-US';
    case 'CAD':
    default:
      return 'en-CA';
  }
}

/**
 * Get currency symbol fallback
 */
function getCurrencySymbol(currency: string): string {
  switch (currency.toUpperCase()) {
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    case 'USD':
    case 'CAD':
    default:
      return '$';
  }
}

/**
 * Format amount for display using Intl.NumberFormat
 * @param amount Amount in cents
 * @param currency Currency code (default: 'cad')
 * @param locale Optional locale for formatting (auto-detected from currency if not provided)
 * @returns Formatted currency string (e.g., "$10.00 CAD", "€10,00 EUR")
 */
export function formatPaymentAmount(
  amount: number, 
  currency: string = 'cad',
  locale?: string
): string {
  const dollars = amount / 100;
  const currencyUpper = currency.toUpperCase();
  
  // Determine locale based on currency if not provided
  const formatLocale = locale || getCurrencyLocale(currencyUpper);
  
  try {
    const formatted = new Intl.NumberFormat(formatLocale, {
      style: 'currency',
      currency: currencyUpper,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(dollars);
    
    // Append currency code for clarity (e.g., "$10.00 CAD")
    return `${formatted} ${currencyUpper}`;
  } catch (error) {
    // Fallback for unsupported currencies
    const symbol = getCurrencySymbol(currencyUpper);
    return `${symbol}${dollars.toFixed(2)} ${currencyUpper}`;
  }
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
