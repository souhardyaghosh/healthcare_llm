import React from 'react';
import ApiStatus from '../components/ApiStatus';
import AuthTest from '../components/AuthTest';

export default function Home() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Healthcare Appointment & Follow-up Manager</h1>
      <h2>Module M03 — Authentication & RBAC</h2>
      <p>Frontend foundation connected to Express backend, PostgreSQL database, and JWT authentication service.</p>
      
      <ApiStatus />
      
      <AuthTest />
    </div>
  );
}
