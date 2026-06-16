/**
 * Shared watermark utility (main-thread version).
 *
 * Used by App.jsx for single-image downloads.
 * The Web Worker (watermarkWorker.js) has an equivalent OffscreenCanvas
 * implementation so the same logic runs off the UI thread for bulk downloads.
 */

export const WATERMARK_TEXT = 'Celebrare';

/**
 * Loads an image from a URL, draws the "Celebrare" watermark via Canvas API,
 * and resolves with a Blob ready for download.
 *
 * @param {string} url - Cross-origin image URL (Picsum)
 * @param {string} text - Watermark label
 * @returns {Promise<Blob>}
 */
export async function applyWatermarkFromUrl(url, text = WATERMARK_TEXT) {
  const img = new Image();
  img.crossOrigin = 'anonymous';

  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = url;
  });

  const canvas = document.createElement('canvas');
  canvas.width  = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(img, 0, 0);

  const fontSize = Math.max(16, Math.floor(img.naturalWidth / 25));
  ctx.font        = `bold ${fontSize}px Arial, sans-serif`;
  ctx.fillStyle   = 'rgba(255, 255, 255, 0.7)';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.lineWidth   = Math.max(1, fontSize / 12);

  const textWidth = ctx.measureText(text).width;
  const padding   = fontSize * 1.5;

  ctx.strokeText(text, img.naturalWidth - textWidth - padding, img.naturalHeight - padding);
  ctx.fillText(text,   img.naturalWidth - textWidth - padding, img.naturalHeight - padding);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))), 'image/png')
  );
}

/** Trigger a browser file download for the given Blob. */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
