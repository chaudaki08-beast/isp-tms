import { decodeDataUrl, uploadToStorage } from '@/lib/supabase';

/**
 * Upload a base64 data URL (from a <canvas>, camera capture, or file reader)
 * to Supabase Storage under a structured folder and return the public URL.
 *
 * @param dataUrl  data:image/...;base64,xxxx
 * @param folder   e.g. "attendance", "tasks/<taskId>", "signatures", "receipts"
 * @param name     base filename without extension
 */
export async function uploadDataUrl(
  dataUrl: string,
  folder: string,
  name: string
): Promise<string> {
  const { buffer, contentType, ext } = decodeDataUrl(dataUrl);

  // Guard against oversized uploads (~6MB after base64 decode).
  if (buffer.byteLength > 6 * 1024 * 1024) {
    throw new Error('File too large (max 6MB).');
  }
  if (!contentType.startsWith('image/')) {
    throw new Error('Only image uploads are allowed.');
  }

  const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'file';
  const path = `${folder}/${safeName}-${Date.now()}.${ext}`;
  return uploadToStorage(path, buffer, contentType);
}
