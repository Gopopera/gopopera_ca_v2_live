/**
 * First Event Welcome Email Template
 * Sent when a user creates their first event on Popera
 * Modern liquid glass UI design
 */

import { getBaseEmailTemplate, getGlassPanel, getTipBox } from './base';

export function FirstEventWelcomeEmailTemplate(data: {
  userName: string;
  eventTitle: string;
  eventUrl?: string;
}): string {
  const content = `
    <!-- Welcome Header -->
    <table role="presentation" style="width: 100%; margin-bottom: 32px;">
      <tr>
        <td align="center">
          <!-- Celebration icon with glow -->
          <table role="presentation" style="margin-bottom: 20px;">
            <tr>
              <td align="center">
                <div style="width: 64px; height: 64px; background: linear-gradient(135deg, rgba(249, 115, 22, 0.25) 0%, rgba(249, 115, 22, 0.1) 100%); border-radius: 50%; border: 2px solid rgba(249, 115, 22, 0.4); box-shadow: 0 0 30px rgba(249, 115, 22, 0.3);">
                  <span style="font-size: 28px; line-height: 64px; display: block; text-align: center;">🚀</span>
                </div>
              </td>
            </tr>
          </table>
          <h1 style="margin: 0 0 8px 0; color: #ffffff; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">Welcome to Popera! 🎉</h1>
          <p style="margin: 0; color: rgba(255, 255, 255, 0.6); font-size: 15px;">You've created your first event</p>
        </td>
      </tr>
    </table>
    
    <!-- Welcome Message Glass Card -->
    ${getGlassPanel(`
      <p style="margin: 0 0 20px 0; color: rgba(255, 255, 255, 0.9); font-size: 16px; line-height: 1.7;">
        Hi ${data.userName},
      </p>
      <p style="margin: 0 0 20px 0; color: rgba(255, 255, 255, 0.8); font-size: 15px; line-height: 1.8;">
        Thank you for joining Popera and taking the first step in creating meaningful experiences for your community. We're thrilled to have you as part of our platform where local creators, hosts, and community members come together to share authentic moments.
      </p>
      <p style="margin: 0 0 20px 0; color: rgba(255, 255, 255, 0.8); font-size: 15px; line-height: 1.8;">
        Your event <span style="color: #f97316; font-weight: 600;">"${data.eventTitle}"</span> is now live and ready to welcome attendees. We hope this is the first of many experiences you'll create that bring people together and foster genuine connections.
      </p>
      <p style="margin: 0 0 20px 0; color: rgba(255, 255, 255, 0.8); font-size: 15px; line-height: 1.8;">
        At Popera, we believe that the best experiences happen when passionate hosts meet curious attendees. Your dedication to creating these moments is what makes our community special.
      </p>
      <p style="margin: 0; color: rgba(255, 255, 255, 0.8); font-size: 15px; line-height: 1.8;">
        Questions or feedback? Reach out anytime at <a href="mailto:support@gopopera.ca" style="color: #f97316; text-decoration: none; font-weight: 600;">support@gopopera.ca</a>
      </p>
    `)}
    
    ${getTipBox('Share your event with your network to maximize attendance! Use the share button on your event page to spread the word on social media.')}
  `;

  return getBaseEmailTemplate(content, 'View Your Event', data.eventUrl || '#');
}
