import { useCallback, useEffect, useRef } from 'react';

/**
 * ImageModal component
 *
 * Provides a full-screen overlay preview. Clicking the background
 * (outside the image) closes the modal.
 */
export default function ImageModal({ item, onClose }) {
  const modalRef = useRef(null);

  // Close modal on Esc key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleBackdropClick = (e) => {
    if (e.target === modalRef.current) onClose();
  };

  return (
    <div className="modal-backdrop" ref={modalRef} onClick={handleBackdropClick}>
      <div className="modal-content">
        <button className="modal-close" onClick={onClose} aria-label="Close">
          &times;
        </button>
        <img
          src={item.downloadUrl}
          alt={item.title}
          className="modal-image"
        />
        <div className="modal-caption">{item.title}</div>
      </div>
    </div>
  );
}
