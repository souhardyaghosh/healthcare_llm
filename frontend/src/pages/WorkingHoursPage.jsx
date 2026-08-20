import React from 'react';
import { Link } from 'react-router-dom';
import WorkingHoursManagement from '../components/WorkingHoursManagement';

export default function WorkingHoursPage() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', minHeight: '100vh', background: '#f7fafc' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <Link
          to="/"
          style={{ padding: '0.5rem 1rem', background: '#e2e8f0', color: '#2d3748', textDecoration: 'none', borderRadius: '6px', fontWeight: 'bold' }}
        >
          ← Back to Dashboard
        </Link>
        <Link
          to="/admin/doctors"
          style={{ padding: '0.5rem 1rem', background: '#0f4c81', color: '#ffffff', textDecoration: 'none', borderRadius: '6px', fontWeight: 'bold' }}
        >
          Doctor Management →
        </Link>
      </div>

      <WorkingHoursManagement />
    </div>
  );
}
