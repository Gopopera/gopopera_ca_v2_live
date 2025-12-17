/**
 * Announcement Email Template
 * Modern liquid glass UI design
 */

import { getBaseEmailTemplate, getGlassPanel, getInfoRow } from './base';

export function AnnouncementEmailTemplate(data: {
  userName: string;
  eventTitle: string;
  announcementTitle: string;
  announcementMessage: string;
  eventUrl?: string;
  imageUrl?: string;
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
                <span style="display: inline-block; background: linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(168, 85, 247, 0.1) 100%); border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 50px; padding: 8px 16px; color: #c084fc; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px;">
                  📢 Announcement
                </span>
              </td>
            </tr>
          </table>
          <h1 style="margin: 0 0 12px 0; color: #ffffff; font-size: 24px; font-weight: 700; line-height: 1.3;">New Announcement</h1>
          <p style="margin: 0; color: rgba(255, 255, 255, 0.6); font-size: 15px;">Hello ${data.userName},</p>
        </td>
      </tr>
    </table>
    
    <!-- Event Info -->
    ${getGlassPanel(`
      ${getInfoRow('Event', data.eventTitle)}
    `)}
    
    ${data.imageUrl ? `
    <!-- Announcement Image -->
    <table role="presentation" style="width: 100%; margin-bottom: 24px;">
      <tr>
        <td>
          <img src="${data.imageUrl}" alt="${data.announcementTitle}" style="width: 100%; border-radius: 16px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.1);" />
        </td>
      </tr>
    </table>
    ` : ''}
    
    <!-- Announcement Content -->
    ${getGlassPanel(`
      <h2 style="margin: 0 0 16px 0; color: #ffffff; font-size: 20px; font-weight: 600;">${data.announcementTitle}</h2>
      <p style="margin: 0; color: rgba(255, 255, 255, 0.8); font-size: 15px; line-height: 1.8; white-space: pre-wrap;">${data.announcementMessage}</p>
    `, 'rgba(168, 85, 247, 0.25)')}
  `;

  return getBaseEmailTemplate(content, 'View Event', data.eventUrl || '#');
}
