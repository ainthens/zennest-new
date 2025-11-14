# PayPal Payout Troubleshooting Guide

## Quick Debugging Steps

### 1. Check Browser Console
Open your browser's Developer Tools (F12) and check the Console tab when you try to cash out. Look for:
- `💰 PayPal Payout Request:` - Shows the API URL being called
- `PayPal Payout API Error:` - Shows detailed error information
- Any red error messages

### 2. Check Vercel Function Logs

1. Go to your Vercel project dashboard
2. Click on **Deployments**
3. Click on the latest deployment
4. Click on **Functions** tab
5. Find `/api/paypal/payout`
6. Click on it to see the logs

Look for:
- `PayPal credentials not configured` - Environment variables not set
- `PayPal OAuth token error:` - Authentication failed
- `PayPal Payout error:` - Payout creation failed
- `Error processing PayPal payout:` - General error

### 3. Verify Environment Variables in Vercel

1. Go to Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Verify these are set:
   - `PAYPAL_CLIENT_ID` - Your PayPal Client ID
   - `PAYPAL_CLIENT_SECRET` - Your PayPal Secret Key
   - `PAYPAL_MODE` - Should be `sandbox` for testing

**Important:** After adding/updating environment variables, you MUST redeploy:
- Go to **Deployments**
- Click the three dots (⋯) on the latest deployment
- Click **Redeploy**

### 4. Test the API Endpoint Directly

You can test the API endpoint using curl or Postman:

```bash
curl -X POST https://your-vercel-app.vercel.app/api/paypal/payout \
  -H "Content-Type: application/json" \
  -d '{
    "paypalEmail": "test@example.com",
    "amount": 100,
    "currency": "PHP"
  }'
```

Replace `your-vercel-app.vercel.app` with your actual Vercel domain.

### 5. Common Issues and Solutions

#### Issue: "PayPal credentials not configured on server"
**Solution:**
- Check that environment variables are set in Vercel
- Make sure variable names are exactly: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MODE`
- Redeploy after adding variables

#### Issue: "Failed to authenticate with PayPal"
**Solution:**
- Verify your PayPal Client ID and Secret are correct
- Make sure you're using Sandbox credentials if `PAYPAL_MODE=sandbox`
- Check that your PayPal app is active in PayPal Developer Dashboard

#### Issue: "Failed to process PayPal payout"
**Solution:**
- Check the error details in Vercel logs
- Verify the PayPal email address is valid
- Make sure the amount is greater than 0
- Check PayPal Sandbox account has sufficient balance (for testing)

#### Issue: "CORS error" or "Network error"
**Solution:**
- The API now includes CORS headers
- Make sure you're calling the correct API URL
- Check that the Vercel function is deployed correctly

#### Issue: "404 Not Found" when calling API
**Solution:**
- Verify the API file is at `api/paypal/payout.js` (root level, not in zennest folder)
- Check that the file is committed to git
- Redeploy to Vercel

### 6. Verify API File Location

The API file should be at:
```
your-project-root/
  api/
    paypal/
      payout.js
```

NOT at:
```
zennest/
  api/
    paypal/
      payout.js  ❌ WRONG
```

### 7. Check PayPal Sandbox Setup

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/)
2. Navigate to **Apps & Credentials**
3. Make sure you're on the **Sandbox** tab
4. Verify your app exists and is active
5. Copy the Client ID and Secret exactly (no extra spaces)

### 8. Enable Detailed Logging

The updated code now includes detailed error logging. Check:

**In Browser Console:**
- Look for `PayPal Payout API Error:` with full details

**In Vercel Logs:**
- Look for detailed error objects with status codes and error messages

### 9. Test with Minimal Example

Try this minimal test in your browser console (on your deployed site):

```javascript
fetch('/api/paypal/payout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    paypalEmail: 'test@example.com',
    amount: 100,
    currency: 'PHP'
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

This will show you the exact error message.

### 10. Verify Vercel Function is Deployed

1. Go to Vercel dashboard
2. Check **Functions** tab
3. You should see `/api/paypal/payout` listed
4. If not, the file might not be in the correct location or not committed

## Still Not Working?

If you're still having issues:

1. **Share the exact error message** from browser console
2. **Share the Vercel function logs** (screenshot or copy-paste)
3. **Verify your PayPal credentials** are correct
4. **Check that you redeployed** after adding environment variables

## Quick Checklist

- [ ] Environment variables set in Vercel (`PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MODE`)
- [ ] Redeployed after adding environment variables
- [ ] API file is at `api/paypal/payout.js` (root level)
- [ ] PayPal credentials are correct (Sandbox for testing)
- [ ] Checked browser console for errors
- [ ] Checked Vercel function logs
- [ ] Tested API endpoint directly

