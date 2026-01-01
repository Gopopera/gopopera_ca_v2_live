/**
 * API: Debug endpoint to verify Firebase Admin private key parsing
 * GET /api/marketing/admin-key-check
 * 
 * Returns safe diagnostics only - never logs or returns the actual key
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminKeyDiagnostics } from '../_lib/firebaseAdmin.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ success: true });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const diagnostics = getAdminKeyDiagnostics();

    return res.status(200).json({
      success: diagnostics.cryptoParseOk,
      diagnostics,
    });
  } catch (e: any) {
    return res.status(500).json({
      success: false,
      error: e?.message || 'Internal error',
    });
  }
}

