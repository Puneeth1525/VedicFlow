import { createClient } from '@supabase/supabase-js';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

// Client for browser (uses anon key)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Server-side client (uses service role key for admin operations)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/**
 * Upload audio file to Supabase Storage
 * @param file File or Blob to upload
 * @param userId User ID for organizing files
 * @param fileName Optional custom filename
 * @returns Public URL of uploaded file
 */
export async function uploadRecording(
  file: File | Blob,
  userId: string,
  fileName?: string
): Promise<string> {
  const timestamp = Date.now();
  const name = fileName || `${userId}/${timestamp}.webm`;

  const { data, error } = await supabase.storage
    .from('recordings')
    .upload(name, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Error uploading recording:', error);
    throw new Error(`Failed to upload recording: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('recordings')
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

/**
 * Delete audio file from Supabase Storage
 * @param filePath Path of the file in storage
 */
export async function deleteRecording(filePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from('recordings')
    .remove([filePath]);

  if (error) {
    console.error('Error deleting recording:', error);
    throw new Error(`Failed to delete recording: ${error.message}`);
  }
}
