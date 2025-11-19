import React from 'react';
import useImage from 'use-image';

const PromptView = ({ imagePath, onStart, onReturnToMenu }) => {
  const [image] = useImage(imagePath);

  return (
    <div style={{ textAlign: 'center', paddingTop: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        {image && (
          <img
            src={imagePath}
            alt="Structure with Supports"
            style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
          />
        )}
      </div>

      <div
        style={{
          textAlign: 'center',
          padding: '20px',
          display: 'flex',
          gap: 12,
          justifyContent: 'center',
        }}
      >
        <button
          onClick={onReturnToMenu}
          style={{
            padding: '10px 16px',
            fontSize: 15,
            borderRadius: 6,
            backgroundColor: '#eee',
            color: '#333',
            border: '1px solid #ccc',
            cursor: 'pointer',
          }}
        >
          ← Return to Menu
        </button>

        <button
          onClick={onStart}
          style={{
            padding: '10px 20px',
            fontSize: 16,
            borderRadius: 6,
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Solve the Free Body Diagram
        </button>
      </div>
    </div>
  );
};

export default PromptView;







