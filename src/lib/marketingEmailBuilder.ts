/**
 * Marketing Email HTML Builder
 * Shared between frontend preview and backend sending
 */

export interface MarketingEmailParams {
  subject: string;
  preheader?: string;
  theme: 'dark' | 'light' | 'minimal';
  density: 'compact' | 'normal';
  heroImageUrl?: string;
  heroAlt?: string;
  markdownBody: string;
  ctaText?: string;
  ctaUrl?: string;
  campaignName?: string;
}

// Simple markdown to HTML conversion
function markdownToHtml(md: string): string {
  let result = md
    // Headers
    .replace(/^### (.+)$/gm, '<h3 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600;">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700;">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="margin: 0 0 20px 0; font-size: 28px; font-weight: 800;">$1</h1>')
    // Bold and italic
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: #e35e25; text-decoration: underline;">$1</a>')
    // Bullet lists
    .replace(/^\s*[-*]\s+(.+)$/gm, '<li style="margin-bottom: 8px;">$1</li>');
  
  // Wrap consecutive <li> items in <ul>
  result = result.replace(/(<li[^>]*>.*<\/li>\n?)+/g, (match) => {
    return `<ul style="margin: 16px 0; padding-left: 24px;">${match}</ul>`;
  });
  
  // Convert paragraphs (double newlines)
  const paragraphs = result.split(/\n\n+/);
  result = paragraphs
    .map(p => p.trim())
    .filter(p => p && !p.startsWith('<h') && !p.startsWith('<ul'))
    .map(p => `<p style="margin: 0 0 16px 0; line-height: 1.7;">${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
  
  // Add back headers and lists
  paragraphs.forEach(p => {
    if (p.startsWith('<h') || p.startsWith('<ul')) {
      result = p + result;
    }
  });
  
  return result;
}

const THEMES = {
  dark: {
    bg: '#15383c',
    text: '#f2f2f2',
    textMuted: 'rgba(242, 242, 242, 0.7)',
    accent: '#e35e25',
    cardBg: 'rgba(255, 255, 255, 0.08)',
    border: 'rgba(255, 255, 255, 0.12)',
  },
  light: {
    bg: '#ffffff',
    text: '#15383c',
    textMuted: '#6b7280',
    accent: '#e35e25',
    cardBg: '#f8fafb',
    border: '#e5e7eb',
  },
  minimal: {
    bg: '#ffffff',
    text: '#1f2937',
    textMuted: '#6b7280',
    accent: '#e35e25',
    cardBg: '#ffffff',
    border: '#e5e7eb',
  },
};

const DENSITY = {
  compact: { padding: '24px', lineHeight: '1.5', gap: '12px' },
  normal: { padding: '40px', lineHeight: '1.7', gap: '20px' },
};

export function buildMarketingEmailHtml(params: MarketingEmailParams): { html: string; text: string } {
  const { subject, preheader, theme, density, heroImageUrl, heroAlt, markdownBody, ctaText, ctaUrl, campaignName } = params;
  
  const t = THEMES[theme] || THEMES.dark;
  const d = DENSITY[density] || DENSITY.normal;
  
  const bodyHtml = markdownToHtml(markdownBody);
  
  // CTA button style varies by theme
  const ctaButtonStyle = theme === 'dark'
    ? `display: inline-block; padding: 14px 32px; border: 2px solid ${t.accent}; color: ${t.accent}; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;`
    : `display: inline-block; padding: 14px 32px; background-color: ${t.accent}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;`;
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <!--[if mso]>
  <style type="text/css">
    table, td, div, p { font-family: Arial, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: ${t.bg}; color: ${t.text}; line-height: ${d.lineHeight};">
  ${preheader ? `<div style="display: none; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: ${t.bg};">${preheader}</div>` : ''}
  
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse;">
          
          <!-- Header -->
          <tr>
            <td style="padding: ${d.padding}; padding-bottom: 24px; text-align: center;">
              <table role="presentation" style="margin: 0 auto;">
                <tr>
                  <td style="vertical-align: baseline;">
                    <span style="color: ${t.text}; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Popera</span>
                  </td>
                  <td style="vertical-align: baseline; padding-left: 2px;">
                    <span style="display: inline-block; width: 5px; height: 5px; background-color: ${t.accent}; border-radius: 50%;"></span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Content Card -->
          <tr>
            <td>
              <table role="presentation" style="width: 100%; background-color: ${t.cardBg}; border: 1px solid ${t.border}; border-radius: 16px;">
                <tr>
                  <td style="padding: ${d.padding};">
                    
                    ${preheader ? `<p style="margin: 0 0 ${d.gap} 0; font-size: 14px; color: ${t.textMuted};">${preheader}</p>` : ''}
                    
                    ${campaignName ? `<p style="margin: 0 0 8px 0; font-size: 12px; color: ${t.textMuted}; text-transform: uppercase; letter-spacing: 1px;">${campaignName}</p>` : ''}
                    
                    ${heroImageUrl ? `
                    <div style="margin-bottom: ${d.gap};">
                      <img src="${heroImageUrl}" alt="${heroAlt || ''}" style="width: 100%; max-width: 100%; height: auto; border-radius: 12px; display: block;">
                    </div>
                    ` : ''}
                    
                    <div style="color: ${t.text}; font-size: 16px;">
                      ${bodyHtml}
                    </div>
                    
                    ${ctaText && ctaUrl ? `
                    <div style="margin-top: 28px; text-align: center;">
                      <a href="${ctaUrl}" style="${ctaButtonStyle}">${ctaText}</a>
                    </div>
                    ` : ''}
                    
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 32px ${d.padding}; text-align: center;">
              <p style="margin: 0 0 8px 0; color: ${t.textMuted}; font-size: 14px;">
                Popera, Canada
              </p>
              <p style="margin: 0 0 8px 0; font-size: 13px;">
                <a href="mailto:support@gopopera.ca" style="color: ${t.accent}; text-decoration: none;">support@gopopera.ca</a>
              </p>
              <p style="margin: 0; color: ${t.textMuted}; font-size: 12px;">
                <a href="{{UNSUBSCRIBE_URL}}" style="color: ${t.textMuted}; text-decoration: underline;">Unsubscribe</a> from marketing emails
              </p>
              <p style="margin: 12px 0 0 0; color: ${t.textMuted}; font-size: 11px;">
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
  
  // Plain text version
  const text = `
${campaignName ? campaignName.toUpperCase() + '\n\n' : ''}${preheader ? preheader + '\n\n' : ''}${markdownBody}

${ctaText && ctaUrl ? `${ctaText}: ${ctaUrl}\n\n` : ''}
---
Popera, Canada
support@gopopera.ca

Unsubscribe: {{UNSUBSCRIBE_URL}}
  `.trim();
  
  return { html, text };
}

