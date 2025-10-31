# VedicFlo - Deployment Guide

## 🚀 Quick Deploy to Vercel

### Prerequisites
- GitHub account
- Vercel account (sign up at vercel.com)
- Git installed locally

### Step 1: Push to GitHub

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit your changes
git commit -m "Initial commit - VedicFlo Chanting Coach with pitch detection"

# Rename branch to main
git branch -M main

# Add your GitHub repository as remote
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push to GitHub
git push -u origin main
```

### Step 2: Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New Project"**
3. Select **"Import Git Repository"**
4. Choose your GitHub repository
5. Vercel will automatically detect Next.js configuration
6. Click **"Deploy"**

That's it! Your app will be live in ~2 minutes at `https://your-project-name.vercel.app`

### Step 3: Test Your Deployment

1. Visit your Vercel URL
2. Click "Begin Your Journey"
3. Select "Ganesha Gayatri Mantra"
4. Allow microphone access when prompted
5. Play the reference audio
6. Record yourself and see the real-time pitch analysis!

## 📊 What's Deployed

### ✅ Implemented Features
- Real-time pitch detection using Web Audio API
- Reference audio pitch extraction and analysis
- Pitch comparison algorithm with accuracy scoring
- Visual swara notation (Anudhaata, Udhaata, Swarita, Dheerga Swarita)
- Ganesha Gayatri Mantra with full swara notation
- Futuristic responsive UI

### 📁 Files Included
- `/lib/pitchDetection.ts` - Core pitch detection algorithms
- `/app/practice/[mantraId]/page.tsx` - Practice interface with real-time analysis
- `/public/audio/Ganesha_Gayatri_Mantra.mp3` - Reference audio

## 🎤 How It Works

1. **Reference Audio Analysis**: When you open a mantra, the app analyzes the reference audio and extracts pitch data
2. **User Recording**: When you record, the app uses Web Audio API to detect your voice pitch in real-time
3. **Comparison**: After recording, the algorithm compares your pitch sequence with the reference
4. **Scoring**: You get accuracy scores for:
   - Pitch Accuracy (how close your frequencies match)
   - Rhythm Accuracy (timing and duration)
   - Overall Score (weighted average)

## 🔧 Troubleshooting

### Issue: Microphone not working
- **Solution**: Make sure you allow microphone access in your browser
- Check browser settings → Site permissions

### Issue: Audio file not loading
- **Solution**: Ensure the audio file is in `/public/audio/` folder
- Verify the path in mantra data matches the actual file

### Issue: Build fails on Vercel
- **Solution**: Check that all dependencies are in `package.json`
- Make sure Node.js version is 18+ (configured automatically by Vercel)

## 📱 Mobile Deployment

The app works on mobile browsers! However:
- iOS Safari requires user interaction before playing audio
- Microphone permissions must be granted
- Best experience on Chrome Mobile and Safari 14+

## 🔐 Environment Variables (Future)

Currently, no environment variables are needed. When adding backend features:

```bash
# In Vercel Dashboard → Settings → Environment Variables
DATABASE_URL=your_database_url
API_KEY=your_api_key
```

## 📈 Next Steps

After deploying, you can:

1. **Add More Mantras**: Edit `/app/practice/[mantraId]/page.tsx`
2. **Improve Pitch Detection**: Tune the autocorrelation algorithm in `/lib/pitchDetection.ts`
3. **Add Analytics**: Integrate Vercel Analytics
4. **Custom Domain**: Add your domain in Vercel Settings
5. **Add Backend**: Set up Supabase or Firebase for user accounts

## 🎯 Demo for Presentation

When presenting:

1. Open the deployed URL
2. Show the futuristic landing page
3. Navigate to "Ganesha Gayatri Mantra"
4. Play reference audio and point out swara indicators
5. Record a sample recitation
6. Show the real-time pitch analysis results
7. Explain the scoring algorithm

Enjoy your VedicFlo app! 🕉️
