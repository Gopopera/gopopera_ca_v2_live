/**
 * Vercel Serverless Function for Sending SMS via Twilio
 * This runs server-side to keep API keys secure
 */

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const TWILIO_API_URL = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

/**
 * Format phone number to E.164 format
 * Automatically adds +1 for US/Canada (10-digit numbers)
 */
function formatPhoneToE164(phone: string): string {
  const cleaned = phone.trim();
  const digitsOnly = cleaned.replace(/\D/g, '');
  
  if (cleaned.startsWith('+')) {
    return '+' + cleaned.replace(/\D/g, '');
  }
  
  // Auto-add +1 for US/Canada (10 digits)
  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  }
  
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return `+${digitsOnly}`;
  }
  
  return digitsOnly.length > 0 ? `+${digitsOnly}` : phone;
}

/**
 * Validate E.164 formatted phone number
 */
function validateE164Phone(phone: string): boolean {
  const cleanPhone = phone.trim().replace(/\s/g, '');
  if (!cleanPhone.startsWith('+')) return false;
  const digitsOnly = cleanPhone.slice(1).replace(/\D/g, '');
  return /^[1-9]\d{0,14}$/.test(digitsOnly);
}

export default async function handler(req: any, res: any) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS headers for production
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Validate Twilio is configured
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      console.error('[API] Twilio not configured - missing credentials');
      return res.status(500).json({ 
        success: false, 
        error: 'SMS service not configured' 
      });
    }

    // Extract SMS data from request
    const { to, message } = req.body;

    // Validate required fields
    if (!to || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: to, message' 
      });
    }

    // CRITICAL: Format phone number FIRST, then validate
    const formattedPhone = formatPhoneToE164(to);
    
    if (!validateE164Phone(formattedPhone)) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid phone number: ${to}. Please use a valid 10-digit US/Canada number.` 
      });
    }

    console.log('[API] Sending SMS:', { 
      original: to,
      formatted: formattedPhone,
      messageLength: message.length 
    });

    // Prepare Twilio API request
    const formData = new URLSearchParams();
    formData.append('From', TWILIO_PHONE_NUMBER);
    formData.append('To', formattedPhone); // Use formatted number
    formData.append('Body', message);

    // Send SMS via Twilio API
    const response = await fetch(TWILIO_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API] Twilio API error:', errorText);
      return res.status(500).json({ 
        success: false, 
        error: `Twilio API error: ${errorText.substring(0, 200)}` 
      });
    }

    const data = await response.json();
    
    if (!data.sid) {
      console.error('[API] Twilio response missing SID:', data);
      return res.status(500).json({ 
        success: false, 
        error: 'Twilio response invalid' 
      });
    }

    console.log('[API] SMS sent successfully:', { messageId: data.sid });

    return res.status(200).json({ 
      success: true, 
      messageId: data.sid 
    });

  } catch (error: any) {
    console.error('[API] Error sending SMS:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Unknown error' 
    });
  }
}

