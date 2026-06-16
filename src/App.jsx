import { useState, useEffect, useCallback, useRef } from 'react';
import Gallery from './components/Gallery';
import ImageModal from './components/ImageModal';
import { applyWatermarkFromUrl, downloadBlob } from './utils/watermark';

const TOTAL_IMAGES = 100;

/**
 * App — root orchestrator.
 *
 * Virtualization: Gallery.jsx uses react-window (FixedSizeGrid) so only the
 * visible image cells are mounted in the DOM at any time, keeping scroll
 * performance smooth at 60 fps regardless of image count.
 *
 * Web Worker: Bulk "Download Selected" offloads ImageBitmap creation +
 * OffscreenCanvas watermark compositing to a dedicated worker thread so the
 * UI never freezes during heavy canvas work.
 *
 * Canvas API: Watermark text "Celebrare" is drawn with fillText/strokeText
 * on either a main-thread <canvas> (single download) or an OffscreenCanvas
 * inside the worker (bulk download).
 */
export default function App() {
  const [images, setImages]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [modalItem, setModalItem] = useState(null);

  // Persistent Web Worker instance — created once, reused for all bulk downloads
  const workerRef = useRef(null);

  useEffect(() => {
    // Instantiate the worker using Vite's ?worker import syntax
    workerRef.current = new Worker(
      new URL('./workers/watermarkWorker.js', import.meta.url),
      { type: 'module' }
    );
    return () => workerRef.current?.terminate();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`https://picsum.photos/v2/list?page=1&limit=${TOTAL_IMAGES}`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data) => {
        if (cancelled) return;
        setImages(
          data.map((img) => ({
            id:           String(img.id),
            author:       img.author,
            // Sized thumbnail (400×300) for fast gallery loading
            thumbnailUrl: `https://picsum.photos/id/${img.id}/400/300`,
            // Full-res URL for modal preview and watermark download
            downloadUrl:  img.download_url,
          }))
        );
      })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds((prev) =>
      prev.size === images.length ? new Set() : new Set(images.map((img) => img.id))
    );
  }, [images]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  /** Single-image download — runs Canvas work on main thread (fast, one image) */
  const handleDownloadSingle = useCallback(async (item) => {
    try {
      const blob = await applyWatermarkFromUrl(item.downloadUrl);
      downloadBlob(blob, `celebrare_${item.id}.png`);
    } catch (err) {
      alert(`Download failed: ${err.message}`);
    }
  }, []);

  /**
   * Bulk download — offloads ALL canvas compositing to the Web Worker.
   * Main thread only fetches images as ImageBitmaps (GPU-decodable), then
   * transfers them (zero-copy) to the worker.
   */
  const handleDownloadSelected = useCallback(async () => {
    const selected = images.filter((img) => selectedIds.has(img.id));
    if (!selected.length || !workerRef.current) return;

    const worker = workerRef.current;

    // Build a promise for each image that resolves when the worker replies
    const promises = selected.map(async (item) => {
      // Fetch + decode image as a transferable ImageBitmap (zero-copy to worker)
      const res    = await fetch(item.thumbnailUrl);
      const blob   = await res.blob();
      const bitmap = await createImageBitmap(blob);

      return new Promise((resolve, reject) => {
        const onMessage = ({ data }) => {
          if (data.id !== item.id) return;
          worker.removeEventListener('message', onMessage);
          if (data.type === 'result') resolve({ id: item.id, blob: data.blob });
          else reject(new Error(data.message));
        };
        worker.addEventListener('message', onMessage);
        // Transfer bitmap — zero-copy, main thread relinquishes ownership
        worker.postMessage({ type: 'watermark', id: item.id, imageBitmap: bitmap }, [bitmap]);
      });
    });

    // Trigger downloads as each result arrives
    const results = await Promise.allSettled(promises);
    results.forEach((r) => {
      if (r.status === 'fulfilled') {
        downloadBlob(r.value.blob, `celebrare_${r.value.id}.png`);
      }
    });
  }, [images, selectedIds]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Celebrare Image Gallery</h1>
        <div className="header-actions">
          <label className="select-all-label">
            <input
              type="checkbox"
              checked={images.length > 0 && selectedIds.size === images.length}
              onChange={selectAll}
            />
            Select All
          </label>
          <button className="refresh-btn" onClick={() => window.location.reload()} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </header>

      <main>
        {loading && <div className="loading">Loading images from Picsum Photos...</div>}
        {error && (
          <div className="error">
            <p>Failed to load images: {error}</p>
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        )}
        {!loading && !error && (
          <Gallery
            images={images}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onImageClick={setModalItem}
            onDownload={handleDownloadSingle}
            onDownloadSelected={handleDownloadSelected}
            onClearSelection={clearSelection}
          />
        )}
      </main>

      {modalItem && <ImageModal item={modalItem} onClose={() => setModalItem(null)} />}
    </div>
  );
}
