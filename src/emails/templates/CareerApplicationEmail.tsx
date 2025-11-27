/**
 * Career Application Email Template
 */

import { getBaseEmailTemplate } from './base';

export function CareerApplicationEmailTemplate(data: {
  name: string;
  email: string;
  message: string;
  timestamp: string;
  hasResume: boolean;
  fileName?: string;
}): string {
  const content = `
    <h2 style="margin: 0 0 24px 0; color: #15383c; font-size: 24px; font-weight: bold;">New Career Application</h2>
    
    <div style="background-color: #f8fafb; padding: 24px; border-radius: 12px; margin-bottom: 24px;">
      <p style="margin: 0 0 12px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        <strong style="color: #15383c;">Name:</strong> ${data.name}
      </p>
      <p style="margin: 0 0 12px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        <strong style="color: #15383c;">Email:</strong> <a href="mailto:${data.email}" style="color: #e35e25; text-decoration: none;">${data.email}</a>
      </p>
      <p style="margin: 0 0 12px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        <strong style="color: #15383c;">Submitted:</strong> ${data.timestamp}
      </p>
      ${data.hasResume ? `
      <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6;">
        <strong style="color: #15383c;">Resume:</strong> ${data.fileName || 'Attached'}
      </p>
      ` : ''}
    </div>
    
    <div style="background-color: #ffffff; padding: 24px; border-left: 4px solid #e35e25; border-radius: 8px;">
      <h3 style="margin: 0 0 16px 0; color: #15383c; font-size: 18px; font-weight: bold;">Application / Role Interest</h3>
      <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.8; white-space: pre-wrap;">${data.message}</p>
    </div>
  `;

  return getBaseEmailTemplate(content);
}

