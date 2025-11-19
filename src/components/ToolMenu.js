// src/components/ToolMenu.js
import React from 'react';

const ToolMenu = ({ activeTool, setActiveTool, onClear, onReturn, devMode, setDevMode }) => {
  const tools = [
    { label: 'Force', value: 'force' },
    { label: 'Moment CW', value: 'moment-cw' },
    { label: 'Moment CCW', value: 'moment-ccw' },
    { label: 'Eraser', value: 'eraser' },
  ];

  return (
    <div className="tool-menu" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="toolbar-title">Select an action</div>

      {tools.map((t) => (
        <button
          key={t.value}
          className={activeTool === t.value ? 'active' : ''}
          onClick={() => setActiveTool(activeTool === t.value ? null : t.value)}
        >
          {t.label}
        </button>
      ))}

      <hr />

      <button onClick={onClear}>Clear All</button>

      <hr />

      {/* Dev Mode Toggle */}
      <button
        onClick={() => setDevMode((prev) => !prev)}
        style={{
          background: devMode ? '#4caf50' : '#ddd',
          color: devMode ? 'white' : 'black',
          border: 'none',
          borderRadius: 4,
          padding: '6px 10px',
          cursor: 'pointer',
        }}
      >
        {devMode ? 'Dev Mode: ON' : 'Dev Mode: OFF'}
      </button>

      <hr />

      <button onClick={onReturn}>← Return</button>
    </div>
  );
};

export default ToolMenu;



