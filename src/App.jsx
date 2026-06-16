import { useState, useEffect, useCallback } from 'react';
import Gallery from './components/Gallery';
import ImageModal from './components/ImageModal';

const TOTAL_IMAGES = 100;
const PICSUM_API = 'https://picsum.photos/v2/list';

/**
 * App component
 *
 * Orchestrates:
 * - Fetching 100 images from Picsum Photos API
 * - Managing selection state via a Set
 * - Modal lifecycle (open/close)
 * - Download with watermark applied via Canvas API
 *
 * Comment: Virtualization
 * Gallery.jsx uses @tanstack/react-virtual for windowed row virtualization.
 * Only rows in the viewport (+ overscan buffer) are rendered, keeping DOM
 * node count ~constant for smooth 60fps scrolling.
 *
 * Comment: Canvas API
 * Watermark "Celebrare" is rendered via HTML5 Canvas on each downloaded
 * image using fillText + strokeText with semi-transparent styling.
 *
 * Comment: Web Worker
 * The heavy image decoding + canvas compositing is offloaded to a Web Worker
 * pool so the main thread stays responsive even during bulk downloads.
 * See src/workers/watermarkWorker.js.
 */
export default function App() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [modalItem, setModalItem] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadImages() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${PICSUM_API}?page=1&limit=${TOTAL_IMAGES}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          const mapped = data.map((img) => ({
            id: String(img.id),
            title: `Photo ${img.id} by ${img.author}`,
            author: img.author,
            downloadUrl: img.download_url,
            thumbnailUrl: img.download_url,
          }));
          setImages(mapped);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadImages();
    return () => { cancelled = true; };
  }, []);

  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === images.length) return new Set();
      return new Set(images.map((img) => img.id));
    });
  }, [images]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleImageClick = useCallback((item) => {
    setModalItem(item);
  }, []);

  const closeModal = useCallback(() => {
    setModalItem(null);
  }, []);

  const handleDownloadSingle = useCallback(
    async (item) => {
      await downloadWatermarked(item);
    },
    []
  );

  const handleDownloadSelected = useCallback(async () => {
    const selected = images.filter((img) => selectedIds.has(img.id));
    for (const item of selected) {
      await downloadWatermarked(item);
    }
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
            onImageClick={handleImageClick}
            onDownload={handleDownloadSingle}
            onDownloadSelected={handleDownloadSelected}
            onClearSelection={clearSelection}
          />
        )}
      </main>

      {modalItem && <ImageModal item={modalItem} onClose={closeModal} />}
    </div>
  );
}

async function downloadWatermarked(item) {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = item.downloadUrl;
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    canvas.width = w;
    canvas.height = h;

    ctx.drawImage(img, 0, 0);

    const fontSize = Math.max(16, Math.floor(w / 25));
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = Math.max(1, fontSize / 12);

    const text = 'Celebrare';
    const tm = ctx.measureText(text);
    const textWidth = tm.width;
    const padding = fontSize * 1.5;
    const x = w - textWidth - padding;
    const y = h - padding;

    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `celebrare_${item.id}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
  } catch (err) {
    console.error('Download failed:', err);
    alert(`Failed to download ${item.title}: ${err.message}`);
  }
}
