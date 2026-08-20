import React from 'react';
import { Link } from 'react-router-dom';
import DoctorManagement from '../components/DoctorManagement';

export default function AdminDoctorsPage() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e9ecef', paddingBottom: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, color: '#0f4c81' }}>Healthcare Appointment System</h1>
          <p style={{ margin: '0.2rem 0 0 0', color: '#6c757d' }}>Module M04 — Admin Doctor Management</p>
        </div>
        <Link to="/" style={{ color: '#007bff', textDecoration: 'none', fontWeight: 'bold' }}>
          ← Back to Home / Auth Test
        </Link>
      </div>

      <DoctorManagement />
    </div>
  );
}
