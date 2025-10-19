# Clerk Authentication Setup

## Getting Clerk API Keys

1. Go to [https://dashboard.clerk.com](https://dashboard.clerk.com)
2. Sign up or log in to your account
3. Click "Add application" or select your existing application
4. Go to "API Keys" in the left sidebar
5. Copy your keys:
   - **Publishable Key** (starts with `pk_test_` or `pk_live_`)
   - **Secret Key** (starts with `sk_test_` or `sk_live_`)

## Update Environment Variables

Open `.env.local` and replace the placeholder values:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_actual_key_here
CLERK_SECRET_KEY=sk_test_your_actual_secret_here
```

## Configure Clerk Dashboard

In your Clerk Dashboard:

1. Go to **Paths** in the left sidebar
2. Set the following paths:
   - Sign-in path: `/sign-in`
   - Sign-up path: `/sign-up`
   - After sign-in URL: `/mantras`
   - After sign-up URL: `/mantras`

3. Go to **Session & Authentication** and configure:
   - Enable email authentication
   - (Optional) Enable Google/other OAuth providers
   - (Optional) Enable multi-factor authentication

## Test Authentication

1. Start your dev server: `npm run dev`
2. Visit `http://localhost:3000`
3. Click "Sign In" in the top right
4. Create a test account
5. You should be redirected to `/mantras` after signing up

## Features Included

✅ Protected routes (all routes except homepage and sign-in/sign-up require authentication)
✅ Sign-in and sign-up pages with custom styling
✅ User profile button on all protected pages
✅ Automatic redirect to sign-in for unauthenticated users
✅ Sign-out functionality through user menu

## Next Steps

After authentication is working, you can:
- Connect a database to store user practice data
- Add user progress tracking
- Implement practice history features
- Add user preferences and settings
