import React from 'react';
import { Link } from 'react-router-dom';
import ApiStatus from '../components/ApiStatus';
import AuthTest from '../components/AuthTest';
import DoctorManagement from '../components/DoctorManagement';
import WorkingHoursManagement from '../components/WorkingHoursManagement';

export default function Home() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '950px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>Healthcare Appointment & Follow-up Manager</h1>
          <h2 style={{ color: '#0f4c81', margin: '0.5rem 0' }}>Module M05 — Working Hours + Slot Configuration</h2>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link
            to="/admin/doctors"
            style={{ padding: '0.6rem 1rem', backgroundColor: '#0f4c81', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontWeight: 'bold' }}
          >
            Doctor Management →
          </Link>
          <Link
            to="/working-hours"
            style={{ padding: '0.6rem 1rem', backgroundColor: '#3182ce', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontWeight: 'bold' }}
          >
            Working Hours →
          </Link>
        </div>
      </div>

      <p>System connected to Express backend, PostgreSQL database, JWT authentication, Doctor Management, and Working Hours APIs.</p>
      
      <ApiStatus />
      
      <AuthTest />

      <WorkingHoursManagement />

      <DoctorManagement />
    </div>
  );
}


