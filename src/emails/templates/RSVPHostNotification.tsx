/**
 * RSVP Host Notification Email Template
 */

import { getBaseEmailTemplate } from './base';

export function RSVPHostNotificationTemplate(data: {
  hostName: string;
  attendeeName: string;
  attendeeEmail: string;
  eventTitle: string;
  eventUrl?: string;
  attendeeProfileUrl?: string;
}): string {
  const content = `
    <h2 style="margin: 0 0 8px 0; color: #15383c; font-size: 24px; font-weight: bold;">New Attendee Has Joined</h2>
    <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 16px;">Hello ${data.hostName},</p>
    
    <div style="background-color: #f8fafb; padding: 24px; border-radius: 12px; margin-bottom: 24px;">
      <p style="margin: 0 0 12px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        <strong style="color: #15383c;">Event:</strong> ${data.eventTitle}
      </p>
    </div>
    
    <div style="background-color: #ffffff; padding: 24px; border-radius: 12px; margin-bottom: 24px; text-align: center;">
      ${data.attendeeProfileUrl ? `
      <img src="${data.attendeeProfileUrl}" alt="${data.attendeeName}" style="width: 80px; height: 80px; border-radius: 50%; margin-bottom: 16px; object-fit: cover;" />
      ` : ''}
      <h3 style="margin: 0 0 8px 0; color: #15383c; font-size: 20px; font-weight: bold;">${data.attendeeName}</h3>
      <p style="margin: 0; color: #6b7280; font-size: 14px;">
        <a href="mailto:${data.attendeeEmail}" style="color: #e35e25; text-decoration: none;">${data.attendeeEmail}</a>
      </p>
    </div>
  `;

  return getBaseEmailTemplate(content, 'View Event Dashboard', data.eventUrl || '#');
}

