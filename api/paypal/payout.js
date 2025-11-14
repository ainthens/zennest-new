// api/paypal/payout.js
// Vercel serverless function for PayPal Payouts
// This endpoint handles secure PayPal payouts using server-side credentials

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    // Get PayPal credentials from environment variables (server-side only)
    const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
    const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
    const PAYPAL_MODE = process.env.PAYPAL_MODE || 'sandbox'; // 'sandbox' or 'live'

    // Validate credentials
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      console.error('PayPal credentials not configured');
      return res.status(500).json({
        success: false,
        error: 'PayPal credentials not configured on server'
      });
    }

    // Get request body
    let requestBody;
    try {
      requestBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (e) {
      return res.status(400).json({
        success: false,
        error: 'Invalid JSON in request body'
      });
    }

    const { paypalEmail, amount, currency = 'PHP' } = requestBody;

    // Validate inputs
    if (!paypalEmail || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payout parameters. paypalEmail and amount are required.'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(paypalEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid PayPal email address format'
      });
    }

    // Determine PayPal API base URL based on mode
    const paypalBaseUrl = PAYPAL_MODE === 'live' 
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

    // Step 1: Get PayPal OAuth Access Token
    // Create Basic Auth header
    const credentials = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
    
    const tokenResponse = await fetch(`${paypalBaseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'en_US',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials'
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('PayPal OAuth token error:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: errorText
      });
      return res.status(500).json({
        success: false,
        error: `Failed to authenticate with PayPal: ${tokenResponse.status} ${tokenResponse.statusText}`,
        details: errorText
      });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return res.status(500).json({
        success: false,
        error: 'Failed to obtain PayPal access token'
      });
    }

    // Step 2: Create PayPal Payout
    const senderBatchId = `PAYOUT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const payoutData = {
      sender_batch_header: {
        sender_batch_id: senderBatchId,
        email_subject: 'You have a payout from ZenNest',
        email_message: `You have received a payout of ${currency} ${amount.toFixed(2)} from ZenNest.`
      },
      items: [
        {
          recipient_type: 'EMAIL',
          amount: {
            value: amount.toFixed(2),
            currency: currency
          },
          receiver: paypalEmail,
          note: 'Payout from ZenNest',
          sender_item_id: `PAYOUT-ITEM-${Date.now()}`
        }
      ]
    };

    const payoutResponse = await fetch(`${paypalBaseUrl}/v1/payments/payouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(payoutData)
    });

    const payoutResult = await payoutResponse.json();

    if (!payoutResponse.ok) {
      console.error('PayPal Payout error:', {
        status: payoutResponse.status,
        statusText: payoutResponse.statusText,
        error: payoutResult
      });
      return res.status(payoutResponse.status || 500).json({
        success: false,
        error: payoutResult.message || payoutResult.name || `Failed to process PayPal payout: ${payoutResponse.status}`,
        details: payoutResult.details || payoutResult
      });
    }

    // Extract batch status and transaction ID
    const batchStatus = payoutResult.batch_header?.batch_status || 'PENDING';
    const payoutBatchId = payoutResult.batch_header?.payout_batch_id || senderBatchId;
    const transactionId = payoutResult.batch_header?.items?.[0]?.transaction_id || null;

    // Return success response
    return res.status(200).json({
      success: true,
      payoutBatchId: payoutBatchId,
      status: batchStatus, // SUCCESS, PENDING, PROCESSING, etc.
      amount: amount,
      currency: currency,
      paypalEmail: paypalEmail,
      transactionId: transactionId,
      batchStatus: batchStatus,
      message: `Payout of ${currency} ${amount.toFixed(2)} has been successfully sent to ${paypalEmail}`,
      estimatedCompletionDate: payoutResult.batch_header?.estimated_completion_date || new Date().toISOString(),
      links: payoutResult.links || []
    });

  } catch (error) {
    console.error('Error processing PayPal payout:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error while processing payout',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

