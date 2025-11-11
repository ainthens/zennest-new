# OTP Setup Quick Start Guide

## For Netlify Deployment

### Step 1: Set Environment Variables in Netlify

1. Go to **Netlify Dashboard** → Your Site → **Site settings** → **Environment variables**
2. Add these 4 required variables:

```
VITE_EMAILJS_REGISTRATION_PUBLIC_KEY = p_q8TaCGGwI6hjYNY
VITE_EMAILJS_REGISTRATION_SERVICE_ID = service_2pym6wm
VITE_EMAILJS_REGISTRATION_TEMPLATE_ID = template_3fb5tc4
VITE_EMAILJS_REGISTRATION_HOST_TEMPLATE_ID = template_89gpyn2
```

3. Click **Save**
4. Go to **Deploys** tab → **Trigger deploy** → **Deploy site**

### Step 2: Verify EmailJS Service Configuration

1. Go to **EmailJS Dashboard**: https://dashboard.emailjs.com/admin
2. Navigate to **Email Services** → Select `service_2pym6wm`
3. Check **"To Email"** field mapping:
   - Should map to `{{user_email}}` for guest registration
   - Should map to `{{to_email}}` or `{{user_email}}` for host registration

### Step 3: Test

1. **Guest Registration**: Go to `/register` → Fill form → Check email for OTP
2. **Host Registration**: Go to `/host/register` → Fill Step 1 → Check email for OTP

### Troubleshooting

**OTP not sending?**
- ✅ Check environment variables are set in Netlify
- ✅ Redeploy site after setting variables
- ✅ Check browser console (F12) for errors
- ✅ Check EmailJS dashboard logs

**Error: "Email service not configured"**
- Set `VITE_EMAILJS_REGISTRATION_PUBLIC_KEY` in Netlify
- Redeploy site

**Error: "The recipients address is empty"**
- Check EmailJS service "To Email" mapping
- Ensure template uses `{{user_email}}` or `{{to_email}}`

## Full Documentation

See `NETLIFY_EMAILJS_OTP_SETUP.md` for detailed instructions.

