/**
 * BottomTray component
 *
 * A sticky bottom bar that appears when one or more images are selected.
 * It displays the selection count, a "Download Selected" button, and a
 * "Clear Selection" button.
 */
export default function BottomTray({ selectedCount, onDownloadAll, onClearSelection }) {
  return (
    <div className="bottom-tray">
      <span className="tray-count">{selectedCount} image{selectedCount !== 1 ? 's' : ''} selected</span>
      <button className="tray-download-btn" onClick={onDownloadAll}>
        Download Selected
      </button>
      {onClearSelection && (
        <button className="tray-clear-btn" onClick={onClearSelection}>
          Clear
        </button>
      )}
    </div>
  );
}
