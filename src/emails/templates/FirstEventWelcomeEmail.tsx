/**
 * First Event Welcome Email Template
 * Sent when a user creates their first event on Popera
 */

import { getBaseEmailTemplate } from './base';

export function FirstEventWelcomeEmailTemplate(data: {
  userName: string;
  eventTitle: string;
  eventUrl?: string;
}): string {
  const content = `
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; width: 80px; height: 80px; background: linear-gradient(135deg, #e35e25 0%, #d14e1a 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M2 17L12 22L22 17" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M2 12L12 17L22 12" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <h2 style="margin: 0 0 8px 0; color: #15383c; font-size: 28px; font-weight: bold;">Welcome to Popera! 🎉</h2>
      <p style="margin: 0; color: #6b7280; font-size: 16px;">You've created your first event</p>
    </div>
    
    <div style="background-color: #f8fafb; padding: 24px; border-radius: 12px; margin-bottom: 24px;">
      <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.7;">
        Hi ${data.userName},
      </p>
      <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.7;">
        Thank you for joining Popera and taking the first step in creating meaningful experiences for your community. We're thrilled to have you as part of our platform where local creators, hosts, and community members come together to share authentic moments.
      </p>
      <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.7;">
        Your event <strong style="color: #15383c;">"${data.eventTitle}"</strong> is now live and ready to welcome attendees. We hope this is the first of many experiences you'll create that bring people together and foster genuine connections.
      </p>
      <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.7;">
        At Popera, we believe that the best experiences happen when passionate hosts meet curious attendees. Your dedication to creating these moments is what makes our community special, and we're here to support you every step of the way.
      </p>
      <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.7;">
        Your experience matters to us. If you have any questions, need assistance, or want to share feedback, please don't hesitate to reach out to us at <a href="mailto:support@gopopera.ca" style="color: #e35e25; text-decoration: none; font-weight: 600;">support@gopopera.ca</a>. We're always here to help.
      </p>
    </div>
    
    <div style="background-color: #fff7ed; border-left: 4px solid #e35e25; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
      <p style="margin: 0; color: #15383c; font-size: 14px; line-height: 1.6;">
        <strong style="color: #e35e25;">💡 Tip:</strong> Share your event with your network to maximize attendance! You can use the share button on your event page to spread the word on social media.
      </p>
    </div>
  `;

  return getBaseEmailTemplate(content, 'View Your Event', data.eventUrl || '#');
}

