# 🚀 How to Start Local API Server

## Quick Start

### Option 1: Use Deployed Vercel API (Easiest - No Setup Needed)

**Just make sure Vercel environment variables are set and you're good to go!**

The frontend will automatically use `https://zennest.vercel.app/api/paypal/payout` in development.

---

### Option 2: Use Local Server (For Testing)

If you want to test locally without deploying:

#### Step 1: Install Dependencies

In the **root directory** (where `server.js` is):

```bash
npm install
```

#### Step 2: Create `.env.local` File

Create `.env.local` in the **root directory**:

```env
PAYPAL_CLIENT_ID=your-paypal-client-id-here
PAYPAL_CLIENT_SECRET=your-paypal-secret-here
PAYPAL_MODE=sandbox
```

#### Step 3: Start the Local Server

```bash
npm run dev:api
```

You should see:
```
🚀 Local PayPal Payout API server running on http://localhost:3001
📡 API endpoint: http://localhost:3001/api/paypal/payout
```

**Keep this terminal open!** The server needs to keep running.

#### Step 4: Update Frontend to Use Local Server

Create or update `.env.local` in the **`zennest` directory**:

```env
VITE_API_URL=http://localhost:3001/api/paypal/payout
```

#### Step 5: Restart Frontend Dev Server

```bash
cd zennest
npm run dev
```

---

## Current Error: "Failed to fetch" / "Connection Refused"

This means the local server isn't running. You have two options:

### ✅ Option A: Use Deployed Vercel API (Recommended)

1. Make sure Vercel environment variables are set (see `VERCEL_ENV_SETUP.md`)
2. The frontend will automatically use the deployed API
3. No local server needed!

### ✅ Option B: Start Local Server

1. Follow "Option 2" steps above
2. Make sure both servers are running:
   - Local API server: `npm run dev:api` (root directory)
   - Frontend: `npm run dev` (zennest directory)

---

## Troubleshooting

### "Connection Refused" Error

**Cause:** Local server isn't running on port 3001

**Solution:**
- Start the server: `npm run dev:api` (in root directory)
- Or use the deployed Vercel API (no local server needed)

### Port 3001 Already in Use

**Solution:** Change port in `server.js`:
```javascript
const PORT = process.env.PORT || 3002; // Change to 3002 or any available port
```

Then update `.env.local` in zennest:
```env
VITE_API_URL=http://localhost:3002/api/paypal/payout
```

### "PayPal credentials not configured"

**Solution:** Make sure `.env.local` exists in root directory with PayPal credentials

---

## Recommendation

**For easiest setup:** Just use the deployed Vercel API. Make sure:
1. ✅ Vercel environment variables are set
2. ✅ Application is redeployed
3. ✅ Frontend will automatically use the deployed API

No local server needed! 🎉

