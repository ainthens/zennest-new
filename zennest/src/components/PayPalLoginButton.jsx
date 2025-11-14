// PayPalLoginButton.jsx - Component for PayPal authentication/login
import React from 'react';
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
  const [{ isPending, isResolved }] = usePayPalScriptReducer();
z
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
        locale: 'en_PH',
        landing_page: 'LOGIN',
        user_action: 'PAY_NOW'
      }
    });
  };

  // Handle approval - extract PayPal account info
  const onApprove = async (data, actions) => {
    try {
      // Capture the payment to get PayPal account details
      const details = await actions.order.capture();
      
      // Extract PayPal account information
      const payer = details.payer;
      const payerInfo = payer?.payer_info;
      
      const paypalData = {
        email: payerInfo?.email || payer?.email_address || '',
        payerId: payerInfo?.payer_id || payer?.payer_id || data.payerID || '',
        name: payerInfo?.first_name && payerInfo?.last_name
          ? `${payerInfo.first_name} ${payerInfo.last_name}`
          : payerInfo?.first_name || payerInfo?.last_name || payer?.name?.given_name || payer?.name?.surname || '',
        orderId: data.orderID,
        details: details
      };

      console.log('✅ PayPal authentication successful:', paypalData);
      
      // Call success callback with PayPal account data
      if (onSuccess) {
        onSuccess(paypalData);
      }
    } catch (error) {
      console.error('Error processing PayPal approval:', error);
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

  if (!isResolved) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading PayPal...</span>
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
          label: 'login'
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

