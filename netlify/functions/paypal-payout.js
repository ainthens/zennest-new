// netlify/functions/paypal-payout.js
// Netlify serverless function for PayPal Payouts
// This endpoint handles secure PayPal payouts using server-side credentials

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ 
        success: false, 
        error: 'Method not allowed' 
      })
    };
  }

  try {
    // Get PayPal credentials from environment variables (server-side only)
    const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
    const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
    const PAYPAL_MODE = process.env.PAYPAL_MODE || 'sandbox'; // 'sandbox' or 'live'

    // Validate credentials
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      console.error('PayPal credentials not configured');
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: 'PayPal credentials not configured on server'
        })
      };
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { paypalEmail, amount, currency = 'PHP' } = body;

    // Validate inputs
    if (!paypalEmail || !amount || amount <= 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Invalid payout parameters. paypalEmail and amount are required.'
        })
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(paypalEmail)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Invalid PayPal email address format'
        })
      };
    }

    // Determine PayPal API base URL based on mode
    const paypalBaseUrl = PAYPAL_MODE === 'live' 
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

    // Step 1: Get PayPal OAuth Access Token
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
      console.error('PayPal OAuth token error:', errorText);
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: 'Failed to authenticate with PayPal'
        })
      };
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: 'Failed to obtain PayPal access token'
        })
      };
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
      console.error('PayPal Payout error:', payoutResult);
      return {
        statusCode: payoutResponse.status || 500,
        body: JSON.stringify({
          success: false,
          error: payoutResult.message || payoutResult.name || 'Failed to process PayPal payout',
          details: payoutResult.details || null
        })
      };
    }

    // Extract batch status and transaction ID
    const batchStatus = payoutResult.batch_header?.batch_status || 'PENDING';
    const payoutBatchId = payoutResult.batch_header?.payout_batch_id || senderBatchId;
    const transactionId = payoutResult.batch_header?.items?.[0]?.transaction_id || null;

    // Return success response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
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
      })
    };

  } catch (error) {
    console.error('Error processing PayPal payout:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Internal server error while processing payout'
      })
    };
  }
};

