# 🚀 Complete Guide: Setting Up PayPal Payout API for Localhost & Vercel

## Overview
This guide will help you set up the PayPal Payout API to work in both:
- ✅ **Localhost** (for local development)
- ✅ **Vercel** (for production deployment)

---

## 📋 Part 1: Vercel Environment Variables Setup

### Step 1: Get Your PayPal Credentials

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/)
2. Log in with your PayPal account
3. Navigate to **Apps & Credentials**
4. Make sure you're on the **Sandbox** tab (for testing)
5. Under "REST API apps", find your app or create a new one
6. Copy these values:
   - **Client ID** (e.g., `Aa1d32EXWKMFsgmQqm_Xri-h9FP6wDDQ4qqg2oLz2jjogpBxgBDLFdyksTZwooCQWVIy6qMXQwvULw-o`)
   - **Secret** (click "Show" to reveal it)

### Step 2: Add Environment Variables to Vercel

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project (`zennest` or your project name)
3. Click on **Settings** (in the top menu)
4. Click on **Environment Variables** (in the left sidebar)
5. Add these three variables:

#### Variable 1: `PAYPAL_CLIENT_ID`
- **Key:** `PAYPAL_CLIENT_ID`
- **Value:** Your PayPal Client ID (from Step 1)
- **Environment:** Select all (Production, Preview, Development)
- Click **Save**

#### Variable 2: `PAYPAL_CLIENT_SECRET`
- **Key:** `PAYPAL_CLIENT_SECRET`
- **Value:** Your PayPal Secret Key (from Step 1)
- **Environment:** Select all (Production, Preview, Development)
- Click **Save**

#### Variable 3: `PAYPAL_MODE`
- **Key:** `PAYPAL_MODE`
- **Value:** `sandbox` (for testing) or `live` (for production)
- **Environment:** Select all (Production, Preview, Development)
- Click **Save**

### Step 3: Redeploy Your Application

**⚠️ IMPORTANT:** After adding environment variables, you MUST redeploy:

1. Go to **Deployments** tab
2. Find your latest deployment
3. Click the three dots (⋯) next to it
4. Click **Redeploy**
5. Wait for deployment to complete

**Why?** Environment variables are only loaded when the function is deployed. Existing deployments won't have access to newly added variables.

---

## 📋 Part 2: Localhost Setup

### Option A: Using Local Express Server (Recommended for Testing)

#### Step 1: Install Dependencies

```bash
# In the root directory (where server.js is located)
npm install express cors dotenv
```

#### Step 2: Create `.env.local` File

Create a `.env.local` file in the **root directory** (same level as `server.js`):

```env
# PayPal API Credentials (for local server)
PAYPAL_CLIENT_ID=your-paypal-client-id-here
PAYPAL_CLIENT_SECRET=your-paypal-secret-here
PAYPAL_MODE=sandbox

# Frontend PayPal Client ID (for React app)
VITE_PAYPAL_CLIENT_ID=your-paypal-client-id-here
```

**Replace:**
- `your-paypal-client-id-here` with your actual PayPal Client ID
- `your-paypal-secret-here` with your actual PayPal Secret

#### Step 3: Start the Local API Server

```bash
# In the root directory
node server.js
```

You should see:
```
🚀 Local PayPal Payout API server running on http://localhost:3001
📡 API endpoint: http://localhost:3001/api/paypal/payout
```

#### Step 4: Start Your Frontend Dev Server

In a **separate terminal**, start your React app:

```bash
# In the zennest directory
cd zennest
npm run dev
```

#### Step 5: Test the Cashout Flow

1. Open your app: `http://localhost:5173` (or whatever port Vite uses)
2. Navigate to the Host Payments page
3. Try cashing out
4. Check both terminals for logs

### Option B: Using Deployed Vercel URL (Simpler, but requires Vercel setup)

If you've already set up Vercel environment variables (Part 1), you can use the deployed API directly:

1. The code will automatically use `https://zennest.vercel.app/api/paypal/payout` in development
2. No local server needed
3. Just make sure Vercel environment variables are set and you've redeployed

---

## 🔍 Troubleshooting

### Issue: "PayPal credentials not configured on server"

**For Vercel:**
- ✅ Check that environment variables are set in Vercel dashboard
- ✅ Make sure you **redeployed** after adding variables
- ✅ Verify variable names are exactly: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MODE`
- ✅ Check Vercel function logs: Go to Deployments → Latest → Functions → `/api/paypal/payout` → Logs

**For Localhost:**
- ✅ Check that `.env.local` exists in the root directory
- ✅ Verify the file has `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MODE`
- ✅ Make sure you restarted the local server after creating `.env.local`
- ✅ Check that the server is running on `http://localhost:3001`

### Issue: "API endpoint not found" (404)

**For Localhost:**
- ✅ Make sure `server.js` is running (`node server.js`)
- ✅ Check that the server is listening on port 3001
- ✅ Verify the frontend is calling `http://localhost:3001/api/paypal/payout`

**For Vercel:**
- ✅ Check that `api/paypal/payout.js` exists in your project root
- ✅ Verify the file is committed and pushed to your repository
- ✅ Check Vercel deployment logs to see if the function was detected

### Issue: CORS Errors

- ✅ The API server includes CORS headers
- ✅ If you see CORS errors, check that the API URL matches what the frontend is calling

---

## 📝 Quick Checklist

### Vercel Setup:
- [ ] PayPal credentials obtained from PayPal Developer Dashboard
- [ ] `PAYPAL_CLIENT_ID` added to Vercel environment variables
- [ ] `PAYPAL_CLIENT_SECRET` added to Vercel environment variables
- [ ] `PAYPAL_MODE` set to `sandbox` in Vercel
- [ ] Application redeployed after adding environment variables
- [ ] Tested cashout flow on deployed Vercel site

### Localhost Setup:
- [ ] Installed Express dependencies (`npm install express cors dotenv`)
- [ ] Created `.env.local` file in root directory
- [ ] Added PayPal credentials to `.env.local`
- [ ] Started local API server (`node server.js`)
- [ ] Started frontend dev server (`cd zennest && npm run dev`)
- [ ] Tested cashout flow on localhost

---

## 🎯 Testing

### Test the API Directly (Localhost)

```bash
curl -X POST http://localhost:3001/api/paypal/payout \
  -H "Content-Type: application/json" \
  -d '{
    "paypalEmail": "your-sandbox-email@example.com",
    "amount": 100,
    "currency": "PHP"
  }'
```

### Test the API Directly (Vercel)

```bash
curl -X POST https://zennest.vercel.app/api/paypal/payout \
  -H "Content-Type: application/json" \
  -d '{
    "paypalEmail": "your-sandbox-email@example.com",
    "amount": 100,
    "currency": "PHP"
  }'
```

---

## 📚 Additional Resources

- [PayPal Developer Documentation](https://developer.paypal.com/docs/api/payments.payouts-batch/v1/)
- [Vercel Environment Variables Guide](https://vercel.com/docs/concepts/projects/environment-variables)
- [Vercel Serverless Functions](https://vercel.com/docs/concepts/functions/serverless-functions)

---

## ✅ Success Indicators

You'll know everything is working when:
1. ✅ Cashout modal opens without errors
2. ✅ You can enter PayPal email and amount
3. ✅ Clicking "Process Cash Out" shows a success message
4. ✅ No errors in browser console
5. ✅ No errors in server logs (local) or Vercel function logs (production)
6. ✅ Transaction appears in PayPal Sandbox dashboard

---

**Need Help?** Check the console logs and Vercel function logs for detailed error messages.

