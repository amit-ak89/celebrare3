import { useState, memo, useCallback } from 'react';
import { Grid } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import ImageCard from './ImageCard';
import BottomTray from './BottomTray';

/**
 * Gallery — virtualized image grid using react-window Grid.
 *
 * Virtualization: react-window's Grid renders only the cells visible in the
 * viewport plus a small overscan buffer. For 100+ images this keeps the DOM
 * count ~constant (~20-30 nodes) regardless of total count — smooth 60 fps.
 */

const CARD_HEIGHT      = 320;
const MIN_COLUMN_WIDTH = 260;
const OVERSCAN         = 2;

/** Memoized cell — only re-renders when its own props change */
const Cell = memo(function Cell({ columnIndex, rowIndex, style, data }) {
  const { images, columns, selectedIds, onToggleSelect, onImageClick, onDownload } = data;
  const index = rowIndex * columns + columnIndex;
  if (index >= images.length) return <div style={style} />;

  const item = images[index];
  return (
    <div style={{ ...style, padding: '8px', boxSizing: 'border-box' }}>
      <ImageCard
        item={item}
        isSelected={selectedIds.has(item.id)}
        onToggleSelect={onToggleSelect}
        onImageClick={onImageClick}
        onDownload={onDownload}
      />
    </div>
  );
});

export default function Gallery({
  images, selectedIds, onToggleSelect, onImageClick, onDownload,
  onDownloadSelected, onClearSelection,
}) {
  // Track columns so rowCount stays in sync; updated inside AutoSizer render
  const [columns, setColumns] = useState(3);

  return (
    <div className="gallery-wrapper">
      {selectedIds.size > 0 && (
        <BottomTray
          selectedCount={selectedIds.size}
          onDownloadAll={onDownloadSelected}
          onClearSelection={onClearSelection}
        />
      )}

      <div className="gallery-container">
        {/* AutoSizer measures the container and passes exact pixel dimensions */}
        <AutoSizer disableHeight style={{ width: '100%' }}>
          {({ width }) => {
            const cols     = Math.max(1, Math.floor(width / MIN_COLUMN_WIDTH));
            const colWidth = Math.floor(width / cols);
            const rowCount = Math.ceil(images.length / cols);

            // Keep columns state in sync (triggers re-render of Cell fn only)
            if (cols !== columns) setColumns(cols);

            return (
              <Grid
                columnCount={cols}
                columnWidth={colWidth}
                height={window.innerHeight - 120}
                rowCount={rowCount}
                rowHeight={CARD_HEIGHT}
                width={width}
                overscanRowCount={OVERSCAN}
                itemData={{
                  images,
                  columns: cols,
                  selectedIds,
                  onToggleSelect,
                  onImageClick,
                  onDownload,
                }}
              >
                {Cell}
              </Grid>
            );
          }}
        </AutoSizer>
      </div>
    </div>
  );
}
