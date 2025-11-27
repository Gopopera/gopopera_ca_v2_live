/**
 * Follow Notification Email Template
 */

import { getBaseEmailTemplate } from './base';

export function FollowNotificationTemplate(data: {
  userName: string;
  hostName: string;
  eventTitle: string;
  eventDescription?: string;
  eventUrl?: string;
  eventImageUrl?: string;
}): string {
  const content = `
    <h2 style="margin: 0 0 8px 0; color: #15383c; font-size: 24px; font-weight: bold;">New Pop-up from Someone You Follow</h2>
    <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 16px;">Hello ${data.userName},</p>
    
    <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
      <strong style="color: #15383c;">${data.hostName}</strong> just created a new pop-up!
    </p>
    
    ${data.eventImageUrl ? `
    <div style="margin-bottom: 24px; text-align: center;">
      <img src="${data.eventImageUrl}" alt="${data.eventTitle}" style="max-width: 100%; height: auto; border-radius: 12px;" />
    </div>
    ` : ''}
    
    <div style="background-color: #ffffff; padding: 24px; border-left: 4px solid #e35e25; border-radius: 8px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 12px 0; color: #15383c; font-size: 20px; font-weight: bold;">${data.eventTitle}</h3>
      ${data.eventDescription ? `
      <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.8;">${data.eventDescription}</p>
      ` : ''}
    </div>
  `;

  return getBaseEmailTemplate(content, 'View Event & Reserve', data.eventUrl || '#');
}

