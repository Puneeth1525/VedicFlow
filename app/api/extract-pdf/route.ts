import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('pdf') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No PDF file provided' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Extract text using pdf2json
    const text = await extractTextFromPDF(buffer);

    return NextResponse.json({
      text,
      success: true,
    });
  } catch (error) {
    console.error('Error extracting PDF:', error);
    return NextResponse.json(
      { error: 'Failed to extract PDF text: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const PDFParser = require('pdf2json');
      const pdfParser = new PDFParser(null, 1);

      let extractedText = '';

      pdfParser.on('pdfParser_dataError', (errData: any) => {
        console.error('PDF Parse Error:', errData.parserError);
        reject(new Error(errData.parserError));
      });

      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        try {
          // Extract text from all pages
          const pages = pdfData.Pages || [];

          for (const page of pages) {
            const texts = page.Texts || [];

            for (const textItem of texts) {
              for (const run of textItem.R || []) {
                if (run.T) {
                  // Decode URI-encoded text (preserves Unicode/Devanagari)
                  const decodedText = decodeURIComponent(run.T);
                  extractedText += decodedText + ' ';
                }
              }
            }
            extractedText += '\n';
          }

          // Clean up the extracted text
          const cleanedText = cleanSanskritText(extractedText);
          resolve(cleanedText);
        } catch (error) {
          reject(error);
        }
      });

      // Parse the buffer directly
      pdfParser.parseBuffer(buffer);
    } catch (error) {
      console.error('Error in PDF extraction:', error);
      reject(new Error('Failed to extract text from PDF: ' + (error as Error).message));
    }
  });
}

function cleanSanskritText(text: string): string {
  // Step 1: Preserve Devanagari characters (Unicode range: 0900-097F)
  // Remove any corrupted/garbled ASCII that's mixed with Devanagari

  // Step 2: Fix common spacing issues with Devanagari
  // Devanagari words often get split incorrectly
  text = text.replace(/([।॥])\s+/g, '$1\n'); // New line after dandas

  // Step 3: Remove excessive whitespace but preserve structure
  text = text.replace(/[ \t]+/g, ' '); // Multiple spaces to single space
  text = text.replace(/\n{3,}/g, '\n\n'); // Max 2 newlines

  // Step 4: Remove page numbers (digits at start/end of lines)
  text = text.replace(/^\d+\s*$/gm, '');
  text = text.replace(/^\s*\d+\s*$/gm, '');

  // Step 5: Remove common headers/footers in English and Hindi
  text = text.replace(/^(Page|पृष्ठ|www\s*\.\s*\S+)\s*\d*/gm, '');
  text = text.replace(/www\s*\.\s*\w+\s*\.\s*\w+/gi, ''); // Remove URLs

  // Step 6: Remove romanization artifacts (single letters scattered)
  // This pattern removes isolated single characters that are ASCII
  text = text.replace(/\b[a-zA-Z]\s+[a-zA-Z]\s+[a-zA-Z]\s+/g, '');

  // Step 7: Extract only Devanagari text blocks (remove romanization completely)
  const lines = text.split('\n');
  const devanagariLines: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Check if line has significant Devanagari content
    const devanagariChars = (trimmedLine.match(/[\u0900-\u097F]/g) || []).length;
    const totalChars = trimmedLine.replace(/\s/g, '').length;

    // If more than 30% is Devanagari, keep the line
    if (devanagariChars > 0 && (devanagariChars / Math.max(totalChars, 1)) > 0.3) {
      // Remove any ASCII romanization from the line
      const cleanLine = trimmedLine.replace(/[a-zA-Z''′]/g, '').trim();
      if (cleanLine.length > 0) {
        devanagariLines.push(cleanLine);
      }
    }
  }

  // Step 8: Join and final cleanup
  text = devanagariLines.join('\n');

  // Step 9: Fix spacing around punctuation
  text = text.replace(/\s+([।॥])/g, '$1'); // No space before dandas
  text = text.replace(/([।॥])\s+/g, '$1 '); // Single space after dandas

  // Step 10: Trim each line and remove empty lines
  text = text.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');

  // Step 11: Group by verses (detect verse patterns)
  text = text.replace(/॥\s*\d+\s*॥/g, (match) => `\n${match}\n`); // Verse numbers on new line

  return text.trim();
}
