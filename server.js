// Local development server for PayPal Payout API
// Run with: node server.js
// This allows testing the API locally before deploying to Vercel

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from .env.local or .env
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS
app.use(cors());
app.use(express.json());

// Import the payout handler
import payoutHandler from './api/paypal/payout.js';

// Convert Vercel serverless function format to Express
app.post('/api/paypal/payout', async (req, res) => {
  // Convert Express req/res to Vercel format
  const vercelReq = {
    method: req.method,
    body: req.body,
    headers: req.headers
  };

  // Create a proper res object compatible with Vercel format
  const responseWrapper = {
    statusCode: 200,
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      res.status(this.statusCode).json(data);
    },
    setHeader: function(name, value) {
      res.setHeader(name, value);
    },
    end: function() {
      res.status(this.statusCode).end();
    }
  };

  try {
    await payoutHandler(vercelReq, responseWrapper);
  } catch (error) {
    console.error('Error in payout handler:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'PayPal Payout API server is running' });
});

app.listen(PORT, () => {
  console.log(`🚀 Local PayPal Payout API server running on http://localhost:${PORT}`);
  console.log(`📡 API endpoint: http://localhost:${PORT}/api/paypal/payout`);
  console.log(`\n⚠️  Make sure you have these environment variables set:`);
  console.log(`   - PAYPAL_CLIENT_ID`);
  console.log(`   - PAYPAL_CLIENT_SECRET`);
  console.log(`   - PAYPAL_MODE (optional, defaults to 'sandbox')`);
  console.log(`\n💡 Check your .env.local or .env file\n`);
});

