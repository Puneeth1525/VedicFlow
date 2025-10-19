# Clerk Authentication Setup - Passwordless Magic Link

## 🎯 Authentication Strategy

This app uses **passwordless authentication** with email magic links for the best user experience:
- ✅ No passwords to remember
- ✅ One-click sign-in via email
- ✅ Long sessions (30 days) - sign in once per device
- ✅ Full name required for personalization

## Step 1: Get Clerk API Keys

1. Go to [https://dashboard.clerk.com](https://dashboard.clerk.com)
2. Sign up or log in to your account
3. Click **"Add application"** or select your existing application
4. Go to **"API Keys"** in the left sidebar
5. Copy your keys:
   - **Publishable Key** (starts with `pk_test_` or `pk_live_`)
   - **Secret Key** (starts with `sk_test_` or `sk_live_`)

## Step 2: Update Environment Variables

Open `.env.local` and replace the placeholder values:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_actual_key_here
CLERK_SECRET_KEY=sk_test_your_actual_secret_here
```

## Step 3: Configure Passwordless Authentication

In your Clerk Dashboard, follow these steps carefully:

### A. Configure Email Magic Links

1. Go to **"User & Authentication" → "Email, Phone, Username"**
2. Under **Email address**:
   - ✅ Enable "Email address"
   - ✅ Set as "Required"
   - ✅ Enable "Email verification link" (this is the magic link)
   - ❌ **DISABLE "Email verification code"** (we don't want OTP)
3. Under **Username**:
   - ❌ Disable username (we only use email)
4. Under **Phone number**:
   - ❌ Disable phone (email only for now)

### B. Disable Password Authentication

1. Still in **"User & Authentication"**
2. Go to **"Password"** section
3. ❌ **Turn OFF "Password"** completely
4. This forces users to use magic links only

### C. Require Full Name

1. Go to **"User & Authentication" → "Personal Information"**
2. Under **Name**:
   - ✅ Enable "Name"
   - ✅ Set as **"Required"**
   - ✅ Enable "First name" and "Last name" as separate fields (optional, or use combined "Name")

### D. Configure Session Duration

1. Go to **"Sessions"** in the left sidebar
2. Set **"Maximum inactive period"** to **30 days**
3. Set **"Maximum lifetime"** to **90 days** (optional, for extra long sessions)
4. This ensures users stay logged in for a long time

### E. Set Up Paths

1. Go to **"Paths"** in the left sidebar
2. Set the following:
   - **Sign-in path**: `/sign-in`
   - **Sign-up path**: `/sign-up`
   - **After sign-in URL**: `/mantras`
   - **After sign-up URL**: `/mantras`
   - **Home URL**: `/`

### F. Customize Email Templates (Optional)

1. Go to **"Customization" → "Emails"**
2. Customize the magic link email template:
   - Make it match your Vedic theme
   - Add your app logo
   - Customize the message

## Step 4: Test Authentication Flow

1. **Start your dev server**:
   ```bash
   npm run dev
   ```

2. **Visit** `http://localhost:3000`

3. **Click "Sign In"** in the top right

4. **Sign Up Flow**:
   - Enter your email address
   - Enter your full name (required)
   - Click "Continue"
   - Check your email for the magic link
   - Click the magic link → You're signed in! 🎉

5. **Sign In Flow** (for returning users):
   - Enter your email
   - Check email for magic link
   - Click link → Instantly signed in!

6. **Verify**:
   - You should be redirected to `/mantras`
   - Your profile picture/name should appear in top right
   - Try closing the browser and reopening - you should still be logged in!

## Features Included

✅ **Passwordless magic link authentication** - No passwords needed
✅ **Email-only sign-in** - Simple and secure
✅ **Required full name** - Personalized experience
✅ **Long sessions (30 days)** - Sign in once per device
✅ **Protected routes** - All routes except homepage require authentication
✅ **Beautiful custom UI** - Matches Vedic theme
✅ **User profile management** - Edit profile, sign out via user menu

## Common Issues & Solutions

### Magic link not arriving?
- Check spam folder
- Make sure email verification is enabled in Clerk dashboard
- Try with a different email provider (Gmail works best)

### Still seeing password fields?
- Go back to Clerk dashboard → User & Authentication → Password
- Make sure it's completely disabled
- Clear browser cache and try again

### Name field not showing?
- Go to Personal Information section
- Make sure "Name" is enabled and set to "Required"

## Future Enhancements (Coming Soon)

Once basic authentication is working, we can add:
- 🔐 Google OAuth (one-click sign-in with Google)
- 📱 Apple Sign-In
- 🔑 Passkeys (Face ID / Touch ID)
- 📊 User practice history in database
- 🏆 Achievement tracking
- 📈 Progress analytics

## Need Help?

- [Clerk Documentation](https://clerk.com/docs)
- [Clerk Community](https://clerk.com/discord)
- Check the console for any error messages
