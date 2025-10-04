# Teachable Machine Audio Model Training Guide

This guide will help you train an audio ML model to verify Vedic chanting accuracy using Google's Teachable Machine.

## Overview

The app now supports ML-based audio verification using TensorFlow.js models trained with Teachable Machine. This provides more accurate verification compared to basic pitch detection.

## Step 1: Prepare Your Audio Data

1. **Split your reference audio** into individual syllable or phrase samples:
   - For Ganesha Gayatri, you need samples for each verse
   - Each sample should contain clear pronunciation
   - Recommended: 5-10 variations of each verse (different recordings)

2. **Organize your files**:
   ```
   training-data/
   ├── verse1/
   │   ├── sample1.wav
   │   ├── sample2.wav
   │   └── ...
   ├── verse2/
   │   ├── sample1.wav
   │   └── ...
   └── verse3/
       ├── sample1.wav
       └── ...
   ```

## Step 2: Train the Model on Teachable Machine

### 2.1 Go to Teachable Machine
1. Visit https://teachablemachine.withgoogle.com/train/audio
2. Click **"Get Started"**
3. Select **"Audio Project"**

### 2.2 Create Classes
1. For each verse/syllable, create a new class:
   - Click **"Add a class"**
   - Name it appropriately (e.g., "verse1", "verse2", "verse3")
   - Or for syllable-level: "eka", "danta", "ya", etc.

### 2.3 Upload Audio Samples
1. For each class:
   - Click **"Upload"** button
   - Select all audio samples for that class
   - Or use **"Record"** to record live samples

2. **Tips for better accuracy**:
   - Record at least 5-10 variations per class
   - Include slight variations in pitch and speed
   - Use quiet environment (minimal background noise)
   - Keep samples 2-5 seconds long

### 2.4 Train the Model
1. Click **"Train Model"**
2. Wait for training to complete (usually 1-2 minutes)
3. Test the model using the preview panel

### 2.5 Export the Model
1. Click **"Export Model"**
2. Select **"TensorFlow.js"** tab
3. Choose **"Download"** (not Cloud upload)
4. Click **"Download my model"**
5. You'll get a zip file with:
   - `model.json`
   - `metadata.json`
   - `weights.bin`

## Step 3: Integrate the Model into the App

### 3.1 Create Model Directory
1. In your project, create the models folder structure:
   ```bash
   mkdir -p public/models/ganesha-gayatri
   ```

### 3.2 Copy Model Files
1. Extract the downloaded zip file
2. Copy all files to the models directory:
   ```bash
   cp model.json metadata.json weights.bin public/models/ganesha-gayatri/
   ```

### 3.3 Verify the Structure
Your folder should look like:
```
public/
└── models/
    └── ganesha-gayatri/
        ├── model.json
        ├── metadata.json
        └── weights.bin
```

## Step 4: Test the Model

1. **Restart the dev server** if it's running
2. Navigate to the practice page for your mantra
3. Check the browser console - you should see:
   ```
   ML model loaded successfully for ganesha-gayatri
   ```
4. Record your chanting and check the accuracy

## Advanced: Syllable-Level Training

For more granular feedback, train a model for each syllable:

### Class Structure:
- Class 1: "eka" (ए-क)
- Class 2: "danta" (दं-ता)
- Class 3: "ya" (य)
- Class 4: "vidmahe" (वि-द्म-हे)
- ... and so on for all syllables

### Benefits:
- More detailed feedback
- Highlights specific syllables that need improvement
- Better learning experience

### Implementation:
The app will automatically use syllable-level models if available. Just ensure your class names match the syllable text.

## Troubleshooting

### Model not loading?
- Check browser console for errors
- Verify file paths are correct
- Ensure model files are in `public/models/[mantraId]/`

### Low accuracy?
- Train with more diverse samples
- Ensure audio quality is good
- Try syllable-level training instead of verse-level

### Model too large?
- Use shorter audio samples (2-3 seconds max)
- Reduce the number of classes
- Consider quantization (advanced)

## Tips for Best Results

1. **Quality over quantity**: 10 good samples > 100 poor samples
2. **Include variation**: Different pitches, speeds, slight pronunciation variations
3. **Clean audio**: Remove background noise, echo, distortion
4. **Consistent format**: Use same sample rate (44.1kHz recommended)
5. **Test thoroughly**: Record yourself and verify accuracy before deploying

## Model Naming Convention

For each mantra, use the mantra ID as the folder name:
- `ganesha-gayatri` → `/models/ganesha-gayatri/`
- `gayatri` → `/models/gayatri/`
- Custom mantras → `/models/custom-mantra-id/`

## Next Steps

1. Train your first model for Ganesha Gayatri
2. Test and iterate to improve accuracy
3. Add models for other mantras
4. Consider syllable-level models for advanced users

---

**Need help?** Check the TensorFlow.js documentation or the Teachable Machine community forums.
