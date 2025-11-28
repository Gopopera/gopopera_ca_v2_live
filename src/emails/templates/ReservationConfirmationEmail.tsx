/**
 * Reservation Confirmation Email Template
 */

import { getBaseEmailTemplate } from './base';

export function ReservationConfirmationEmailTemplate(data: {
  userName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  reservationId: string;
  orderId: string;
  eventUrl?: string;
  eventImageUrl?: string;
  attendeeCount?: number;
  totalAmount?: number;
}): string {
  const content = `
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; width: 80px; height: 80px; background: linear-gradient(135deg, #e35e25 0%, #d14e1a 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <h2 style="margin: 0 0 8px 0; color: #15383c; font-size: 28px; font-weight: bold;">You're All Set! 🎉</h2>
      <p style="margin: 0; color: #6b7280; font-size: 16px;">Your reservation has been confirmed</p>
    </div>
    
    ${data.eventImageUrl ? `
    <div style="margin-bottom: 24px; text-align: center;">
      <img src="${data.eventImageUrl}" alt="${data.eventTitle}" style="width: 100%; max-width: 500px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);" />
    </div>
    ` : ''}
    
    <div style="background-color: #f8fafb; padding: 24px; border-radius: 12px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 16px 0; color: #15383c; font-size: 22px; font-weight: bold;">${data.eventTitle}</h3>
      
      <div style="margin-bottom: 16px;">
        <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Date & Time</p>
        <p style="margin: 0; color: #15383c; font-size: 16px; font-weight: 600;">${data.eventDate} • ${data.eventTime}</p>
      </div>
      
      <div style="margin-bottom: 16px;">
        <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Location</p>
        <p style="margin: 0; color: #15383c; font-size: 16px; font-weight: 600;">${data.eventLocation}</p>
      </div>
      
      <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 16px;">
        <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Reservation ID</p>
        <p style="margin: 0; color: #15383c; font-size: 18px; font-weight: bold; font-family: monospace;">${data.orderId}</p>
      </div>
      
      ${data.attendeeCount && data.attendeeCount > 1 ? `
      <div style="margin-top: 16px;">
        <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Attendees</p>
        <p style="margin: 0; color: #15383c; font-size: 16px; font-weight: 600;">${data.attendeeCount} ${data.attendeeCount === 1 ? 'person' : 'people'}</p>
      </div>
      ` : ''}
    </div>
    
    <div style="background-color: #fff7ed; border-left: 4px solid #e35e25; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
      <p style="margin: 0; color: #15383c; font-size: 14px; line-height: 1.6;">
        <strong style="color: #e35e25;">💡 Tip:</strong> Show your QR code at the event entrance for quick check-in! You can view your reservation details in the app.
      </p>
    </div>
  `;

  return getBaseEmailTemplate(content, 'View Reservation Details', data.eventUrl || '#');
}

