/**
 * Reservation Confirmation Email Template
 * Clean light theme for readability and print-friendliness
 */

import { getBaseEmailTemplateLight, getGlassPanelLight, getInfoRowLight } from './emailTemplates.js';

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
  pricingType?: 'free' | 'online' | 'door'; // Pricing type: free, online (Stripe), or door
  claimUrl?: string | null;
}): string {
  // Use ticketUrl if provided, otherwise fall back to eventUrl
  const ctaUrl = data.ticketUrl || data.eventUrl || '#';

  const content = `
    <!-- Success Header -->
    <table role="presentation" style="width: 100%; margin-bottom: 32px;">
      <tr>
        <td align="center">
          <h1 style="margin: 0 0 8px 0; color: #15383c; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">You're All Set! 🎉</h1>
          <p style="margin: 0; color: rgba(21, 56, 60, 0.6); font-size: 15px;">Your reservation has been confirmed</p>
        </td>
      </tr>
    </table>
    
    ${data.eventImageUrl ? `
    <!-- Event Image -->
    <table role="presentation" style="width: 100%; margin-bottom: 24px;">
      <tr>
        <td align="center">
          <img src="${data.eventImageUrl}" alt="${data.eventTitle}" style="width: 100%; max-width: 100%; border-radius: 16px; box-shadow: 0 4px 16px rgba(21, 56, 60, 0.1); border: 1px solid #e5e7eb;" />
        </td>
      </tr>
    </table>
    ` : ''}
    
    <!-- Event Details Card -->
    ${getGlassPanelLight(`
      <h2 style="margin: 0 0 24px 0; color: #15383c; font-size: 20px; font-weight: 600;">${data.eventTitle}</h2>
      
      ${getInfoRowLight('Date & Time', `${data.eventDate} • ${data.eventTime}`)}
      ${getInfoRowLight('Location', data.eventLocation)}
      
      <table role="presentation" style="width: 100%; border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 8px;">
        <tr>
          <td>
            ${getInfoRowLight('Reservation ID', `<span style="font-family: 'SF Mono', Monaco, 'Courier New', monospace; background: rgba(21, 56, 60, 0.08); padding: 6px 12px; border-radius: 8px; font-size: 15px; color: #15383c;">#${data.orderId}</span>`)}
          </td>
        </tr>
      </table>
      
      ${data.attendeeCount && data.attendeeCount > 1 ? `
      <table role="presentation" style="width: 100%; margin-top: 8px;">
        <tr>
          <td>
            ${getInfoRowLight('Attendees', `${data.attendeeCount} ${data.attendeeCount === 1 ? 'person' : 'people'}`)}
          </td>
        </tr>
      </table>
      ` : ''}
      
      ${data.pricingType === 'door' && data.totalAmount && data.totalAmount > 0 ? `
      <table role="presentation" style="width: 100%; margin-top: 8px;">
        <tr>
          <td>
            ${getInfoRowLight('Payment', `<span style="color: #d97706; font-weight: 600;">Pay at the door: ${formatEmailCurrency(data.totalAmount, data.currency)}</span>`)}
          </td>
        </tr>
      </table>
      <table role="presentation" style="width: 100%; margin-top: 4px;">
        <tr>
          <td>
            <p style="margin: 0; color: rgba(21, 56, 60, 0.6); font-size: 13px;">
              💡 Please bring cash or your preferred payment method to pay the host directly at the event.
            </p>
          </td>
        </tr>
      </table>
      ` : data.totalAmount && data.totalAmount > 0 ? `
      <table role="presentation" style="width: 100%; margin-top: 8px;">
        <tr>
          <td>
            ${getInfoRowLight('Transaction', formatEmailCurrency(data.totalAmount, data.currency))}
          </td>
        </tr>
      </table>
      ` : ''}
    `)}

    ${data.claimUrl ? `
    <table role="presentation" style="width: 100%; margin-top: 24px;">
      <tr>
        <td align="center">
          <a href="${data.claimUrl}" style="display: inline-block; background: rgba(21, 56, 60, 0.08); color: #15383c; text-decoration: none; padding: 14px 28px; border-radius: 50px; font-weight: 600; font-size: 14px; border: 1px solid #e5e7eb;">
            Claim your account / Sign in
          </a>
        </td>
      </tr>
    </table>
    ` : ''}
  `;

  return getBaseEmailTemplateLight(content, 'View Your Ticket', ctaUrl);
}

