/**
 * Vercel Serverless Function for Sending SMS via Twilio
 * EU-compatible: expects E.164 format, no auto-prefix
 * Includes debug instrumentation for Belgium launch verification
 */

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const TWILIO_MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID;
const TWILIO_API_URL = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

/**
 * Generate a short request ID for log correlation
 */
function generateRequestId(): string {
  return `sms_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`;
}

/**
 * Mask phone number for logging (show country code only)
 * +32475123456 → +32***
 */
function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return '***';
  // Extract country code (1-3 digits after +)
  const match = phone.match(/^\+(\d{1,3})/);
  if (match) {
    return `+${match[1]}***`;
  }
  return '+***';
}

/**
 * Extract country code from E.164 number
 */
function detectCountryFromPhone(phone: string): string {
  if (!phone.startsWith('+')) return 'unknown';
  
  // Common country codes
  if (phone.startsWith('+1')) return 'US/CA';
  if (phone.startsWith('+32')) return 'BE';
  if (phone.startsWith('+33')) return 'FR';
  if (phone.startsWith('+49')) return 'DE';
  if (phone.startsWith('+31')) return 'NL';
  if (phone.startsWith('+44')) return 'GB';
  if (phone.startsWith('+34')) return 'ES';
  if (phone.startsWith('+39')) return 'IT';
  
  // Return first 2-3 digits as country indicator
  const match = phone.match(/^\+(\d{1,3})/);
  return match ? `+${match[1]}` : 'unknown';
}

/**
 * Validate E.164 formatted phone number
 * Must start with + followed by 7-15 digits, first digit 1-9
 */
function validateE164Phone(phone: string): boolean {
  const cleanPhone = phone.trim().replace(/\s/g, '');
  if (!cleanPhone.startsWith('+')) return false;
  const digitsOnly = cleanPhone.slice(1).replace(/\D/g, '');
  return /^[1-9]\d{6,14}$/.test(digitsOnly);
}

/**
 * Map Twilio error codes to user-friendly messages
 */
function mapTwilioError(errorCode: number | string, errorMessage: string): string {
  const code = typeof errorCode === 'string' ? parseInt(errorCode, 10) : errorCode;
  
  switch (code) {
    case 21211:
      return 'Invalid phone number format. Please check and try again.';
    case 21214:
      return 'This phone number cannot receive SMS messages.';
    case 21408:
    case 21610:
      return 'SMS delivery to this region is not currently available. Please contact support.';
    case 21612:
    case 21614:
      return 'This phone number appears to be invalid or not a mobile number.';
    case 30003:
    case 30005:
    case 30006:
      return 'Unable to deliver SMS to this number. Please verify it\'s a mobile number.';
    default:
      return 'Failed to send SMS. Please try again later.';
  }
}

export default async function handler(req: any, res: any) {
  const requestId = generateRequestId();
  
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
    // Either TWILIO_MESSAGING_SERVICE_SID or TWILIO_PHONE_NUMBER must be set
    const hasMessagingService = !!TWILIO_MESSAGING_SERVICE_SID;
    const hasFromNumber = !!TWILIO_PHONE_NUMBER;
    
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || (!hasMessagingService && !hasFromNumber)) {
      console.error(`[SMS] requestId=${requestId} status=config_error reason=missing_credentials`);
      return res.status(500).json({ 
        success: false, 
        error: 'SMS service not configured' 
      });
    }
    
    // Determine send mode: prefer Messaging Service for better EU deliverability
    const sendMode = hasMessagingService ? 'messaging_service' : 'from_number';

    // Extract SMS data from request
    const { to, message } = req.body;

    // Validate required fields
    if (!to || !message) {
      console.warn(`[SMS] requestId=${requestId} status=validation_error reason=missing_fields`);
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: to, message' 
      });
    }

    // Validate E.164 format - do NOT modify the number
    const phone = to.trim();
    const maskedPhone = maskPhone(phone);
    const detectedCountry = detectCountryFromPhone(phone);
    
    if (!validateE164Phone(phone)) {
      console.warn(`[SMS] requestId=${requestId} to=${maskedPhone} country=${detectedCountry} status=validation_error reason=invalid_e164`);
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid phone number format. Must be E.164 format (e.g., +14165551234, +32475123456)' 
      });
    }

    // Debug log: SMS send attempt with mode indicator
    console.log(`[SMS] requestId=${requestId} to=${maskedPhone} country=${detectedCountry} messageLength=${message.length} mode=${sendMode} status=sending`);

    // Prepare Twilio API request
    const formData = new URLSearchParams();
    
    // Use Messaging Service SID if available (better EU deliverability), otherwise use From number
    if (hasMessagingService) {
      formData.append('MessagingServiceSid', TWILIO_MESSAGING_SERVICE_SID!);
    } else {
      formData.append('From', TWILIO_PHONE_NUMBER!);
    }
    
    formData.append('To', phone);
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

    const data = await response.json();

    if (!response.ok) {
      const errorCode = data.code || data.error_code;
      const errorMessage = data.message || data.error_message || 'Unknown error';
      
      // Debug log: Twilio error with code
      console.error(`[SMS] requestId=${requestId} to=${maskedPhone} country=${detectedCountry} status=twilio_error errorCode=${errorCode} errorMessage="${errorMessage.substring(0, 100)}"`);
      
      return res.status(400).json({ 
        success: false, 
        error: mapTwilioError(errorCode, errorMessage)
      });
    }
    
    if (!data.sid) {
      console.error(`[SMS] requestId=${requestId} to=${maskedPhone} country=${detectedCountry} status=invalid_response reason=missing_sid`);
      return res.status(500).json({ 
        success: false, 
        error: 'SMS service returned an invalid response' 
      });
    }

    // Debug log: Success
    console.log(`[SMS] requestId=${requestId} to=${maskedPhone} country=${detectedCountry} mode=${sendMode} status=sent messageId=${data.sid}`);

    return res.status(200).json({ 
      success: true, 
      messageId: data.sid 
    });

  } catch (error: any) {
    console.error(`[SMS] requestId=${requestId} status=exception error="${error.message?.substring(0, 100)}"`);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to send SMS. Please try again later.' 
    });
  }
}
