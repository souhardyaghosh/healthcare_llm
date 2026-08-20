import React from 'react';
import ApiStatus from '../components/ApiStatus';

export default function Home() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Healthcare Appointment & Follow-up Manager</h1>
      <h2>Module M01 — Project Foundation</h2>
      <p>Frontend foundation connected to backend service health API.</p>
      <ApiStatus />
    </div>
  );
}
