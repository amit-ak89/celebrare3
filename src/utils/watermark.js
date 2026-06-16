/**
 * Shared watermark utility function.
 *
 * This function is the single source of truth for watermark rendering.
 * It is used both by the main thread (for previews) and inside the
 * Web Worker (via the worker-bundle that imports this same API).
 */

export const WATERMARK_TEXT = 'Celebrare';

/**
 * Draw a watermark on top of an image using a canvas.
 *
 * @param {HTMLImageElement|HTMLCanvasElement|ImageBitmap} source - The image to watermark
 * @param {string} text - The watermark text
 * @returns {HTMLCanvasElement} Canvas with the watermarked image
 */
export function applyWatermark(source, text = WATERMARK_TEXT) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const width = source.naturalWidth || source.width;
  const height = source.naturalHeight || source.height;

  canvas.width = width;
  canvas.height = height;

  ctx.drawImage(source, 0, 0, width, height);

  const fontSize = Math.max(16, Math.floor(width / 25));
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.lineWidth = Math.max(1, fontSize / 12);

  const textMetrics = ctx.measureText(text);
  const textWidth = textMetrics.width;
  const padding = fontSize * 1.5;

  const x = width - textWidth - padding;
  const y = height - padding;

  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);

  return canvas;
}

/**
 * Convert a canvas to a downloadable Blob.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {string} type - MIME type (default: image/png)
 * @param {number} quality - between 0 and 1
 * @returns {Promise<Blob>}
 */
export function canvasToBlob(canvas, type = 'image/png', quality = 0.92) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas conversion failed'));
      },
      type,
      quality
    );
  });
}
