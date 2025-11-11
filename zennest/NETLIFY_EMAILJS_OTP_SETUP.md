# Netlify EmailJS OTP Setup Guide

## Overview

This guide will help you configure EmailJS OTP (One-Time Password) functionality for both **Guest** and **Host** account creation on your Netlify-deployed Zennest application.

## Prerequisites

1. **EmailJS Account(s)** - You need at least one EmailJS account
   - **Registration Account** (OLD): For Guest and Host registration OTP emails
   - **Booking Account** (NEW): For booking confirmation emails (optional for OTP)

2. **EmailJS Service and Templates** - Already configured:
   - Guest Registration Template: `template_3fb5tc4`
   - Host Registration Template: `template_89gpyn2`
   - Service ID: `service_2pym6wm`

## Step 1: Get Your EmailJS Credentials

### Registration Account (For OTP Emails)

1. Log in to EmailJS Dashboard: https://dashboard.emailjs.com/admin
2. Navigate to **Account** → **General**
3. Find your **Public Key** (starts with `p_` or similar)
4. Navigate to **Email Services**
5. Find your service (ID: `service_2pym6wm`) and note the **Service ID**
6. Navigate to **Email Templates**
7. Note your template IDs:
   - Guest Registration: `template_3fb5tc4`
   - Host Registration: `template_89gpyn2`

## Step 2: Set Environment Variables on Netlify

### Method 1: Via Netlify Dashboard (Recommended)

1. **Go to Netlify Dashboard**
   - Visit: https://app.netlify.com
   - Select your site

2. **Navigate to Site Settings**
   - Click on **Site settings** in the left sidebar
   - Click on **Environment variables** under **Build & deploy**

3. **Add Environment Variables**
   Click **Add a variable** and add each of the following:

   #### Required for Guest Registration OTP:
   ```
   Variable name: VITE_EMAILJS_REGISTRATION_PUBLIC_KEY
   Value: p_q8TaCGGwI6hjYNY
   ```

   ```
   Variable name: VITE_EMAILJS_REGISTRATION_SERVICE_ID
   Value: service_2pym6wm
   ```

   ```
   Variable name: VITE_EMAILJS_REGISTRATION_TEMPLATE_ID
   Value: template_3fb5tc4
   ```

   #### Required for Host Registration OTP:
   ```
   Variable name: VITE_EMAILJS_REGISTRATION_HOST_TEMPLATE_ID
   Value: template_89gpyn2
   ```

   #### Optional (for password recovery):
   ```
   Variable name: VITE_EMAILJS_REGISTRATION_PASSWORD_RECOVERY_TEMPLATE_ID
   Value: (your password recovery template ID, if you have one)
   ```

4. **Save and Redeploy**
   - Click **Save** after adding all variables
   - Go to **Deploys** tab
   - Click **Trigger deploy** → **Deploy site** to rebuild with new environment variables

### Method 2: Via netlify.toml (Not Recommended for Secrets)

⚠️ **Warning**: Don't commit secrets to your repository. Use Netlify Dashboard instead.

If you must use `netlify.toml`, add:

```toml
[build.environment]
  VITE_EMAILJS_REGISTRATION_PUBLIC_KEY = "p_q8TaCGGwI6hjYNY"
  VITE_EMAILJS_REGISTRATION_SERVICE_ID = "service_2pym6wm"
  VITE_EMAILJS_REGISTRATION_TEMPLATE_ID = "template_3fb5tc4"
  VITE_EMAILJS_REGISTRATION_HOST_TEMPLATE_ID = "template_89gpyn2"
```

## Step 3: Verify EmailJS Service Configuration

### Check Email Service "To Email" Mapping

1. **Go to EmailJS Dashboard** → **Email Services**
2. **Select your service** (`service_2pym6wm`)
3. **Check "To Email" field mapping**:
   - For Guest Registration: Should map to `{{user_email}}`
   - For Host Registration: Should map to `{{to_email}}` or `{{user_email}}`

### Verify Template Parameters

1. **Guest Registration Template** (`template_3fb5tc4`):
   - Must include: `{{user_email}}`, `{{user_name}}`, `{{otp_code}}`, `{{expiry_time}}`

2. **Host Registration Template** (`template_89gpyn2`):
   - Must include: `{{to_email}}` or `{{user_email}}`, `{{user_name}}`, `{{otp_code}}`, `{{expiry_time}}`

## Step 4: Test OTP Functionality

### Test Guest Registration OTP

1. **Deploy your site** with environment variables set
2. **Visit your deployed site**
3. **Navigate to Registration page** (`/register`)
4. **Fill out the registration form**:
   - First Name
   - Last Name
   - Email
   - Password
   - Confirm Password
5. **Click "Create Account"**
6. **Check your email** for OTP code
7. **Enter OTP** on verification page
8. **Verify account is created** successfully

### Test Host Registration OTP

1. **Navigate to Host Registration** (`/host/register`)
2. **Fill out Step 1 form**:
   - First Name
   - Last Name
   - Email
   - Password (if not logged in)
   - Phone Number
   - Subscription Plan
3. **Accept Terms and Conditions**
4. **Click "Continue to Payment"**
5. **Check your email** for OTP code
6. **Enter OTP** on verification page
7. **Verify redirect to payment step**

## Step 5: Troubleshooting

### OTP Emails Not Sending

**Check 1: Environment Variables**
- Go to Netlify Dashboard → Site settings → Environment variables
- Verify all `VITE_EMAILJS_*` variables are set correctly
- Ensure variable names match exactly (case-sensitive)
- Redeploy after adding/changing variables

**Check 2: Browser Console**
- Open browser DevTools (F12)
- Go to Console tab
- Look for EmailJS logs:
  - `🔧 EmailJS Configuration Check (Registration Account)`
  - `📧 Sending beautiful email with parameters`
  - `✅ Beautiful email sent successfully!`
- Check for error messages

**Check 3: EmailJS Dashboard**
- Log in to EmailJS Dashboard
- Go to **Logs** section
- Check for failed email attempts
- Verify service is active and not paused

**Check 4: Email Service Configuration**
- Verify "To Email" field is mapped correctly
- Check template parameter names match code
- Ensure service is not rate-limited

### Common Errors

#### Error: "Failed to send verification email: The recipients address is empty"
**Solution**: 
- Check EmailJS service "To Email" mapping
- Ensure template uses correct email field (`{{user_email}}` or `{{to_email}}`)

#### Error: "Invalid EmailJS public key"
**Solution**:
- Verify `VITE_EMAILJS_REGISTRATION_PUBLIC_KEY` is set correctly
- Check for typos or extra spaces
- Redeploy after fixing

#### Error: "EmailJS service not authorized"
**Solution**:
- Verify service ID is correct
- Check service is active in EmailJS dashboard
- Ensure public key matches the account that owns the service

#### Error: "Template parameter mismatch"
**Solution**:
- Check template includes all required parameters
- Verify parameter names match exactly (case-sensitive)
- Check template ID is correct

### Debug Mode

To see detailed EmailJS logs in production:

1. **Open browser DevTools** (F12)
2. **Go to Console tab**
3. **Look for logs starting with**:
   - `🔧` (Configuration)
   - `📧` (Sending email)
   - `✅` (Success)
   - `❌` (Error)

## Step 6: Verify Production Deployment

### Checklist

- [ ] All environment variables set in Netlify Dashboard
- [ ] Site redeployed after setting variables
- [ ] Guest registration OTP email received
- [ ] Host registration OTP email received
- [ ] OTP verification works correctly
- [ ] Accounts created successfully after OTP verification
- [ ] No errors in browser console
- [ ] EmailJS dashboard shows successful sends

## Environment Variables Summary

### Required for OTP to Work:

```env
VITE_EMAILJS_REGISTRATION_PUBLIC_KEY=p_q8TaCGGwI6hjYNY
VITE_EMAILJS_REGISTRATION_SERVICE_ID=service_2pym6wm
VITE_EMAILJS_REGISTRATION_TEMPLATE_ID=template_3fb5tc4
VITE_EMAILJS_REGISTRATION_HOST_TEMPLATE_ID=template_89gpyn2
```

### Optional (for other features):

```env
VITE_EMAILJS_REGISTRATION_PASSWORD_RECOVERY_TEMPLATE_ID=template_xxxxx
VITE_EMAILJS_BOOKING_PUBLIC_KEY=UzKmW-bFf0VVts5x5
VITE_EMAILJS_BOOKING_SERVICE_ID=service_5t2qmca
VITE_EMAILJS_BOOKING_CONFIRMATION_TEMPLATE_ID=template_0ayttfm
VITE_EMAILJS_BOOKING_CANCELLATION_TEMPLATE_ID=template_o0l2xs8
```

## Important Notes

1. **Environment Variables are Public**: Since these are `VITE_*` variables, they are exposed in the client-side bundle. This is normal for EmailJS public keys, but be aware they're visible in the browser.

2. **Fallback Values**: The code has hardcoded fallback values, but for production, always use environment variables for flexibility.

3. **Redeploy Required**: After adding/changing environment variables, you must redeploy your site for changes to take effect.

4. **EmailJS Limits**: Free EmailJS accounts have monthly email limits. Monitor your usage in the EmailJS dashboard.

5. **OTP Expiration**: OTP codes expire after 15 minutes. Users can request a new OTP if needed.

## Support

If OTP still doesn't work after following this guide:

1. Check browser console for specific error messages
2. Check EmailJS dashboard logs
3. Verify all environment variables are set correctly
4. Ensure EmailJS service and templates are active
5. Test with a different email address
6. Check EmailJS account limits and quotas

## Quick Reference

- **Netlify Environment Variables**: https://app.netlify.com → Your Site → Site settings → Environment variables
- **EmailJS Dashboard**: https://dashboard.emailjs.com/admin
- **EmailJS Documentation**: https://www.emailjs.com/docs/

---

✅ **Once configured, both Guest and Host account creation will work with OTP verification on your deployed Netlify site!**

