/**
 * RSVP Host Notification Email Template
 * Modern liquid glass UI design
 */

import { getBaseEmailTemplate, getGlassPanel, getInfoRow } from './base';

export function RSVPHostNotificationTemplate(data: {
  hostName: string;
  attendeeName: string;
  attendeeEmail: string;
  eventTitle: string;
  eventUrl?: string;
  attendeeProfileUrl?: string;
}): string {
  const content = `
    <!-- Header Section -->
    <table role="presentation" style="width: 100%; margin-bottom: 28px;">
      <tr>
        <td>
          <!-- Notification badge -->
          <table role="presentation" style="margin-bottom: 16px;">
            <tr>
              <td>
                <span style="display: inline-block; background: linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.1) 100%); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 50px; padding: 8px 16px; color: #34d399; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px;">
                  ✨ New Attendee
                </span>
              </td>
            </tr>
          </table>
          <h1 style="margin: 0 0 12px 0; color: #ffffff; font-size: 24px; font-weight: 700; line-height: 1.3;">Someone Just Joined Your Event!</h1>
          <p style="margin: 0; color: rgba(255, 255, 255, 0.6); font-size: 15px;">Hello ${data.hostName},</p>
        </td>
      </tr>
    </table>
    
    <!-- Event Info -->
    ${getGlassPanel(`
      ${getInfoRow('Event', data.eventTitle)}
    `)}
    
    <!-- Attendee Card -->
    ${getGlassPanel(`
      <table role="presentation" style="width: 100%;">
        <tr>
          <td align="center">
            ${data.attendeeProfileUrl ? `
            <img src="${data.attendeeProfileUrl}" alt="${data.attendeeName}" style="width: 72px; height: 72px; border-radius: 50%; margin-bottom: 16px; object-fit: cover; border: 2px solid rgba(255, 255, 255, 0.2); box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);" />
            ` : `
            <div style="width: 72px; height: 72px; border-radius: 50%; margin-bottom: 16px; background: linear-gradient(135deg, rgba(249, 115, 22, 0.3) 0%, rgba(249, 115, 22, 0.15) 100%); border: 2px solid rgba(249, 115, 22, 0.4); display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 28px; line-height: 72px; display: block; text-align: center;">👋</span>
            </div>
            `}
            <h3 style="margin: 0 0 8px 0; color: #ffffff; font-size: 20px; font-weight: 600;">${data.attendeeName}</h3>
            <p style="margin: 0;">
              <a href="mailto:${data.attendeeEmail}" style="color: #f97316; text-decoration: none; font-size: 14px;">${data.attendeeEmail}</a>
            </p>
          </td>
        </tr>
      </table>
    `, 'rgba(249, 115, 22, 0.2)')}
  `;

  return getBaseEmailTemplate(content, 'View Event Dashboard', data.eventUrl || '#');
}
