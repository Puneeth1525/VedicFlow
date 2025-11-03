# Word-by-Word Practice Mode Integration Guide

## Files Created
1. ✅ `lib/wordPronunciationAnalyzer.ts` - Independent pronunciation analyzer
2. ✅ `components/WordByWordPractice.tsx` - Boldvoice-style UI component
3. ✅ `app/api/analyze-word/route.ts` - API endpoint for word analysis

## Integration Steps for `/app/(protected)/practice/[mantraId]/page.tsx`

### Step 1: Add Import
Add at the top of the file (around line 20):
```typescript
import WordByWordPractice from '@/components/WordByWordPractice';
```

### Step 2: Add State
Add after other useState declarations (around line 64):
```typescript
const [showWordByWord, setShowWordByWord] = useState(false);
```

### Step 3: Extract Words from Current Line
Add this helper function after the other helper functions (around line 180):
```typescript
// Extract words from current line for word-by-word practice
const getWordsFromCurrentLine = () => {
  if (!currentLine) return [];

  const words: Array<{ text: string; romanization: string }> = [];
  let currentWord = { text: '', romanization: '' };

  currentLine.sanskrit.forEach((syllable, index) => {
    // Check if this syllable is a word boundary
    const isWordBoundary = currentLine.wordBoundaries?.includes(index);

    if (isWordBoundary && currentWord.text) {
      // Push previous word
      words.push(currentWord);
      currentWord = { text: '', romanization: '' };
    }

    // Add syllable to current word
    currentWord.text += syllable.text;
    currentWord.romanization += syllable.romanization;
  });

  // Push last word
  if (currentWord.text) {
    words.push(currentWord);
  }

  return words;
};
```

### Step 4: Add Word-by-Word Button
Add this button in the practice mode selector, right after the "Line by Line" button (around line 840, after line 811):

```typescript
{/* Word by Word Mode - Only show in Line mode */}
{practiceMode === 'line' && (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    className="mt-4 p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30"
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-white font-medium mb-1">
          🎯 Beginner Mode
        </p>
        <p className="text-sm text-purple-300">
          Practice one word at a time with instant feedback
        </p>
      </div>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowWordByWord(true)}
        className="px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-medium transition-all shadow-lg"
      >
        Start Word-by-Word
      </motion.button>
    </div>
  </motion.div>
)}
```

### Step 5: Add Word-by-Word Practice Component
Add this at the very end of the return statement, before the closing div (around line 1400+):

```typescript
{/* Word-by-Word Practice Modal */}
{showWordByWord && currentLine && (
  <WordByWordPractice
    words={getWordsFromCurrentLine()}
    lineAudioUrl={mantra?.audioUrl}
    onComplete={() => {
      setShowWordByWord(false);
      // Optionally auto-advance to next line
    }}
    onExit={() => setShowWordByWord(false)}
  />
)}
```

## Features Implemented

### 🎯 Boldvoice-Style UI
- Dark background with animated particles
- Large percentage score display (circular progress)
- Real-time color-coded syllable feedback
- Encouraging feedback messages
- Large microphone button (press & hold)

### 📊 Smart Analysis
- Independent from existing swara/pronunciation systems
- Real-time Whisper AI transcription
- Phonetic similarity scoring
- Syllable-level breakdown with color coding
- Pass threshold: 70% accuracy

### 🔄 Progress Tracking
- 5 attempts per word maximum
- Best score tracking
- Auto-unlock next word after passing or max attempts
- Overall completion percentage
- Word-by-word unlocking system

### 🎵 Audio Features
- Coach playback (reference audio)
- Your recording playback
- Hold-to-record mic button

### 💚 Color Coding
- **Green** (75%+): Perfect pronunciation
- **Yellow** (50-74%): Good, needs minor improvement
- **Red** (<50%): Needs work

## Usage Flow

1. User selects "Line by Line" mode
2. Selects a line to practice
3. Clicks "Start Word-by-Word" button
4. Full-screen Boldvoice-style interface appears
5. User sees first word with romanization
6. Press & hold mic to record
7. Instant feedback with score and color-coded syllables
8. Retry up to 5 times or pass with 70%+
9. "Next Word" button unlocks
10. Repeat for all words in the line
11. Complete and return to normal practice

## API Endpoint

The word analysis happens independently via `/api/analyze-word`:
- Accepts audio blob, expected word, and romanization
- Returns detailed scoring and feedback
- No interference with existing analysis systems

## Testing

Test with a simple line from Ganesha Gayatri:
- Words: ["ओम्", "एकदंताय", "विद्महे"]
- Should progress word-by-word
- Should show real-time feedback
- Should unlock next word after passing

