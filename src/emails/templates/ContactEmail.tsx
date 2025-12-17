/**
 * Contact Form Email Template
 * Modern liquid glass UI design
 */

import { getBaseEmailTemplate, getGlassPanel, getInfoRow } from './base';

export function ContactEmailTemplate(data: {
  name: string;
  email: string;
  message: string;
  timestamp: string;
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
                <span style="display: inline-block; background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.1) 100%); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 50px; padding: 8px 16px; color: #60a5fa; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px;">
                  ✉️ Contact Form
                </span>
              </td>
            </tr>
          </table>
          <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; line-height: 1.3;">New Contact Form Submission</h1>
        </td>
      </tr>
    </table>
    
    <!-- Contact Details -->
    ${getGlassPanel(`
      ${getInfoRow('Name', data.name)}
      <table role="presentation" style="width: 100%; margin-bottom: 16px;">
        <tr>
          <td>
            <p style="margin: 0 0 4px 0; color: rgba(255, 255, 255, 0.5); font-size: 11px; text-transform: uppercase; letter-spacing: 1.2px; font-weight: 600;">Email</p>
            <p style="margin: 0;"><a href="mailto:${data.email}" style="color: #f97316; text-decoration: none; font-size: 16px;">${data.email}</a></p>
          </td>
        </tr>
      </table>
      ${getInfoRow('Submitted', data.timestamp)}
    `)}
    
    <!-- Message Content -->
    ${getGlassPanel(`
      <h3 style="margin: 0 0 16px 0; color: rgba(255, 255, 255, 0.5); font-size: 11px; text-transform: uppercase; letter-spacing: 1.2px; font-weight: 600;">Message</h3>
      <p style="margin: 0; color: rgba(255, 255, 255, 0.9); font-size: 15px; line-height: 1.8; white-space: pre-wrap;">${data.message}</p>
    `, 'rgba(59, 130, 246, 0.25)')}
  `;

  return getBaseEmailTemplate(content);
}
