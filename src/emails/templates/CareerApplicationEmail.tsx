/**
 * Career Application Email Template
 * Modern liquid glass UI design
 */

import { getBaseEmailTemplate, getGlassPanel, getInfoRow } from './base';

export function CareerApplicationEmailTemplate(data: {
  name: string;
  email: string;
  message: string;
  timestamp: string;
  hasResume: boolean;
  fileName?: string;
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
                  💼 New Application
                </span>
              </td>
            </tr>
          </table>
          <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; line-height: 1.3;">New Career Application</h1>
        </td>
      </tr>
    </table>
    
    <!-- Applicant Details -->
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
      ${data.hasResume ? `
      <table role="presentation" style="width: 100%; margin-top: 8px;">
        <tr>
          <td>
            <table role="presentation" style="background: linear-gradient(135deg, rgba(249, 115, 22, 0.15) 0%, rgba(249, 115, 22, 0.08) 100%); border: 1px solid rgba(249, 115, 22, 0.25); border-radius: 10px; padding: 12px 16px;">
              <tr>
                <td>
                  <span style="color: rgba(255, 255, 255, 0.5); font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">📎 Resume</span>
                  <span style="color: #f97316; font-size: 14px; margin-left: 8px; font-weight: 500;">${data.fileName || 'Attached'}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      ` : ''}
    `)}
    
    <!-- Application Message -->
    ${getGlassPanel(`
      <h3 style="margin: 0 0 16px 0; color: rgba(255, 255, 255, 0.5); font-size: 11px; text-transform: uppercase; letter-spacing: 1.2px; font-weight: 600;">Application / Role Interest</h3>
      <p style="margin: 0; color: rgba(255, 255, 255, 0.9); font-size: 15px; line-height: 1.8; white-space: pre-wrap;">${data.message}</p>
    `, 'rgba(16, 185, 129, 0.25)')}
  `;

  return getBaseEmailTemplate(content);
}
