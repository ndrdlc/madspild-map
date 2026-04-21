import React, { useState } from 'react';
import App from './App.jsx';
import LeafletApp from './LeafletApp.jsx';

const btnStyle = {
  position: 'fixed',
  top: 12,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 99999,
  background: '#1B1A17',
  color: '#F3EEE4',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '999px',
  padding: '7px 18px',
  fontSize: '12px',
  fontFamily: '"Inter Tight", Helvetica, sans-serif',
  letterSpacing: '0.01em',
  cursor: 'pointer',
  boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
  whiteSpace: 'nowrap',
};

export default function Root() {
  const [mode, setMode] = useState('new');

  return (
    <>
      {mode === 'new' ? <App /> : <LeafletApp />}
      <button
        style={btnStyle}
        onClick={() => setMode(m => m === 'new' ? 'leaflet' : 'new')}
      >
        {mode === 'new'
          ? '⇄  Se original Leaflet-kort (rigtige data)'
          : '⇄  Se nyt design (prototype)'}
      </button>
    </>
  );
}
