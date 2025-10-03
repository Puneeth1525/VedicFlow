# VedicFlow - Vedic Chanting Coach App

A futuristic web application for learning and perfecting Vedic chanting with AI-powered pitch detection and swara analysis.

## Features

- 🎵 **Swara Notation System**: Visual display of the four Vedic swaras
  - Anudhaata (↓) - Low pitch
  - Udhaata (↑) - High pitch
  - Swarita (↘) - Falling pitch
  - Dheerga Swarita (⤵) - Prolonged falling pitch

- 🎤 **Voice Recording & Analysis**: Record your recitation and get instant feedback
- 📊 **Accuracy Scoring**: AI-powered pitch comparison with reference audio
- 📚 **Mantra Library**: Comprehensive collection of Vedic mantras and shlokas
- 📱 **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- ✨ **Futuristic UI**: Glassmorphism, animations, and gradient effects

## Tech Stack

- **Frontend**: Next.js 15 with React 19
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Node.js 18+ (recommended: Node.js 20+)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd vedic-chanting-coach
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
vedic-chanting-coach/
├── app/
│   ├── page.tsx              # Landing page
│   ├── mantras/
│   │   └── page.tsx          # Mantra selection page
│   ├── practice/
│   │   └── [mantraId]/
│   │       └── page.tsx      # Practice interface with swara display
│   ├── globals.css           # Global styles
│   └── layout.tsx            # Root layout
├── public/
│   └── audio/                # Reference audio files (to be added)
└── README.md
```

## How to Use

1. **Select a Mantra**: Browse the mantra library and choose a mantra to practice
2. **Choose a Paragraph**: Select a specific verse or paragraph to focus on
3. **Listen to Reference**: Play the reference audio to understand the correct swara patterns
4. **Record Yourself**: Use the microphone to record your recitation
5. **Get Feedback**: Receive instant accuracy scores and improvement suggestions

## Adding Your Own Mantras

To add new mantras, edit the `mantraData` object in `/app/practice/[mantraId]/page.tsx`:

```typescript
const mantraData: Record<string, any> = {
  'your-mantra-id': {
    title: 'Your Mantra Name',
    category: 'Source Text',
    paragraphs: [
      {
        id: 1,
        sanskrit: [
          { text: 'सं', swara: 'anudhaata', romanization: 'Sam' },
          { text: 'स्कृ', swara: 'udhaata', romanization: 'skṛ' },
          // Add more syllables...
        ],
      },
    ],
    audioUrl: '/audio/your-mantra.mp3',
  },
};
```

## Implemented Features ✅

- ✅ **Real-time Pitch Detection** using Web Audio API
- ✅ **Reference Audio Pitch Extraction** for comparison
- ✅ **Pitch Comparison Algorithm** with accuracy scoring
- ✅ **Visual Swara Notation** with color-coded pitch indicators
- ✅ **Ganesha Gayatri Mantra** with full swara notation
- ✅ **Futuristic UI** with animations and glassmorphism

## Advanced Features (To Be Implemented)

- [ ] Backend API for enhanced audio processing
- [ ] User authentication and progress tracking
- [ ] Social features (share scores, compete with friends)
- [ ] Offline PWA support
- [ ] Multiple voice coaches
- [ ] Advanced analytics and visualization
- [ ] More mantras with swara notation

## Deploying to Vercel

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit - VedicFlow Chanting Coach"
   git branch -M main
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Deploy on Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js and configure build settings
   - Click "Deploy"

3. **Environment Variables** (if needed in future):
   - Add any API keys in Vercel Dashboard → Project Settings → Environment Variables

Your app will be live at `https://your-project-name.vercel.app`

## Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

**Note**: Microphone access is required for recording functionality.

## License

MIT License

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgments

- Vedic scholars for swara notation guidance
- The open-source community for amazing tools and libraries
