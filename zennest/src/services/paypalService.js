// src/services/paypalService.js
// PayPal service for payouts and account connection

/**
 * Process PayPal Payout (Sandbox/Production)
 * This function processes a payout to a PayPal account via PayPal Sandbox or Production
 * 
 * IMPORTANT: This function should call a backend API endpoint that has access to PayPal Client Secret.
 * PayPal Payouts API requires server-side authentication with Client ID and Secret.
 * 
 * Backend Endpoint Required: POST /api/paypal/payouts
 * Request Body: { paypalEmail, amount, currency }
 * 
 * The backend should:
 * 1. Authenticate with PayPal using Client ID and Secret (from environment variables)
 * 2. Create a payout batch using PayPal Payouts API
 * 3. Return the payout batch ID, status, and transaction details
 * 
 * For PayPal Sandbox testing:
 * - Use PayPal Sandbox credentials in backend
 * - Test with sandbox PayPal accounts
 * - Verify payouts in PayPal Sandbox dashboard
 */
export const processPayPalPayout = async (paypalEmail, amount, currency = 'PHP') => {
  try {
    // Validate inputs
    if (!paypalEmail || !amount || amount <= 0) {
      throw new Error('Invalid payout parameters');
    }

    // Get PayPal Client ID (for validation, not for API calls)
    const paypalClientId = (import.meta?.env?.VITE_PAYPAL_CLIENT_ID) || 
                            (typeof window !== 'undefined' && window.PAYPAL_CLIENT_ID) || 
                            '';
    
    if (!paypalClientId) {
      throw new Error('PayPal Client ID is not configured');
    }

    // Prepare payout data
    const payoutData = {
      sender_batch_header: {
        sender_batch_id: `PAYOUT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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

    // Call backend API endpoint for secure PayPal payout processing
    // The backend handles PayPal authentication and payout creation
    const apiUrl = import.meta.env.VITE_API_URL || '/api/paypal/payout';
    
    console.log('💰 PayPal Payout Request:', {
      paypalEmail,
      amount,
      currency,
      apiUrl
    });

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        paypalEmail,
        amount,
        currency
      })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to process payout');
    }

    console.log('✅ PayPal Payout Response:', {
      payoutBatchId: result.payoutBatchId,
      status: result.status,
      amount,
      currency,
      paypalEmail
    });

    return {
      success: true,
      payoutBatchId: result.payoutBatchId,
      status: result.status, // SUCCESS, PENDING, PROCESSING, FAILED
      amount: result.amount || amount,
      currency: result.currency || currency,
      paypalEmail: result.paypalEmail || paypalEmail,
      message: result.message || `Payout of ₱${amount.toFixed(2)} has been successfully sent to ${paypalEmail} via PayPal Sandbox.`,
      batchStatus: result.batchStatus || result.status,
      transactionId: result.transactionId,
      estimatedCompletionDate: result.estimatedCompletionDate || new Date().toISOString(),
      links: result.links || []
    };
  } catch (error) {
    console.error('Error processing PayPal payout:', error);
    throw error;
  }
};

/**
 * Verify PayPal Account
 * This function verifies if a PayPal email is valid
 */
export const verifyPayPalAccount = async (paypalEmail) => {
  try {
    // In production, this could call PayPal's API to verify the account
    // For now, we'll do basic validation
    if (!paypalEmail || !paypalEmail.includes('@')) {
      return { success: false, error: 'Invalid PayPal email address' };
    }

    // Simulate verification (replace with actual PayPal API call)
    return {
      success: true,
      verified: true,
      email: paypalEmail
    };
  } catch (error) {
    console.error('Error verifying PayPal account:', error);
    return { success: false, error: error.message };
  }
};

