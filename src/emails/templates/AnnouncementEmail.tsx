/**
 * Announcement Email Template
 */

import { getBaseEmailTemplate } from './base';

export function AnnouncementEmailTemplate(data: {
  userName: string;
  eventTitle: string;
  announcementTitle: string;
  announcementMessage: string;
  eventUrl?: string;
  imageUrl?: string;
}): string {
  const content = `
    <h2 style="margin: 0 0 8px 0; color: #15383c; font-size: 24px; font-weight: bold;">New Announcement</h2>
    <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 16px;">Hello ${data.userName},</p>
    
    <div style="background-color: #f8fafb; padding: 24px; border-radius: 12px; margin-bottom: 24px;">
      <p style="margin: 0 0 12px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        <strong style="color: #15383c;">Event:</strong> ${data.eventTitle}
      </p>
    </div>
    
    ${data.imageUrl ? `
    <div style="margin-bottom: 24px; text-align: center;">
      <img src="${data.imageUrl}" alt="${data.announcementTitle}" style="max-width: 100%; height: auto; border-radius: 12px;" />
    </div>
    ` : ''}
    
    <div style="background-color: #ffffff; padding: 24px; border-left: 4px solid #e35e25; border-radius: 8px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 16px 0; color: #15383c; font-size: 20px; font-weight: bold;">${data.announcementTitle}</h3>
      <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.8; white-space: pre-wrap;">${data.announcementMessage}</p>
    </div>
  `;

  return getBaseEmailTemplate(content, 'View Event', data.eventUrl || '#');
}

