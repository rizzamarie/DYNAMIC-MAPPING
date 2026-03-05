// CategoryModal.jsx
import React, { useEffect } from 'react';
import Category from './Category'; // Adjust if Category.jsx is in a different folder

export default function CategoryModal({ onClose }) {
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('app:modal', { detail: { open: true } }));
    return () => window.dispatchEvent(new CustomEvent('app:modal', { detail: { open: false } }));
  }, []);
  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: 9999,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <div style={{
        background: 'white',
        width: '95%',
        height: '95%',
        borderRadius: '8px',
        overflow: 'hidden',
        position: 'relative',
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '5px',
            cursor: 'pointer',
            zIndex: 10,
          }}
        >
          ✕ Close
        </button>
        <Category isPopup={true} />
      </div>
    </div>
  );
}
