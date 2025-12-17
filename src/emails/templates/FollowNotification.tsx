/**
 * Follow Notification Email Template
 * Modern liquid glass UI design
 */

import { getBaseEmailTemplate, getGlassPanel } from './base';

export function FollowNotificationTemplate(data: {
  userName: string;
  hostName: string;
  eventTitle: string;
  eventDescription?: string;
  eventUrl?: string;
  eventImageUrl?: string;
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
                <span style="display: inline-block; background: linear-gradient(135deg, rgba(99, 179, 237, 0.2) 0%, rgba(99, 179, 237, 0.1) 100%); border: 1px solid rgba(99, 179, 237, 0.3); border-radius: 50px; padding: 8px 16px; color: #7dd3fc; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px;">
                  🔔 New Event
                </span>
              </td>
            </tr>
          </table>
          <h1 style="margin: 0 0 12px 0; color: #ffffff; font-size: 24px; font-weight: 700; line-height: 1.3;">New Pop-up from Someone You Follow</h1>
          <p style="margin: 0; color: rgba(255, 255, 255, 0.6); font-size: 15px;">Hello ${data.userName},</p>
        </td>
      </tr>
    </table>
    
    <!-- Host announcement -->
    <table role="presentation" style="width: 100%; margin-bottom: 24px;">
      <tr>
        <td>
          <p style="margin: 0; color: rgba(255, 255, 255, 0.85); font-size: 16px; line-height: 1.6;">
            <span style="color: #f97316; font-weight: 600;">${data.hostName}</span> just created a new pop-up!
          </p>
        </td>
      </tr>
    </table>
    
    ${data.eventImageUrl ? `
    <!-- Event Image -->
    <table role="presentation" style="width: 100%; margin-bottom: 24px;">
      <tr>
        <td>
          <img src="${data.eventImageUrl}" alt="${data.eventTitle}" style="width: 100%; border-radius: 16px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.1);" />
        </td>
      </tr>
    </table>
    ` : ''}
    
    <!-- Event Details Glass Card -->
    ${getGlassPanel(`
      <h2 style="margin: 0 0 12px 0; color: #ffffff; font-size: 20px; font-weight: 600;">${data.eventTitle}</h2>
      ${data.eventDescription ? `
      <p style="margin: 0; color: rgba(255, 255, 255, 0.7); font-size: 15px; line-height: 1.7;">${data.eventDescription}</p>
      ` : ''}
    `, 'rgba(249, 115, 22, 0.25)')}
  `;

  return getBaseEmailTemplate(content, 'View Event & Reserve', data.eventUrl || '#');
}
