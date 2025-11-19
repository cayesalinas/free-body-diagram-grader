// src/components/ProblemPicker.jsx
import React from 'react';

export default function ProblemPicker({
  problems,
  selectedId,
  onSelect,
  onContinue,
}) {
  return (
    <div className="problem-picker">
      <h2 className="pp-title">Choose a problem</h2>

      <div className="pp-grid">
        {problems.map((p) => {
          const isActive = p.id === selectedId;

          // Use the SUPPORTED image as the thumbnail.
          // Also prefix with PUBLIC_URL so it works in production.
          const thumbSrc = p.image
            ? process.env.PUBLIC_URL + p.image
            : (p.imageNoSupports ? process.env.PUBLIC_URL + p.imageNoSupports : '');

          return (
            <button
              key={p.id}
              className={`pp-card ${isActive ? 'pp-card--active' : ''}`}
              onClick={() => onSelect(p.id)}
              aria-pressed={isActive}
            >
              <div className="pp-thumb-wrap">
                {thumbSrc ? (
                  <img
                    src={thumbSrc}
                    alt={`${p.title || p.id} thumbnail`}
                    className="pp-thumb"
                    draggable={false}
                  />
                ) : (
                  <div className="pp-thumb pp-thumb--empty">No image</div>
                )}
              </div>
              <div className="pp-meta">
                <span className="pp-title-sm">{p.title || p.id}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="pp-actions">
        <button className="pp-primary" onClick={onContinue}>
          Start Solving
        </button>
      </div>
    </div>
  );
}

