/**
 * Base Email Template
 * Popera branded email wrapper with modern liquid glass UI
 */

export function getBaseEmailTemplate(content: string, ctaText?: string, ctaUrl?: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Popera</title>
  <!--[if mso]>
  <style type="text/css">
    table, td, div, p { font-family: Arial, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(145deg, #0a1628 0%, #0f2027 30%, #203a43 70%, #2c5364 100%); min-height: 100vh;">
  <!-- Ambient glow effects -->
  <div style="position: absolute; width: 400px; height: 400px; background: radial-gradient(circle, rgba(99, 179, 237, 0.15) 0%, transparent 70%); top: 5%; left: 10%; border-radius: 50%;"></div>
  <div style="position: absolute; width: 300px; height: 300px; background: radial-gradient(circle, rgba(129, 230, 217, 0.12) 0%, transparent 70%); bottom: 20%; right: 15%; border-radius: 50%;"></div>
  
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 48px 24px;">
        <!-- Main glass card container -->
        <table role="presentation" style="max-width: 580px; width: 100%; border-collapse: collapse;">
          <!-- Header Card -->
          <tr>
            <td style="padding-bottom: 2px;">
              <table role="presentation" style="width: 100%; background: linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.05) 100%); border-radius: 24px 24px 0 0; border: 1px solid rgba(255, 255, 255, 0.18); border-bottom: none;">
                <tr>
                  <td style="padding: 28px 40px; text-align: center;">
                    <table role="presentation" style="margin: 0 auto;">
                      <tr>
                        <td>
                          <span style="color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;">Popera</span>
                        </td>
                        <td style="vertical-align: top; padding-left: 2px; padding-top: 4px;">
                          <span style="display: inline-block; width: 6px; height: 6px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); border-radius: 50%; box-shadow: 0 0 12px rgba(249, 115, 22, 0.6);"></span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Content Card -->
          <tr>
            <td>
              <table role="presentation" style="width: 100%; background: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%); border: 1px solid rgba(255, 255, 255, 0.12); border-top: none; border-bottom: none;">
                <tr>
                  <td style="padding: 40px;">
                    ${content}
                    
                    ${ctaText && ctaUrl ? `
                    <table role="presentation" style="width: 100%; margin-top: 36px;">
                      <tr>
                        <td align="center">
                          <a href="${ctaUrl}" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-weight: 600; font-size: 15px; letter-spacing: 0.3px; box-shadow: 0 8px 24px rgba(249, 115, 22, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2);">${ctaText}</a>
                        </td>
                      </tr>
                    </table>
                    ` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer Card -->
          <tr>
            <td>
              <table role="presentation" style="width: 100%; background: linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%); border-radius: 0 0 24px 24px; border: 1px solid rgba(255, 255, 255, 0.1); border-top: 1px solid rgba(255, 255, 255, 0.08);">
                <tr>
                  <td style="padding: 28px 40px; text-align: center;">
                    <p style="margin: 0 0 6px 0; color: rgba(255, 255, 255, 0.9); font-size: 14px; font-weight: 600;">
                      Popera Team
                    </p>
                    <p style="margin: 0 0 16px 0; font-size: 14px;">
                      <a href="mailto:support@gopopera.ca" style="color: #f97316; text-decoration: none;">support@gopopera.ca</a>
                    </p>
                    <p style="margin: 0; color: rgba(255, 255, 255, 0.4); font-size: 12px;">
                      © ${new Date().getFullYear()} Popera. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
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

/**
 * Glass panel component for content sections
 */
export function getGlassPanel(content: string, accentColor?: string): string {
  const borderColor = accentColor || 'rgba(255, 255, 255, 0.15)';
  return `
    <table role="presentation" style="width: 100%; background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%); border-radius: 16px; border: 1px solid ${borderColor}; margin-bottom: 20px;">
      <tr>
        <td style="padding: 24px;">
          ${content}
        </td>
      </tr>
    </table>
  `;
}

/**
 * Info row component for key-value pairs
 */
export function getInfoRow(label: string, value: string): string {
  return `
    <table role="presentation" style="width: 100%; margin-bottom: 16px;">
      <tr>
        <td>
          <p style="margin: 0 0 4px 0; color: rgba(255, 255, 255, 0.5); font-size: 11px; text-transform: uppercase; letter-spacing: 1.2px; font-weight: 600;">${label}</p>
          <p style="margin: 0; color: rgba(255, 255, 255, 0.95); font-size: 16px; font-weight: 500;">${value}</p>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Success badge component
 */
export function getSuccessBadge(text: string, emoji?: string): string {
  return `
    <table role="presentation" style="width: 100%; margin-bottom: 28px;">
      <tr>
        <td align="center">
          <table role="presentation" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.1) 100%); border-radius: 50px; border: 1px solid rgba(16, 185, 129, 0.3);">
            <tr>
              <td style="padding: 12px 28px;">
                <span style="color: #34d399; font-size: 14px; font-weight: 600;">${emoji ? emoji + ' ' : ''}${text}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Tip box component
 */
export function getTipBox(content: string): string {
  return `
    <table role="presentation" style="width: 100%; background: linear-gradient(135deg, rgba(249, 115, 22, 0.15) 0%, rgba(249, 115, 22, 0.08) 100%); border-radius: 12px; border: 1px solid rgba(249, 115, 22, 0.25); margin-top: 24px;">
      <tr>
        <td style="padding: 16px 20px;">
          <p style="margin: 0; color: rgba(255, 255, 255, 0.9); font-size: 14px; line-height: 1.6;">
            <span style="color: #f97316; font-weight: 600;">💡 Tip:</span> ${content}
          </p>
        </td>
      </tr>
    </table>
  `;
}
