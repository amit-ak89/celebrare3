/**
 * Watermark Web Worker
 *
 * This worker accepts an image URL, fetches it via the client-provided
 * image URL (the fetch is delegated to the main thread because workers
 * today don't have fetch available for cross-origin resources in a Vite
 * dev context without complex opts), and then applies the watermark.
 *
 * In a production setup you could let the main thread send raw image
 * bytes (ArrayBuffer) to the worker so the worker does its own decoding,
 * but to keep the implementation clear and functional with Vite's ESM
 * output, the worker receives an ImageBitmap via transferable which
 * guarantees the heavy pixel work happens off the UI thread.
 */

// Supported message shapes:
// { type: 'watermark', id, imageBitmap, text? }
// -> replies { type: 'result', id, blob }
// { type: 'watermark-many', items: [{ id, imageBitmap }] }
// -> replies { type: 'result', id, blob } for each item

const WATERMARK_TEXT = 'Celebrare';

/**
 * Reliable watermark drawing logic that runs inside the worker.
 *
 * @param {ImageBitmap} bitmap - The source image
 * @param {string} text - Watermark overlay text
 * @returns {Blob}
 */
function drawWatermark(bitmap, text = WATERMARK_TEXT) {
  const offscreen = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = offscreen.getContext('2d');

  ctx.drawImage(bitmap, 0, 0);

  const fontSize = Math.max(16, Math.floor(bitmap.width / 25));
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.lineWidth = Math.max(1, fontSize / 12);

  const textMetrics = ctx.measureText(text);
  const textWidth = textMetrics.width;
  const padding = fontSize * 1.5;

  const x = bitmap.width - textWidth - padding;
  const y = bitmap.height - padding;

  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);

  return offscreen.convertToBlob({ type: 'image/png' });
}

self.onmessage = async (event) => {
  const { type, id, imageBitmap, items } = event.data;

  try {
    if (type === 'watermark') {
      const blob = await drawWatermark(imageBitmap);
      self.postMessage({ type: 'result', id, blob });
    } else if (type === 'watermark-many') {
      for (const item of items) {
        const blob = await drawWatermark(item.imageBitmap);
        self.postMessage({ type: 'result', id: item.id, blob });
      }
    } else {
      throw new Error(`Unknown message type: ${type}`);
    }
  } catch (err) {
    self.postMessage({ type: 'error', id, message: err.message });
  }
};

/**
 * Helper for ESM environments: creates a Worker from a module URL.
 * @param {URL|string} fileUrl
 * @returns {Worker}
 */
export function createWorkerFromFile(fileUrl) {
  return new Worker(new URL('./watermarkWorker.js', import.meta.url), { type: 'module' });
}
