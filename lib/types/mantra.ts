import { SyllableWithSwara } from '../pitchDetection';

export interface Line {
  id: number;
  sanskrit: SyllableWithSwara[];
  audioStartTime?: number; // in seconds
  audioEndTime?: number; // in seconds
  wordBoundaries?: number[]; // Array of indices where each word starts (e.g., [0, 3, 5] means word1: 0-2, word2: 3-4, word3: 5-end)
}

export interface Paragraph {
  id: number;
  lines: Line[];
}

export interface Chapter {
  id: number;
  name: string; // e.g., "Opening", "Dhyanam", "Sahasranamam", "Phala Shruthi"
  paragraphs: Paragraph[];
}

export interface MantraData {
  id: string;
  title: string;
  category: string;
  audioUrl: string;
  // Flexible structure: can have chapters OR paragraphs, never both
  chapters?: Chapter[]; // For complex mantras like Vishnu Sahasranamam
  paragraphs?: Paragraph[]; // For simpler mantras
}
