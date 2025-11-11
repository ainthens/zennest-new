# PayPal Sandbox Setup for Netlify Deployment

This guide will help you configure PayPal Sandbox for your Zennest app deployed on Netlify.

## Step 1: Get Your PayPal Sandbox Client ID

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/)
2. Log in with your PayPal account
3. Navigate to **"My Apps & Credentials"** in the left sidebar
4. Make sure you're on the **"Sandbox"** tab (not Live)
5. Create a new app or use an existing one:
   - Click **"Create App"**
   - App Name: `Zennest Host Subscription`
   - Select your sandbox business account
   - Features: ✅ Accept Payments, ✅ Future Payments
   - App Type: `Merchant`
6. Copy your **Client ID** (starts with something like `AbCdEf...`)

## Step 2: Configure Environment Variable in Netlify

### Method 1: Using Netlify Dashboard (Recommended)

1. Log in to your [Netlify Dashboard](https://app.netlify.com/)
2. Select your site
3. Go to **Site settings** → **Environment variables** (under "Build & deploy")
4. Click **"Add a variable"**
5. Add the following:
   - **Key**: `VITE_PAYPAL_CLIENT_ID`
   - **Value**: Your PayPal Sandbox Client ID (paste the Client ID you copied)
   - **Scopes**: Select "All scopes" or "Production", "Deploy Preview", "Branch Deploys" as needed
6. Click **"Save"**

### Method 2: Using Netlify CLI

```bash
# Install Netlify CLI if you haven't
npm install -g netlify-cli

# Log in to Netlify
netlify login

# Set the environment variable
netlify env:set VITE_PAYPAL_CLIENT_ID "AUh8H1MBh2qSPKxSU0ZApsB3WN8SFOZ6E4vWKtGMD347Htb-NFV2wsVOh-rRr1_XHwZUgIOEJ06caKoU"

# Verify it was set
netlify env:list
```

## Step 3: Redeploy Your Site

After adding the environment variable:

1. Go to your Netlify site dashboard
2. Click **"Trigger deploy"** → **"Clear cache and deploy site"**
3. Wait for the deployment to complete

**Note**: Environment variables are only available at build time for Vite apps. You must redeploy after adding/changing environment variables.

## Step 4: Verify Configuration

1. Visit your deployed site
2. Navigate to a payment page (e.g., `/host/register` or `/payment`)
3. You should see the PayPal payment button
4. If you see an error message about PayPal Client ID, check:
   - Environment variable is set correctly in Netlify
   - Site has been redeployed after adding the variable
   - Variable name is exactly `VITE_PAYPAL_CLIENT_ID` (case-sensitive)

## Testing PayPal Sandbox

### Using Sandbox Test Accounts

1. Click the PayPal button on your site
2. You'll be redirected to PayPal Sandbox (not real PayPal)
3. Log in with a sandbox test account:
   - Go to PayPal Developer Dashboard → **"Accounts"** → **"Sandbox"**
   - Create a test account if you don't have one
   - Use the test account email and password to log in
4. Complete the payment flow
5. Payment should be processed successfully (no real money is charged)

### Test Card Numbers (Alternative)

If you choose "Pay with Debit or Credit Card" on the PayPal page:

- **Card Number**: `4111111111111111` (Visa test card)
- **Expiry Date**: Any future date (e.g., `12/25`)
- **CVV**: Any 3 digits (e.g., `123`)
- **Name**: Any name
- **ZIP Code**: Any 5 digits

## Troubleshooting

### Issue: PayPal button not showing

**Solution**:
1. Check browser console for errors
2. Verify `VITE_PAYPAL_CLIENT_ID` is set in Netlify
3. Make sure you've redeployed after adding the variable
4. Check that the variable value doesn't have extra spaces

### Issue: "Invalid Client ID" error

**Solution**:
1. Verify you copied the Client ID correctly (no extra spaces)
2. Make sure you're using Sandbox Client ID, not Live
3. Check that the environment variable is set for the correct scope (Production/Preview/Branch)

### Issue: Payment fails immediately

**Solution**:
1. Verify you're using a sandbox test account, not a real PayPal account
2. Check that the PayPal app has the correct permissions enabled
3. Check browser console for detailed error messages
4. Verify the currency is set to 'PHP' (Philippine Peso)

### Issue: Environment variable not loading

**Solution**:
1. Make sure the variable name starts with `VITE_` (required for Vite)
2. Redeploy your site after adding/changing the variable
3. Clear browser cache and try again
4. Check Netlify build logs for any errors

### Issue: Currency mismatch errors

**Solution**:
- The app is configured to use PHP (Philippine Peso)
- Make sure your PayPal app supports PHP currency
- Check that all payment flows use PHP consistently

## Production Setup (When Ready)

When you're ready to go live:

1. Switch to **"Live"** tab in PayPal Developer Dashboard
2. Create a Live app (similar process)
3. Get Live Client ID
4. Update `VITE_PAYPAL_CLIENT_ID` in Netlify with the Live Client ID
5. Redeploy your site
6. Test with small amounts first
7. Complete PayPal business verification if required

## Important Notes

⚠️ **Security**:
- Never expose your PayPal Secret key in frontend code
- Client ID is safe to expose (that's its purpose)
- For production, consider using server-side payment processing for sensitive operations

⚠️ **Sandbox vs Live**:
- Sandbox is for testing only - no real money is processed
- Never use sandbox credentials in production
- Always test thoroughly in sandbox before going live

⚠️ **Environment Variables**:
- Environment variables are only available at build time for Vite
- You must redeploy after adding/changing environment variables
- Variable names are case-sensitive

## Support

- PayPal Developer Docs: https://developer.paypal.com/docs/
- PayPal Sandbox Testing Guide: https://developer.paypal.com/docs/api-basics/sandbox/
- Netlify Environment Variables: https://docs.netlify.com/environment-variables/overview/
- PayPal Support: https://www.paypal.com/support

