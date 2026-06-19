import { useState, useEffect, useCallback, useRef } from 'react';
import Gallery from './components/Gallery';
import ImageModal from './components/ImageModal';
import { applyWatermarkFromUrl, downloadBlob } from './utils/watermark';
import { getCachedImages, saveImages } from './db/indexedDB';

const TOTAL_IMAGES = 100;
const PICSUM_API_URL = `https://picsum.photos/v2/list?page=1&limit=${TOTAL_IMAGES}`;

let galleryLoadPromise = null;

function normalizePicsumImage(img) {
  return {
    id: String(img.id),
    author: img.author,
    width: img.width,
    height: img.height,
    url: img.url,
    download_url: img.download_url,
    thumbnailUrl: `https://picsum.photos/id/${img.id}/400/300`,
    downloadUrl: img.download_url,
  };
}

async function fetchImagesFromApi() {
  const response = await fetch(PICSUM_API_URL);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  const images = data.map(normalizePicsumImage);

  try {
    await saveImages(images);
  } catch (err) {
    console.warn('Unable to save images to IndexedDB:', err);
  }

  console.log('Loaded from API');
  return { images, source: 'api' };
}

async function loadGalleryImages() {
  try {
    const cachedImages = await getCachedImages();

    if (cachedImages.length > 0) {
      console.log('Loaded from IndexedDB');
      return { images: cachedImages, source: 'cache' };
    }
  } catch (err) {
    console.warn('Unable to read images from IndexedDB:', err);
  }

  return fetchImagesFromApi();
}

/**
 * App - root orchestrator.
 *
 * Virtualization: Gallery.jsx uses react-window Grid so only the visible image
 * cells are mounted in the DOM at any time, keeping scroll performance smooth.
 *
 * IndexedDB: Startup checks persistent cached metadata before making a network
 * request, so repeat visits can render immediately from celebrareGalleryDB.
 *
 * Web Worker: Bulk "Download Selected" offloads ImageBitmap creation and
 * OffscreenCanvas watermark compositing to a dedicated worker thread so the UI
 * never freezes during heavy canvas work.
 */
export default function App() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cacheStatus, setCacheStatus] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [modalItem, setModalItem] = useState(null);

  const workerRef = useRef(null);

  useEffect(() => {
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

    galleryLoadPromise ??= loadGalleryImages();

    galleryLoadPromise
      .then(({ images: loadedImages, source }) => {
        if (cancelled) return;

        setImages(loadedImages);
        setCacheStatus(source === 'cache' ? 'Loaded from Cache' : 'Loaded from API');
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
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

  const handleDownloadSingle = useCallback(async (item) => {
    try {
      const blob = await applyWatermarkFromUrl(item.downloadUrl);
      downloadBlob(blob, `celebrare_${item.id}.png`);
    } catch (err) {
      alert(`Download failed: ${err.message}`);
    }
  }, []);

  const handleDownloadSelected = useCallback(async () => {
    const selected = images.filter((img) => selectedIds.has(img.id));
    if (!selected.length || !workerRef.current) return;

    const worker = workerRef.current;

    const promises = selected.map(async (item) => {
      const res = await fetch(item.thumbnailUrl);
      const blob = await res.blob();
      const bitmap = await createImageBitmap(blob);

      return new Promise((resolve, reject) => {
        const onMessage = ({ data }) => {
          if (data.id !== item.id) return;

          worker.removeEventListener('message', onMessage);

          if (data.type === 'result') {
            resolve({ id: item.id, blob: data.blob });
          } else {
            reject(new Error(data.message));
          }
        };

        worker.addEventListener('message', onMessage);
        worker.postMessage({ type: 'watermark', id: item.id, imageBitmap: bitmap }, [bitmap]);
      });
    });

    const results = await Promise.allSettled(promises);

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        downloadBlob(result.value.blob, `celebrare_${result.value.id}.png`);
      }
    });
  }, [images, selectedIds]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Celebrare Image Gallery</h1>

        <div className="header-actions">
          {cacheStatus && <span className="cache-badge">{cacheStatus}</span>}

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
        {loading && <div className="loading">Loading images...</div>}

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
