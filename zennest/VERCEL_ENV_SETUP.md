# Vercel Environment Setup

## Required (Vite client-side)
- VITE_PAYPAL_CLIENT_ID
- VITE_CLOUDINARY_CLOUD_NAME
- VITE_CLOUDINARY_UPLOAD_PRESET
- VITE_EMAILJS_REGISTRATION_PUBLIC_KEY
- VITE_EMAILJS_REGISTRATION_SERVICE_ID
- VITE_EMAILJS_REGISTRATION_TEMPLATE_ID
- VITE_EMAILJS_REGISTRATION_HOST_TEMPLATE_ID

## Steps
1) Vercel Dashboard → Project → Settings → Environment Variables
2) Add variables above (Production, Preview, Development scopes)
3) Redeploy to apply env vars (new build required)

## Verify (production)
- PayPal buttons render (no Client ID warning)
- Cloudinary videos load in [`src/pages/Services.jsx`](zennest/src/pages/Services.jsx) and [`src/pages/Experiences.jsx`](zennest/src/pages/Experiences.jsx)
- EmailJS OTP flows work (guest/host)