// PayPalLoginButton.jsx - Component for PayPal authentication/login
import React, { useState, useEffect } from 'react';
import { PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';

/**
 * PayPalLoginButton Component
 * 
 * This component renders a PayPal button that allows users to log in with PayPal.
 * After successful login, it returns the PayPal account information (email, payerId, name).
 * 
 * For cashout purposes, we use a minimal transaction (₱0.01) to authenticate the user
 * and retrieve their PayPal account information. This transaction should be voided/refunded
 * via the backend in a production environment.
 */
const PayPalLoginButton = ({ onSuccess, onError }) => {
  const [{ isPending, isResolved, isRejected }] = usePayPalScriptReducer();
  
  // Add timeout to detect if SDK is stuck loading
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  
  // Debug logging
  useEffect(() => {
    console.log('🔍 PayPalLoginButton SDK state:', {
      isPending,
      isResolved,
      isRejected,
      loadingTimeout
    });
  }, [isPending, isResolved, isRejected, loadingTimeout]);
  
  useEffect(() => {
    // Set a timeout to detect if loading is stuck
    const timeout = setTimeout(() => {
      if (!isResolved && !isRejected) {
        console.error('⚠️ PayPal SDK loading timeout - taking too long to load');
        setLoadingTimeout(true);
        if (onError) {
          onError(new Error('PayPal SDK failed to load. Please refresh the page.'));
        }
      }
    }, 10000); // 10 second timeout
    
    return () => clearTimeout(timeout);
  }, [isResolved, isRejected, onError]);

  // Create a minimal order for authentication (₱0.01)
  // In production, this should be voided/refunded via backend
  const createOrder = (data, actions) => {
    return actions.order.create({
      purchase_units: [{
        amount: {
          value: '0.01',
          currency_code: 'PHP'
        },
        description: 'PayPal Account Authentication for Cashout'
      }],
      application_context: {
        brand_name: 'ZenNest',
        landing_page: 'LOGIN',
        user_action: 'PAY_NOW'
      }
    });
  };

  // Handle approval - extract PayPal account info
  const onApprove = async (data, actions) => {
    try {
      console.log('🔄 PayPal approval received:', data);
      
      // Capture the payment to get PayPal account details
      const details = await actions.order.capture();
      console.log('✅ PayPal order captured:', details);
      
      // Extract PayPal account information from multiple possible locations
      const payer = details.payer;
      const payerInfo = payer?.payer_info;
      
      // Try to get email from various locations
      const email = payerInfo?.email || 
                   payer?.email_address || 
                   details.purchase_units?.[0]?.payee?.email_address ||
                   '';
      
      // Try to get payer ID from various locations
      const payerId = payerInfo?.payer_id || 
                     payer?.payer_id || 
                     data.payerID || 
                     payer?.account_id ||
                     '';
      
      // Try to get name from various locations
      let name = '';
      if (payerInfo?.first_name && payerInfo?.last_name) {
        name = `${payerInfo.first_name} ${payerInfo.last_name}`;
      } else if (payerInfo?.first_name) {
        name = payerInfo.first_name;
      } else if (payerInfo?.last_name) {
        name = payerInfo.last_name;
      } else if (payer?.name?.given_name && payer?.name?.surname) {
        name = `${payer.name.given_name} ${payer.name.surname}`;
      } else if (payer?.name?.given_name) {
        name = payer.name.given_name;
      } else if (payer?.name?.surname) {
        name = payer.name.surname;
      }
      
      const paypalData = {
        email: email,
        payerId: payerId,
        name: name,
        orderId: data.orderID,
        details: details
      };

      console.log('✅ PayPal authentication successful - extracted data:', paypalData);
      
      // Validate that we have at least an email
      if (!paypalData.email) {
        throw new Error('Could not retrieve PayPal email address. Please try again.');
      }
      
      // Call success callback with PayPal account data
      if (onSuccess) {
        onSuccess(paypalData);
      }
    } catch (error) {
      console.error('❌ Error processing PayPal approval:', error);
      if (onError) {
        onError(error);
      }
    }
  };

  // Handle cancellation
  const onCancel = (data) => {
    console.log('PayPal login cancelled:', data);
    if (onError) {
      onError(new Error('PayPal login was cancelled'));
    }
  };

  // Handle errors
  const handleError = (err) => {
    console.error('PayPal login error:', err);
    if (onError) {
      onError(err);
    }
  };

  // Show error if SDK failed to load
  if (isRejected || loadingTimeout) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4 max-w-md">
          <p className="text-sm text-red-700 font-medium mb-2">
            Failed to load PayPal
          </p>
          <p className="text-xs text-red-600 mb-3">
            {isRejected 
              ? 'PayPal SDK failed to initialize. This could be due to:'
              : 'PayPal is taking too long to load. This could be due to:'}
          </p>
          <ul className="text-xs text-red-600 list-disc list-inside mb-3 space-y-1">
            <li>Network connectivity issues</li>
            <li>PayPal Client ID configuration</li>
            <li>Browser blocking PayPal scripts</li>
            <li>Ad blockers or privacy extensions</li>
          </ul>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Refresh Page
            </button>
            <button
              onClick={() => {
                if (onError) {
                  onError(new Error('PayPal SDK failed to load. Please try again later.'));
                }
              }}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state
  if (!isResolved) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 mt-2">Loading PayPal...</span>
        <p className="text-xs text-gray-500 mt-2">This may take a few seconds</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <PayPalButtons
        createOrder={createOrder}
        onApprove={onApprove}
        onCancel={onCancel}
        onError={handleError}
        style={{
          layout: 'vertical',
          color: 'blue',
          shape: 'rect',
          label: 'paypal'
        }}
        fundingSource="paypal"
      />
      <p className="text-xs text-gray-500 mt-3 text-center">
        By logging in with PayPal, you authorize ZenNest to send payouts to your PayPal account.
      </p>
    </div>
  );
};

export default PayPalLoginButton;

