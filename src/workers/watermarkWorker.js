/**
 * Web Worker: watermarkWorker.js
 *
 * Runs entirely off the main UI thread via the Worker API.
 * Receives an ImageBitmap (transferable — zero-copy), draws it onto an
 * OffscreenCanvas, overlays the "Celebrare" watermark text, then returns
 * the result as a Blob back to the main thread.
 *
 * Message shapes:
 *   IN  { type: 'watermark',      id, imageBitmap }
 *   IN  { type: 'watermark-many', items: [{ id, imageBitmap }] }
 *   OUT { type: 'result', id, blob }
 *   OUT { type: 'error',  id, message }
 */

const WATERMARK_TEXT = 'Celebrare';

/**
 * Shared watermark utility — single source of truth used by the worker.
 * Draws the watermark onto an OffscreenCanvas and returns a Blob Promise.
 *
 * @param {ImageBitmap} bitmap
 * @param {string} text
 * @returns {Promise<Blob>}
 */
function applyWatermarkWorker(bitmap, text = WATERMARK_TEXT) {
  // OffscreenCanvas lets the worker do Canvas API work without touching the DOM
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d');

  ctx.drawImage(bitmap, 0, 0);

  const fontSize = Math.max(16, Math.floor(bitmap.width / 25));
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.lineWidth = Math.max(1, fontSize / 12);

  const textWidth = ctx.measureText(text).width;
  const padding = fontSize * 1.5;

  ctx.strokeText(text, bitmap.width - textWidth - padding, bitmap.height - padding);
  ctx.fillText(text,   bitmap.width - textWidth - padding, bitmap.height - padding);

  // convertToBlob is the OffscreenCanvas equivalent of canvas.toBlob()
  return canvas.convertToBlob({ type: 'image/png' });
}

self.onmessage = async ({ data }) => {
  const { type, id, imageBitmap, items } = data;
  try {
    if (type === 'watermark') {
      const blob = await applyWatermarkWorker(imageBitmap);
      self.postMessage({ type: 'result', id, blob });
    } else if (type === 'watermark-many') {
      for (const item of items) {
        const blob = await applyWatermarkWorker(item.imageBitmap);
        self.postMessage({ type: 'result', id: item.id, blob });
      }
    }
  } catch (err) {
    self.postMessage({ type: 'error', id, message: err.message });
  }
};
