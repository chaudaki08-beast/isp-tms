import { createClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client using the service-role key.
 * NEVER import this into a client component — it has full storage access.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'isp-uploads';

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * Upload a base64 data-URL or Buffer to Supabase Storage and return its
 * public URL. Used for selfies, task photos, signatures and receipts.
 */
export async function uploadToStorage(
  path: string,
  data: Buffer,
  contentType: string
): Promise<string> {
  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, data, { contentType, upsert: true });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
  return pub.publicUrl;
}

/**
 * Decode a data URL (e.g. "data:image/png;base64,....") into a Buffer + mime.
 */
export function decodeDataUrl(dataUrl: string): { buffer: Buffer; contentType: string; ext: string } {
  const match = dataUrl.match(/^data:(.+?);base64,(.*)$/);
  if (!match) {
    throw new Error('Invalid data URL');
  }
  const contentType = match[1];
  const buffer = Buffer.from(match[2], 'base64');
  const ext = contentType.split('/')[1]?.split('+')[0] || 'bin';
  return { buffer, contentType, ext };
}
