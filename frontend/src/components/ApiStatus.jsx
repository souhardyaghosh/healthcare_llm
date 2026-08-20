import React, { useState, useEffect } from 'react';
import { checkHealth } from '../services/api';

export default function ApiStatus() {
  const [status, setStatus] = useState('checking'); // 'checking' | 'connected' | 'unavailable'
  const [message, setMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function fetchStatus() {
      setStatus('checking');
      const result = await checkHealth();
      if (!isMounted) return;

      if (result.ok) {
        setStatus('connected');
        setMessage(`Connected (${result.data.service || 'Backend Service'})`);
      } else {
        setStatus('unavailable');
        setMessage(result.error || 'Backend service unavailable');
      }
    }

    fetchStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h3>Backend Connection Status:</h3>
      {status === 'checking' && (
        <span style={{ color: '#007bff', fontWeight: 'bold' }}>Checking...</span>
      )}
      {status === 'connected' && (
        <span style={{ color: '#28a745', fontWeight: 'bold' }}>Connected</span>
      )}
      {status === 'unavailable' && (
        <span style={{ color: '#dc3545', fontWeight: 'bold' }}>Unavailable</span>
      )}
      {message && <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#6c757d' }}>{message}</p>}
    </div>
  );
}
