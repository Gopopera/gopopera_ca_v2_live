/**
 * Reservation Confirmation Email Template
 * Modern liquid glass UI design
 */

import { getBaseEmailTemplate, getGlassPanel, getInfoRow } from './base';

/**
 * Format currency amount for email display
 */
function formatEmailCurrency(cents: number, currency: string = 'cad'): string {
  const dollars = cents / 100;
  const currencyUpper = currency.toUpperCase();
  const symbol = currencyUpper === 'EUR' ? '€' : currencyUpper === 'GBP' ? '£' : '$';
  return `${symbol}${dollars.toFixed(2)} ${currencyUpper}`;
}

export function ReservationConfirmationEmailTemplate(data: {
  userName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  reservationId: string;
  orderId: string;
  eventUrl?: string;
  ticketUrl?: string;
  eventImageUrl?: string;
  attendeeCount?: number;
  totalAmount?: number;
  currency?: string;
}): string {
  // Use ticketUrl if provided, otherwise fall back to eventUrl
  const ctaUrl = data.ticketUrl || data.eventUrl || '#';
  
  const content = `
    <!-- Success Header -->
    <table role="presentation" style="width: 100%; margin-bottom: 32px;">
      <tr>
        <td align="center">
          <h1 style="margin: 0 0 8px 0; color: #ffffff; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">You're All Set! 🎉</h1>
          <p style="margin: 0; color: rgba(255, 255, 255, 0.6); font-size: 15px;">Your reservation has been confirmed</p>
        </td>
      </tr>
    </table>
    
    ${data.eventImageUrl ? `
    <!-- Event Image -->
    <table role="presentation" style="width: 100%; margin-bottom: 24px;">
      <tr>
        <td align="center">
          <img src="${data.eventImageUrl}" alt="${data.eventTitle}" style="width: 100%; max-width: 100%; border-radius: 16px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.1);" />
        </td>
      </tr>
    </table>
    ` : ''}
    
    <!-- Event Details Glass Card -->
    ${getGlassPanel(`
      <h2 style="margin: 0 0 24px 0; color: #ffffff; font-size: 20px; font-weight: 600;">${data.eventTitle}</h2>
      
      ${getInfoRow('Date & Time', `${data.eventDate} • ${data.eventTime}`)}
      ${getInfoRow('Location', data.eventLocation)}
      
      <table role="presentation" style="width: 100%; border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 16px; margin-top: 8px;">
        <tr>
          <td>
            ${getInfoRow('Reservation ID', `<span style="font-family: 'SF Mono', Monaco, 'Courier New', monospace; background: rgba(255, 255, 255, 0.1); padding: 6px 12px; border-radius: 8px; font-size: 15px;">#${data.orderId}</span>`)}
          </td>
        </tr>
      </table>
      
      ${data.attendeeCount && data.attendeeCount > 1 ? `
      <table role="presentation" style="width: 100%; margin-top: 8px;">
        <tr>
          <td>
            ${getInfoRow('Attendees', `${data.attendeeCount} ${data.attendeeCount === 1 ? 'person' : 'people'}`)}
          </td>
        </tr>
      </table>
      ` : ''}
      
      ${data.totalAmount && data.totalAmount > 0 ? `
      <table role="presentation" style="width: 100%; margin-top: 8px;">
        <tr>
          <td>
            ${getInfoRow('Transaction', formatEmailCurrency(data.totalAmount, data.currency))}
          </td>
        </tr>
      </table>
      ` : ''}
    `)}
  `;

  return getBaseEmailTemplate(content, 'View Your Ticket', ctaUrl);
}
