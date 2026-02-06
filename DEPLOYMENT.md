# Deployment Guide for Ada's Digital Sovereignty Vision

This is a **Next.js** application with API routes. The API key is kept secure on the server-side and never exposed to the client.

## Important: Environment Variables in Next.js

Next.js API routes run on the server, so:
- Environment variables are **never exposed to the client**
- The `API_KEY` is only accessible in server-side code (`app/api/*/route.ts`)
- This provides better security than client-side API key usage

## Deploying to Vercel

### Step 1: Set Environment Variable in Vercel

1. Go to your **Vercel Dashboard** → Select your project
2. Navigate to **Settings** → **Environment Variables**
3. Add a new variable:
   - **Name**: `API_KEY`
   - **Value**: Your Google Gemini API key
   - **Environments**: Select all (Production, Preview, Development)
4. Click **Save**

### Step 2: Redeploy

After adding the environment variable:
- **Option A**: Trigger a new deployment manually
- **Option B**: Push a new commit to trigger automatic deployment
- **Option C**: Go to **Deployments** tab → Click **Redeploy** on the latest deployment

### Step 3: Verify the Build

During the build process, Next.js will:
1. Read `API_KEY` from Vercel's environment variables
2. Make it available to API routes via `process.env.API_KEY` (server-side only)
3. The API key is **never** included in the client bundle

### Step 4: Test the Application

1. Open your deployed site
2. Open **DevTools → Console**
3. Click **Consult with Ada** or any stage button (Biography, Parliamentary Address, Tech Sovereignty)
4. Check the console for any errors

## Troubleshooting

### Error: "API_KEY is missing"

**Cause**: The environment variable wasn't set or wasn't available during build.

**Fix**:
1. Verify `API_KEY` is set in Vercel → Settings → Environment Variables
2. Ensure it's enabled for the correct environment (Production/Preview)
3. Redeploy the application

### Error: "API key error" or 401/403

**Cause**: Invalid or expired API key.

**Fix**:
1. Generate a new API key from [Google AI Studio](https://ai.google.dev/)
2. Update the `API_KEY` value in Vercel
3. Redeploy

### Error: "API quota or rate limit exceeded"

**Cause**: You've exceeded your Google Gemini API quota.

**Fix**:
1. Check your quota in Google AI Studio
2. Wait for the quota to reset or upgrade your plan
3. Verify billing is set up correctly

### Error: 404 or "Failed to generate"

**Cause**: The API endpoint or model name might be incorrect, or the API key doesn't have access to the model.

**Fix**:
1. Check the browser console for the exact error message
2. Verify your API key has access to:
   - `gemini-2.5-flash-image` (for images)
   - `gemini-2.5-flash-preview-tts` (for audio)
   - `gemini-3-flash-preview` (for chat)
3. Check Google AI Studio for model availability

## Local Development

For local development, create a `.env.local` file in the project root:

```bash
API_KEY=your_api_key_here
```

**Important**: `.env.local` is in `.gitignore` and should never be committed.

## Security Note

✅ **Security**: The API key is stored server-side only and never exposed to the client. This is the recommended approach for production applications.

- The API key is only accessible in `app/api/*/route.ts` files
- Client-side code makes requests to `/api/chat`, `/api/image`, and `/api/audio`
- The API key is never included in the JavaScript bundle sent to browsers

## API Routes

The application uses the following API routes:
- `/api/chat` - Handles chat conversations with Ada
- `/api/image` - Generates images using Gemini
- `/api/audio` - Generates speech audio using Gemini TTS

## Build Verification

To verify the API routes are working:

1. After deployment, open your deployed site
2. Open **DevTools → Network** tab
3. Click **Consult with Ada** and send a message
4. You should see a request to `/api/chat` with status 200
5. If you see 404, the API routes weren't deployed correctly
6. If you see 500, check that `API_KEY` is set in Vercel environment variables
