/**
 * Base Email Template
 * Popera branded email wrapper
 */

export function getBaseEmailTemplate(content: string, ctaText?: string, ctaUrl?: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Popera</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafb;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #15383c 0%, #1f4d52 100%); padding: 32px 40px; text-align: center;">
              <div style="display: inline-flex; align-items: baseline; margin: 0;">
                <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold; letter-spacing: -0.5px; font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Popera</h1>
                <span style="display: inline-block; width: 4px; height: 4px; background-color: #e35e25; border-radius: 50%; flex-shrink: 0; margin-left: 1px; align-self: baseline;"></span>
              </div>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              ${content}
              
              ${ctaText && ctaUrl ? `
              <div style="margin-top: 32px; text-align: center;">
                <a href="${ctaUrl}" style="display: inline-block; background-color: #e35e25; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 50px; font-weight: bold; font-size: 16px; transition: background-color 0.2s;">${ctaText}</a>
              </div>
              ` : ''}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafb; padding: 32px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                <strong style="color: #15383c;">Popera Team</strong>
              </p>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                <a href="mailto:support@gopopera.ca" style="color: #e35e25; text-decoration: none;">support@gopopera.ca</a>
              </p>
              <p style="margin: 16px 0 0 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} Popera. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

