import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase Storage access using the service-role key.
 * NEVER import this into a client component — it has full storage access.
 *
 * The client is created LAZILY (on first use) rather than at module load, so
 * the app can build and boot even when Storage env vars are not configured.
 * Only an actual upload will fail (with a clear message) until the keys exist.
 */

export const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'isp-uploads';

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Supabase Storage is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable file uploads.'
    );
  }

  _client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

/**
 * Upload a Buffer to Supabase Storage and return its public URL.
 * Used for selfies, task photos, signatures and receipts.
 */
export async function uploadToStorage(
  path: string,
  data: Buffer,
  contentType: string
): Promise<string> {
  const client = getClient();

  const { error } = await client.storage
    .from(BUCKET)
    .upload(path, data, { contentType, upsert: true });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data: pub } = client.storage.from(BUCKET).getPublicUrl(path);
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
