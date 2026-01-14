import React, { useState } from 'react';

interface Props {
  onAccept: (consent: { analytics: boolean; crash: boolean }) => void;
  onDecline: () => void;
}

const ConsentPopup: React.FC<Props> = ({ onAccept, onDecline }) => {
  const [analytics, setAnalytics] = useState(false);
  const [crash, setCrash] = useState(false);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: '#9e4829',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          maxWidth: '400px',
          width: '90%',
          position: 'relative',
        }}
      >
        <button
          onClick={onDecline}
          style={{
            position: 'absolute',
            top: '10px',
            right: '20px',
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            color: '#000',
          }}
        >
          ×
        </button>
        <h2 style={{ marginTop: 0, color: '#000', fontWeight: 'bold', fontSize: '24px' }}>Privacy Preferences</h2>
        <p style={{ color: '#000' }}>
          We collect data to improve your experience. Analytics tracking helps us understand app usage, while crash reporting allows us to fix issues promptly.
        </p>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '10px', color: '#000' }}>
            <input
              type="checkbox"
              checked={analytics}
              onChange={(e) => setAnalytics(e.target.checked)}
              style={{ marginRight: '10px' }}
            />
            Enable Analytics Tracking
          </label>
          <label style={{ display: 'block', color: '#000' }}>
            <input
              type="checkbox"
              checked={crash}
              onChange={(e) => setCrash(e.target.checked)}
              style={{ marginRight: '10px' }}
            />
            Enable Crash Reporting
          </label>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '20px',
          }}
        >
          <button
            onClick={() => onAccept({ analytics, crash })}
            style={{
              backgroundColor: '#a1b69a',
              color: 'black',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              flex: 1,
              marginRight: '10px',
            }}
          >
            Accept Selected
          </button>
          <button
            onClick={onDecline}
            style={{
              backgroundColor: '#a1b69a',
              color: 'black',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              flex: 1,
              marginLeft: '10px',
            }}
          >
            Decline All
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsentPopup;