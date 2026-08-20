import React from 'react';
import { Link } from 'react-router-dom';
import ApiStatus from '../components/ApiStatus';
import AuthTest from '../components/AuthTest';
import DoctorManagement from '../components/DoctorManagement';

export default function Home() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>Healthcare Appointment & Follow-up Manager</h1>
          <h2 style={{ color: '#0f4c81', margin: '0.5rem 0' }}>Module M04 — Admin Doctor Management</h2>
        </div>
        <Link
          to="/admin/doctors"
          style={{ padding: '0.6rem 1.2rem', backgroundColor: '#0f4c81', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontWeight: 'bold' }}
        >
          Go to /admin/doctors →
        </Link>
      </div>

      <p>System connected to Express backend, PostgreSQL database, JWT authentication, and Admin Doctor Management APIs.</p>
      
      <ApiStatus />
      
      <AuthTest />

      <DoctorManagement />
    </div>
  );
}

