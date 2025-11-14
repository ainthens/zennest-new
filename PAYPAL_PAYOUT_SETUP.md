# PayPal Payout Setup Guide

This guide explains how to set up the secure PayPal Payout (cashout) flow for hosts.

## Overview

The PayPal Payout implementation consists of:
1. **Backend API** (`/api/paypal/payout`) - Serverless function that securely handles PayPal authentication and payout creation
2. **Frontend Service** (`paypalService.js`) - Calls the backend API
3. **UI Components** (`HostPaymentsReceiving.jsx`) - Cash out button and success/error modals

## Backend Setup

### Environment Variables

You need to set the following environment variables on your hosting platform (Vercel/Netlify):

#### For Vercel:
1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

```env
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-secret-key
PAYPAL_MODE=sandbox
```

#### For Netlify:
1. Go to your Netlify site dashboard
2. Navigate to **Site settings** → **Environment variables**
3. Add the same variables as above

### Getting PayPal Credentials

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/)
2. Log in with your PayPal account
3. Navigate to **Apps & Credentials**
4. Select **Sandbox** (for testing) or **Live** (for production)
5. Under "REST API apps", find your app or create a new one
6. Copy the **Client ID** and **Secret Key**

**Important:**
- For testing, use **Sandbox** credentials
- For production, use **Live** credentials and set `PAYPAL_MODE=live`
- Never expose the Secret Key in frontend code - it's only used in the backend API

## Frontend Setup

### Environment Variables

The frontend only needs the PayPal Client ID (not the secret):

```env
VITE_PAYPAL_CLIENT_ID=your-paypal-client-id
```

This is already configured in your `.env` file.

### API Endpoint Configuration

The frontend automatically detects the API endpoint:
- For Vercel: Uses `/api/paypal/payout` (relative path)
- For Netlify: Uses `/api/paypal/payout` (relative path)

If you need to use a custom API URL, set:
```env
VITE_API_URL=https://your-api-domain.com/api/paypal/payout
```

## How It Works

### Cash Out Flow

1. **Host clicks "Cash Out" button**
   - Opens cashout modal
   - Host enters withdrawal amount

2. **Host clicks "Continue to PayPal Login"**
   - Opens PayPal login modal
   - Host logs in with PayPal Sandbox account

3. **Backend processes payout**
   - Frontend calls `/api/paypal/payout` with:
     - PayPal email (from login)
     - Amount
     - Currency (PHP)
   - Backend:
     - Gets PayPal OAuth token using Client ID + Secret
     - Creates PayPal payout batch
     - Returns payout batch ID and status

4. **Success/Error handling**
   - **Success**: Shows "Withdrawal Successful" modal with details
   - **Error**: Shows error message in cashout modal

### Security Features

✅ **Server-side authentication** - PayPal Secret Key never exposed to frontend
✅ **OAuth token generation** - Secure token-based authentication with PayPal
✅ **Input validation** - Email format and amount validation
✅ **Error handling** - Comprehensive error messages

## Testing

### PayPal Sandbox Accounts

1. Go to [PayPal Sandbox](https://developer.paypal.com/dashboard/accounts)
2. Create test accounts (Personal and Business)
3. Use these accounts to test the payout flow

### Test Flow

1. Log in as a host with earnings
2. Navigate to **Payments & Earnings** page
3. Click **Cash Out** button
4. Enter withdrawal amount (minimum ₱100)
5. Click **Continue to PayPal Login**
6. Log in with a PayPal Sandbox account
7. Verify the "Withdrawal Successful" modal appears
8. Check PayPal Sandbox account balance

## API Endpoints

### POST /api/paypal/payout

**Request Body:**
```json
{
  "paypalEmail": "user@example.com",
  "amount": 1000,
  "currency": "PHP"
}
```

**Success Response:**
```json
{
  "success": true,
  "payoutBatchId": "PAYOUT-1234567890-abc123",
  "status": "SUCCESS",
  "amount": 1000,
  "currency": "PHP",
  "paypalEmail": "user@example.com",
  "transactionId": "TXN-1234567890",
  "batchStatus": "SUCCESS",
  "message": "Payout of PHP 1000.00 has been successfully sent to user@example.com"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message here"
}
```

## Troubleshooting

### Backend API Not Working

1. **Check environment variables** - Ensure `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` are set
2. **Check PayPal mode** - Ensure `PAYPAL_MODE` is set to `sandbox` or `live`
3. **Check logs** - View serverless function logs in Vercel/Netlify dashboard
4. **Verify credentials** - Ensure PayPal credentials are correct and active

### Frontend Errors

1. **"PayPal Client ID not configured"** - Set `VITE_PAYPAL_CLIENT_ID` in `.env` file
2. **"Failed to process payout"** - Check backend API logs and PayPal credentials
3. **CORS errors** - Ensure API endpoint is correctly configured

### PayPal API Errors

1. **"Failed to authenticate with PayPal"** - Check Client ID and Secret are correct
2. **"Invalid payout parameters"** - Verify email format and amount > 0
3. **"Insufficient funds"** - Ensure PayPal account has sufficient balance (for testing, use Sandbox)

## Production Checklist

Before going live:

- [ ] Switch `PAYPAL_MODE` to `live`
- [ ] Update PayPal credentials to Live credentials
- [ ] Test with real PayPal accounts (small amounts first)
- [ ] Set up webhook handlers for payout status updates (optional)
- [ ] Monitor payout transactions in PayPal dashboard
- [ ] Set up error alerting for failed payouts

## Support

For issues or questions:
1. Check PayPal Developer Documentation: https://developer.paypal.com/docs/
2. Review serverless function logs
3. Test with PayPal Sandbox first before production

