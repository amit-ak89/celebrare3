import { useState, useEffect, useRef, memo } from 'react';
import { Grid } from 'react-window';
import ImageCard from './ImageCard';
import BottomTray from './BottomTray';

/**
 * Gallery — virtualized image grid using react-window v2 Grid.
 *
 * Virtualization: react-window Grid renders only cells visible in the
 * viewport (+ overscan). DOM node count stays ~constant for 100+ images,
 * keeping scroll at smooth 60 fps.
 *
 * react-window v2 API differences from v1:
 *  - cellComponent prop instead of children render prop
 *  - cellProps are spread directly onto the cell component (no `data` wrapper)
 *  - Grid sizes itself via CSS (overflow:auto, flexGrow:1) — no width/height props
 *  - overscanCount instead of overscanRowCount
 */

const CARD_HEIGHT      = 320;
const MIN_COLUMN_WIDTH = 260;

/**
 * Cell component — receives columnIndex, rowIndex, style, and all cellProps
 * spread directly by react-window v2.
 */
const Cell = memo(function Cell({
  columnIndex, rowIndex, style,
  images, columns, selectedIds, onToggleSelect, onImageClick, onDownload,
}) {
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
  const containerRef = useRef(null);
  const [columns, setColumns]     = useState(3);
  const [gridWidth, setGridWidth] = useState(0);

  // ResizeObserver measures the container to derive column count and column width.
  // Done in useEffect to avoid setState-during-render warnings.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.floor(entry.contentRect.width);
      setGridWidth(w);
      setColumns(Math.max(1, Math.floor(w / MIN_COLUMN_WIDTH)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const colWidth = gridWidth > 0 ? Math.floor(gridWidth / columns) : MIN_COLUMN_WIDTH;
  const rowCount = Math.ceil(images.length / columns);

  // cellProps are spread directly onto each Cell by react-window v2
  const cellProps = { images, columns, selectedIds, onToggleSelect, onImageClick, onDownload };

  return (
    <div className="gallery-wrapper">
      {selectedIds.size > 0 && (
        <BottomTray
          selectedCount={selectedIds.size}
          onDownloadAll={onDownloadSelected}
          onClearSelection={onClearSelection}
        />
      )}

      {/* gallery-container must have an explicit height for the Grid to scroll */}
      <div
        className="gallery-container"
        ref={containerRef}
        style={{ height: `calc(100vh - 120px)` }}
      >
        {gridWidth > 0 && (
          <Grid
            cellComponent={Cell}
            cellProps={cellProps}
            columnCount={columns}
            columnWidth={colWidth}
            rowCount={rowCount}
            rowHeight={CARD_HEIGHT}
            overscanCount={2}
            style={{ width: '100%', height: '100%' }}
          />
        )}
      </div>
    </div>
  );
}
