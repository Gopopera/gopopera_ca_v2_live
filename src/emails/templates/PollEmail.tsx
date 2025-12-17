/**
 * Poll Email Template
 * Modern liquid glass UI design
 */

import { getBaseEmailTemplate, getGlassPanel, getInfoRow } from './base';

export function PollEmailTemplate(data: {
  userName: string;
  eventTitle: string;
  pollQuestion: string;
  pollOptions?: string[];
  eventUrl?: string;
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
                <span style="display: inline-block; background: linear-gradient(135deg, rgba(236, 72, 153, 0.2) 0%, rgba(236, 72, 153, 0.1) 100%); border: 1px solid rgba(236, 72, 153, 0.3); border-radius: 50px; padding: 8px 16px; color: #f472b6; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px;">
                  📊 New Poll
                </span>
              </td>
            </tr>
          </table>
          <h1 style="margin: 0 0 12px 0; color: #ffffff; font-size: 24px; font-weight: 700; line-height: 1.3;">New Poll in Your Pop-up</h1>
          <p style="margin: 0; color: rgba(255, 255, 255, 0.6); font-size: 15px;">Hello ${data.userName},</p>
        </td>
      </tr>
    </table>
    
    <!-- Event Info -->
    ${getGlassPanel(`
      ${getInfoRow('Event', data.eventTitle)}
    `)}
    
    <!-- Poll Question & Options -->
    ${getGlassPanel(`
      <h2 style="margin: 0 0 20px 0; color: #ffffff; font-size: 20px; font-weight: 600;">${data.pollQuestion}</h2>
      ${data.pollOptions && data.pollOptions.length > 0 ? `
      <table role="presentation" style="width: 100%;">
        ${data.pollOptions.map((option, index) => `
        <tr>
          <td style="padding: 8px 0;">
            <table role="presentation" style="width: 100%; background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 10px;">
              <tr>
                <td style="padding: 14px 18px;">
                  <span style="color: rgba(255, 255, 255, 0.4); font-size: 13px; font-weight: 600; margin-right: 12px;">${String.fromCharCode(65 + index)}</span>
                  <span style="color: rgba(255, 255, 255, 0.9); font-size: 15px;">${option}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        `).join('')}
      </table>
      ` : ''}
    `, 'rgba(236, 72, 153, 0.25)')}
    
    <!-- Call to action hint -->
    <table role="presentation" style="width: 100%; margin-top: 20px;">
      <tr>
        <td align="center">
          <p style="margin: 0; color: rgba(255, 255, 255, 0.5); font-size: 14px;">Vote now in the event chat!</p>
        </td>
      </tr>
    </table>
  `;

  return getBaseEmailTemplate(content, 'View Event & Vote', data.eventUrl || '#');
}
