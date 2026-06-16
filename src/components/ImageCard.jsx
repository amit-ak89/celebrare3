import { useState } from 'react';

/**
 * ImageCard — single image cell rendered inside the react-window Grid.
 *
 * Kept lightweight so react-window can recycle it efficiently.
 * Heavy work (watermark + download) is handled by the parent via onDownload.
 */
export default function ImageCard({ item, isSelected, onToggleSelect, onImageClick, onDownload }) {
  const [loaded, setLoaded] = useState(false);
  const [error,  setError]  = useState(false);

  return (
    <div className="card-inner">
      <div className="checkbox-wrap">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(item.id)}
          aria-label="Select image"
        />
      </div>

      <div className="image-wrap" onClick={() => onImageClick(item)}>
        {!loaded && !error && <div className="image-placeholder"><span>Loading…</span></div>}
        {error ? (
          <div className="image-error">Failed to load</div>
        ) : (
          <img
            src={item.thumbnailUrl}
            alt={item.author}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
            style={{ display: loaded ? 'block' : 'none' }}
          />
        )}
      </div>

      <div className="card-actions">
        <span className="card-author">{item.author}</span>
        <button className="download-btn" onClick={() => onDownload(item)}>
          ↓ Download
        </button>
      </div>
    </div>
  );
}
