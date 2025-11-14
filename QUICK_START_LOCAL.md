# 🚀 Quick Start: Local Development Setup

## Step 1: Install Dependencies

In the **root directory** (where `server.js` is located):

```bash
npm install
```

This will install:
- `express` - Web server framework
- `cors` - Cross-origin resource sharing
- `dotenv` - Environment variable loader

## Step 2: Create `.env.local` File

Create a `.env.local` file in the **root directory**:

```env
# PayPal API Credentials (for local API server)
PAYPAL_CLIENT_ID=your-paypal-client-id-here
PAYPAL_CLIENT_SECRET=your-paypal-secret-here
PAYPAL_MODE=sandbox
```

**Get your credentials from:**
1. https://developer.paypal.com/dashboard/
2. Apps & Credentials → Sandbox tab
3. Copy Client ID and Secret

## Step 3: Start Local API Server

```bash
npm run dev:api
```

You should see:
```
🚀 Local PayPal Payout API server running on http://localhost:3001
📡 API endpoint: http://localhost:3001/api/paypal/payout
```

## Step 4: Start Frontend (in separate terminal)

```bash
cd zennest
npm run dev
```

## Step 5: Test Cashout

1. Open your app: `http://localhost:5173`
2. Navigate to Host Payments page
3. Click "Cash Out"
4. Enter PayPal email and amount
5. Click "Process Cash Out"

---

## ✅ For Vercel Deployment

See `VERCEL_ENV_SETUP.md` for complete instructions on setting up environment variables in Vercel.

**Quick Steps:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MODE`
3. Redeploy your application

---

## 🐛 Troubleshooting

### "PayPal credentials not configured"
- Check `.env.local` exists in root directory
- Verify credentials are correct
- Restart the server after creating `.env.local`

### "Cannot connect to API"
- Make sure `npm run dev:api` is running
- Check port 3001 is not in use
- Verify frontend is calling `http://localhost:3001/api/paypal/payout`

### Port Already in Use
Change port in `server.js`:
```javascript
const PORT = process.env.PORT || 3002; // Change 3001 to 3002
```

