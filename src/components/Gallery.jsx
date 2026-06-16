import { useRef, useState, useEffect, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import ImageCard from './ImageCard';
import BottomTray from './BottomTray';

const CARD_HEIGHT = 340;
const MIN_COLUMN_WIDTH = 280;
const OVERSCAN_ROWS = 3;
const FALLBACK_WIDTH = 1000;

const MemoizedCard = memo(function MemoizedCard({ item, isSelected, onToggleSelect, onImageClick, onDownload, style }) {
  return (
    <ImageCard
      item={item}
      isSelected={isSelected}
      onToggleSelect={onToggleSelect}
      onImageClick={onImageClick}
      onDownload={onDownload}
      style={style}
    />
  );
});

export default function Gallery({ images, selectedIds, onToggleSelect, onImageClick, onDownload, onDownloadSelected, onClearSelection }) {
  const parentRef = useRef(null);
  const [columns, setColumns] = useState(() => Math.max(1, Math.floor(FALLBACK_WIDTH / MIN_COLUMN_WIDTH)));

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;

    const updateColumns = () => {
      setColumns(Math.max(1, Math.floor(el.clientWidth / MIN_COLUMN_WIDTH)));
    };

    updateColumns();
    const ro = new ResizeObserver(updateColumns);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const rowCount = Math.ceil(images.length / columns);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => CARD_HEIGHT,
    overscan: OVERSCAN_ROWS,
  });

  return (
    <div className="gallery-wrapper">
      {selectedIds.size > 0 && (
        <BottomTray
          selectedCount={selectedIds.size}
          onDownloadAll={onDownloadSelected}
          onClearSelection={onClearSelection}
        />
      )}

      <div
        className="gallery-container"
        ref={parentRef}
        style={{ height: '720px', overflow: 'auto' }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const rowStart = virtualRow.index * columns;
            const rowEnd = Math.min(rowStart + columns, images.length);

            return (
              <div
                key={virtualRow.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    width: '100%',
                    height: `${CARD_HEIGHT}px`,
                    gap: '12px',
                    padding: '8px',
                    boxSizing: 'border-box',
                  }}
                >
                  {images.slice(rowStart, rowEnd).map((item) => (
                    <div
                      key={item.id}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        height: '100%',
                      }}
                    >
                      <MemoizedCard
                        item={item}
                        isSelected={selectedIds.has(item.id)}
                        onToggleSelect={onToggleSelect}
                        onImageClick={onImageClick}
                        onDownload={onDownload}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
