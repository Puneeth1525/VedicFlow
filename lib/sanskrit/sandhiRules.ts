/**
 * Universal Sanskrit Sandhi Rules
 * These rules apply to all Vedic and Classical Sanskrit chants
 */

/**
 * Sanskrit consonant groups - phonetically similar sounds
 * Used for flexible phonetic matching across all chants
 */
export const SANSKRIT_CONSONANT_GROUPS = {
  // Dental vs Cerebral (retroflex) - same voicing/aspiration
  dental_cerebral: [
    ['त', 'ट'], // ta / ṭa (unvoiced, unaspirated)
    ['थ', 'ठ'], // tha / ṭha (unvoiced, aspirated)
    ['द', 'ड'], // da / ḍa (voiced, unaspirated)
    ['ध', 'ढ'], // dha / ḍha (voiced, aspirated)
    ['न', 'ण'], // na / ṇa (nasal)
  ],
  // Voicing pairs within same articulation
  voicing_pairs: [
    ['क', 'ग'], // ka / ga
    ['ख', 'घ'], // kha / gha
    ['च', 'ज'], // ca / ja
    ['छ', 'झ'], // cha / jha
    ['त', 'द'], // ta / da
    ['थ', 'ध'], // tha / dha
    ['ट', 'ड'], // ṭa / ḍa
    ['ठ', 'ढ'], // ṭha / ḍha
    ['प', 'ब'], // pa / ba
    ['फ', 'भ'], // pha / bha
  ],
  // Aspiration pairs within same articulation
  aspiration_pairs: [
    ['क', 'ख'], // ka / kha
    ['ग', 'घ'], // ga / gha
    ['च', 'छ'], // ca / cha
    ['ज', 'झ'], // ja / jha
    ['त', 'थ'], // ta / tha
    ['द', 'ध'], // da / dha
    ['ट', 'ठ'], // ṭa / ṭha
    ['ड', 'ढ'], // ḍa / ḍha
    ['प', 'फ'], // pa / pha
    ['ब', 'भ'], // ba / bha
  ],
  // Sibilants - often confused
  sibilants: [['श', 'ष', 'स']], // śa / ṣa / sa
};

/**
 * Normalize Sanskrit text for phonetic comparison
 * Handles orthographic equivalents that sound identical
 */
export function normalizeSanskritText(text: string): string {
  return text
    // Remove explicit halant/virama followed by same consonant (द्ध -> ध, त्त -> त)
    .replace(/(.)\u094D\1/g, '$1')
    // Normalize zero-width characters
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, '');
}

/**
 * Check if two strings differ by visarga sandhi
 * Visarga (ः) can sound like 'h', 's', or be silent
 * Example: "दन्तिः" ≈ "दन्तिह" ≈ "दन्तिस्" ≈ "दन्ति"
 */
export function isVisargaSandhiVariant(str1: string, str2: string): boolean {
  const visargaVariants: Array<[RegExp, string]> = [
    [/ः/g, 'ह'],  // visarga -> ha
    [/ः/g, 'स्'], // visarga -> s with halant
    [/ः/g, ''],   // visarga silent
  ];

  for (const [pattern, replacement] of visargaVariants) {
    if (str1.replace(pattern, replacement as string) === str2) return true;
    if (str2.replace(pattern, replacement as string) === str1) return true;
  }

  return false;
}

/**
 * Check if two consonants differ only by halant vs 'u' vowel
 * ASR systems often add 'u' where there should be halant
 * Example: त् (t with halant) ≈ तु (tu)
 */
export function isHalantVsUVariant(str1: string, str2: string): boolean {
  const halantPattern = /([क-ह])्$/;
  const uPattern = /([क-ह])\u0941$/;

  const match1Halant = str1.match(halantPattern);
  const match2U = str2.match(uPattern);
  const match1U = str1.match(uPattern);
  const match2Halant = str2.match(halantPattern);

  if (match1Halant && match2U && match1Halant[1] === match2U[1]) return true;
  if (match1U && match2Halant && match1U[1] === match2Halant[1]) return true;

  return false;
}

/**
 * Calculate phonetic distance between two Sanskrit characters/strings
 * Returns a cost value between 0 (identical) and 1 (completely different)
 *
 * Cost scale:
 * - 0: Identical sounds
 * - 0.1: Sandhi variants (visarga, halant/u)
 * - 0.25: Dental/cerebral confusion
 * - 0.4: Voicing/aspiration confusion
 * - 0.5: Sibilant confusion
 * - 1.0: Completely different sounds
 */
export function getSanskritPhoneticDistance(char1: string, char2: string): number {
  if (char1 === char2) return 0;

  // Normalize both for phonetic comparison
  const norm1 = normalizeSanskritText(char1);
  const norm2 = normalizeSanskritText(char2);

  if (norm1 === norm2) return 0; // Phonetically identical

  // Check visarga sandhi (ः can be h, s, or silent)
  if (isVisargaSandhiVariant(char1, char2)) return 0.1;

  // Check halant vs 'u' vowel (ASR often adds 'u')
  if (isHalantVsUVariant(char1, char2)) return 0.1;

  // Check if they're in the same phonetic group
  for (const [groupName, pairs] of Object.entries(SANSKRIT_CONSONANT_GROUPS)) {
    for (const group of pairs) {
      if (group.includes(char1) && group.includes(char2)) {
        if (groupName === 'dental_cerebral') return 0.25;
        if (groupName === 'voicing_pairs' || groupName === 'aspiration_pairs') return 0.4;
        if (groupName === 'sibilants') return 0.5;
      }
    }
  }

  return 1.0; // Completely different sounds
}
