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
    // Priority: VITE_API_URL > local server (dev) > deployed Vercel URL > relative path
    const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
    
    // Check if custom API URL is set
    let apiUrl;
    if (import.meta.env.VITE_API_URL) {
      apiUrl = import.meta.env.VITE_API_URL;
    } else if (isDevelopment) {
      // In development, use deployed Vercel URL (more reliable than local server)
      // To use local server, start it with: npm run dev:api (in root directory)
      // Then set VITE_API_URL=http://localhost:3001/api/paypal/payout in .env.local
      apiUrl = 'https://zennest.vercel.app/api/paypal/payout';
    } else {
      // In production, use relative path (works when deployed on Vercel)
      apiUrl = '/api/paypal/payout';
    }
    
    console.log('💰 PayPal Payout Request:', {
      paypalEmail,
      amount,
      currency,
      apiUrl
    });

    let response;
    try {
      response = await fetch(apiUrl, {
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
    } catch (fetchError) {
      // Handle network errors (connection refused, etc.)
      if (fetchError.message && fetchError.message.includes('Failed to fetch')) {
        if (apiUrl.includes('localhost:3001')) {
          throw new Error('Local API server is not running. Start it with: npm run dev:api (in root directory). Or use the deployed Vercel API.');
        }
        throw new Error('Failed to connect to API server. Please check your connection or try again later.');
      }
      throw fetchError;
    }

    // Check if response is ok before parsing JSON
    let result;
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    
    try {
      if (isJson) {
        result = await response.json();
      } else {
        // If not JSON, read as text once
        const text = await response.text();
        console.error('Non-JSON response:', {
          status: response.status,
          statusText: response.statusText,
          text: text.substring(0, 200) // Limit text length
        });
        
        // Handle 404 - API endpoint not found
        if (response.status === 404) {
          const errorMsg = isDevelopment 
            ? 'API endpoint not found. The backend API needs to be deployed to Vercel. If testing locally, ensure the API is running or use the deployed version.'
            : 'API endpoint not found. Please contact support if this issue persists.';
          throw new Error(errorMsg);
        }
        
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
    } catch (parseError) {
      // If it's already our custom error, rethrow it
      if (parseError.message && parseError.message.includes('API endpoint')) {
        throw parseError;
      }
      
      // Handle connection refused (local server not running)
      if (parseError.message && parseError.message.includes('Failed to fetch')) {
        if (apiUrl.includes('localhost:3001')) {
          throw new Error('Local API server is not running. Start it with: npm run dev:api (in root directory). Or use the deployed Vercel API by setting VITE_API_URL in .env.local');
        }
        throw new Error('Failed to connect to API server. Please check your connection or try again later.');
      }
      
      console.error('Failed to parse response:', parseError);
      throw new Error(`Server error: ${response.status} ${response.statusText}. ${parseError.message}`);
    }

    if (!response.ok || !result.success) {
      console.error('PayPal Payout API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: result.error,
        details: result.details
      });
      throw new Error(result.error || result.message || `Failed to process payout: ${response.status}`);
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

