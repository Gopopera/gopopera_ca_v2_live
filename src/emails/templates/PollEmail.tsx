/**
 * Poll Email Template
 */

import { getBaseEmailTemplate } from './base';

export function PollEmailTemplate(data: {
  userName: string;
  eventTitle: string;
  pollQuestion: string;
  pollOptions?: string[];
  eventUrl?: string;
}): string {
  const content = `
    <h2 style="margin: 0 0 8px 0; color: #15383c; font-size: 24px; font-weight: bold;">New Poll in Your Pop-up</h2>
    <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 16px;">Hello ${data.userName},</p>
    
    <div style="background-color: #f8fafb; padding: 24px; border-radius: 12px; margin-bottom: 24px;">
      <p style="margin: 0 0 12px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        <strong style="color: #15383c;">Event:</strong> ${data.eventTitle}
      </p>
    </div>
    
    <div style="background-color: #ffffff; padding: 24px; border-left: 4px solid #e35e25; border-radius: 8px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 16px 0; color: #15383c; font-size: 20px; font-weight: bold;">${data.pollQuestion}</h3>
      ${data.pollOptions && data.pollOptions.length > 0 ? `
      <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 16px; line-height: 1.8;">
        ${data.pollOptions.map(option => `<li>${option}</li>`).join('')}
      </ul>
      ` : ''}
    </div>
    
    <p style="margin: 0; color: #6b7280; font-size: 14px; text-align: center;">Vote now in the event chat!</p>
  `;

  return getBaseEmailTemplate(content, 'View Event & Vote', data.eventUrl || '#');
}

