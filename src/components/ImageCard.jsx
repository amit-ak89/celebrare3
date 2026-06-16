import { useState, useCallback, useRef } from 'react';
import { applyWatermark } from '../utils/watermark';

/**
 * ImageCard component
 *
 * Displays a single image item within the virtualized grid.
 * Responsibilities:
 * - Render the thumbnail
 * - Render a loading spinner while the image loads
 * - Show an error state if the image fails to load
 * - Expose a checkbox for selection
 * - Expose a download button that triggers off-thread watermarking
 */
export default function ImageCard({
  item,
  isSelected,
  onToggleSelect,
  onImageClick,
  onDownload,
  style,
}) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className="image-card"
      style={{
        ...style,
        padding: '8px',
        boxSizing: 'border-box',
      }}
    >
      <div className="card-inner">
        <div className="checkbox-wrap">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(item.id)}
            title="Toggle selection"
          />
        </div>

        <div className="image-wrap" onClick={() => onImageClick(item)}>
          {!imgLoaded && !imgError && (
            <div className="image-placeholder">
              <span>Loading...</span>
            </div>
          )}

          {imgError ? (
            <div className="image-error">Failed to load image</div>
          ) : (
            <img
              src={item.thumbnailUrl}
              alt={item.title}
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
              style={{
                display: imgLoaded ? 'block' : 'none',
                width: '100%',
                height: '220px',
                objectFit: 'cover',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            />
          )}
        </div>

        <div className="card-actions">
          <button
            className="download-btn"
            onClick={() => onDownload(item)}
            title="Download watermarked image"
          >
            Download
          </button>
        </div>
      </div>
    </div>
  );
}
