import React, { useState, useEffect } from 'react';
import { fetchDoctors, fetchDoctorById, createDoctor, updateDoctor } from '../services/api';

export default function DoctorManagement({ token: propToken, userRole: propRole }) {
  // Read token and role from props or fallback to localStorage
  const token = propToken || localStorage.getItem('token');
  const userRole = propRole || localStorage.getItem('userRole');

  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal / Form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [viewingDoctor, setViewingDoctor] = useState(null);

  // Form inputs
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    specialization: '',
    bio: '',
    password: ''
  });
  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  useEffect(() => {
    if (token && userRole === 'ADMIN') {
      loadDoctors();
    }
  }, [token, userRole]);

  const loadDoctors = async () => {
    setLoading(true);
    setError('');
    const res = await fetchDoctors(token);
    setLoading(false);

    if (res.ok && res.data && res.data.success) {
      setDoctors(res.data.data.doctors || []);
    } else {
      setError(res.data?.error?.message || res.error || 'Failed to load doctors list');
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const openCreateModal = () => {
    setFormData({ name: '', email: '', specialization: '', bio: '', password: '' });
    setFormError('');
    setShowCreateModal(true);
  };

  const openEditModal = (doc) => {
    setEditingDoctor(doc);
    setFormData({
      name: doc.name || '',
      email: doc.email || '',
      specialization: doc.doctorProfile?.specialization || '',
      bio: doc.doctorProfile?.bio || '',
      password: ''
    });
    setFormError('');
  };

  const openViewModal = async (id) => {
    setLoading(true);
    const res = await fetchDoctorById(token, id);
    setLoading(false);
    if (res.ok && res.data && res.data.data?.doctor) {
      setViewingDoctor(res.data.data.doctor);
    } else {
      setError('Failed to fetch doctor details');
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSubmitting(true);

    const res = await createDoctor(token, formData);
    setFormSubmitting(false);

    if (res.ok && res.data && res.data.success) {
      setSuccess('Doctor account created successfully!');
      setShowCreateModal(false);
      loadDoctors();
      setTimeout(() => setSuccess(''), 4000);
    } else {
      setFormError(res.data?.error?.message || res.error || 'Failed to create doctor');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingDoctor) return;
    setFormError('');
    setFormSubmitting(true);

    const updatePayload = {
      name: formData.name,
      email: formData.email,
      specialization: formData.specialization,
      bio: formData.bio
    };

    const res = await updateDoctor(token, editingDoctor.id, updatePayload);
    setFormSubmitting(false);

    if (res.ok && res.data && res.data.success) {
      setSuccess('Doctor profile updated successfully!');
      setEditingDoctor(null);
      loadDoctors();
      setTimeout(() => setSuccess(''), 4000);
    } else {
      setFormError(res.data?.error?.message || res.error || 'Failed to update doctor');
    }
  };

  // Frontend Role Guard Notice
  if (userRole !== 'ADMIN') {
    return (
      <div style={{ padding: '1.5rem', backgroundColor: '#fff3cd', border: '1px solid #ffeeba', color: '#856404', borderRadius: '6px', margin: '1rem 0' }}>
        <h3>Access Restricted</h3>
        <p>Admin privileges required to manage doctor accounts and profiles. Log in as an <strong>ADMIN</strong> account to access this interface.</p>
        <small style={{ color: '#6c757d' }}>(Note: Backend API strictly enforces role-based access control independently).</small>
      </div>
    );
  }

  return (
    <div style={{ marginTop: '2rem', padding: '1.5rem', border: '1px solid #17a2b8', borderRadius: '8px', backgroundColor: '#fdfdfd' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, color: '#0f4c81' }}>Admin Doctor Management</h2>
        <div>
          <button
            onClick={openCreateModal}
            style={{ padding: '0.5rem 1rem', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginRight: '0.5rem' }}
          >
            + Add New Doctor
          </button>
          <button
            onClick={loadDoctors}
            style={{ padding: '0.5rem 1rem', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Refresh
          </button>
        </div>
      </div>

      {success && (
        <div style={{ padding: '0.75rem', backgroundColor: '#d4edda', color: '#155724', border: '1px solid #c3e6cb', borderRadius: '4px', marginBottom: '1rem' }}>
          {success}
        </div>
      )}

      {error && (
        <div style={{ padding: '0.75rem', backgroundColor: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb', borderRadius: '4px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <p>Loading doctor records from database...</p>
      ) : doctors.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#f8f9fa', border: '1px dashed #ced4da', borderRadius: '6px' }}>
          <p style={{ margin: 0, color: '#6c757d' }}>No doctor accounts found in system.</p>
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#e9ecef', textAlign: 'left' }}>
              <th style={{ padding: '0.75rem', borderBottom: '2px solid #dee2e6' }}>Name</th>
              <th style={{ padding: '0.75rem', borderBottom: '2px solid #dee2e6' }}>Email</th>
              <th style={{ padding: '0.75rem', borderBottom: '2px solid #dee2e6' }}>Specialization</th>
              <th style={{ padding: '0.75rem', borderBottom: '2px solid #dee2e6' }}>Bio</th>
              <th style={{ padding: '0.75rem', borderBottom: '2px solid #dee2e6' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {doctors.map((doc) => (
              <tr key={doc.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{doc.name}</td>
                <td style={{ padding: '0.75rem' }}>{doc.email}</td>
                <td style={{ padding: '0.75rem' }}>
                  <span style={{ backgroundColor: '#e2e3e5', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.9rem' }}>
                    {doc.doctorProfile?.specialization || 'N/A'}
                  </span>
                </td>
                <td style={{ padding: '0.75rem', fontSize: '0.9rem', color: '#495057', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {doc.doctorProfile?.bio || 'No bio provided'}
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <button
                    onClick={() => openViewModal(doc.id)}
                    style={{ padding: '0.3rem 0.6rem', backgroundColor: '#17a2b8', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '0.4rem', fontSize: '0.85rem' }}
                  >
                    View
                  </button>
                  <button
                    onClick={() => openEditModal(doc)}
                    style={{ padding: '0.3rem 0.6rem', backgroundColor: '#ffc107', color: '#212529', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* CREATE DOCTOR MODAL */}
      {showCreateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '8px', width: '100%', maxWidth: '500px' }}>
            <h3 style={{ marginTop: 0, color: '#0f4c81' }}>Create New Doctor Account</h3>
            {formError && (
              <div style={{ padding: '0.5rem', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.9rem' }}>
                {formError}
              </div>
            )}
            <form onSubmit={handleCreateSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 'bold' }}>Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g. Dr. Sarah Jenkins"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ced4da' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 'bold' }}>Email Address *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g. s.jenkins@hospital.org"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ced4da' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 'bold' }}>Specialization *</label>
                <input
                  type="text"
                  name="specialization"
                  value={formData.specialization}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g. Cardiology, Neurology, Pediatrics"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ced4da' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 'bold' }}>Bio / Summary</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Optional professional biography..."
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ced4da' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 'bold' }}>Initial Password (Optional)</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Defaults to DoctorSecret123!"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ced4da' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ padding: '0.5rem 1rem', border: '1px solid #6c757d', background: '#fff', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  style={{ padding: '0.5rem 1rem', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  {formSubmitting ? 'Creating...' : 'Create Doctor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT DOCTOR MODAL */}
      {editingDoctor && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '8px', width: '100%', maxWidth: '500px' }}>
            <h3 style={{ marginTop: 0, color: '#0f4c81' }}>Edit Doctor Account</h3>
            {formError && (
              <div style={{ padding: '0.5rem', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.9rem' }}>
                {formError}
              </div>
            )}
            <form onSubmit={handleEditSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 'bold' }}>Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ced4da' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 'bold' }}>Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ced4da' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 'bold' }}>Specialization</label>
                <input
                  type="text"
                  name="specialization"
                  value={formData.specialization}
                  onChange={handleInputChange}
                  required
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ced4da' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 'bold' }}>Bio / Summary</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  rows="3"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ced4da' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingDoctor(null)}
                  style={{ padding: '0.5rem 1rem', border: '1px solid #6c757d', background: '#fff', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  style={{ padding: '0.5rem 1rem', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  {formSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DOCTOR MODAL */}
      {viewingDoctor && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '8px', width: '100%', maxWidth: '500px' }}>
            <h3 style={{ marginTop: 0, color: '#0f4c81' }}>Doctor Profile Details</h3>
            <div style={{ backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '6px', marginBottom: '1.5rem' }}>
              <p style={{ margin: '0.4rem 0' }}><strong>ID:</strong> {viewingDoctor.id}</p>
              <p style={{ margin: '0.4rem 0' }}><strong>Name:</strong> {viewingDoctor.name}</p>
              <p style={{ margin: '0.4rem 0' }}><strong>Email:</strong> {viewingDoctor.email}</p>
              <p style={{ margin: '0.4rem 0' }}><strong>System Role:</strong> <span style={{ color: '#28a745', fontWeight: 'bold' }}>{viewingDoctor.role}</span></p>
              <p style={{ margin: '0.4rem 0' }}><strong>Specialization:</strong> {viewingDoctor.doctorProfile?.specialization || 'N/A'}</p>
              <p style={{ margin: '0.4rem 0' }}><strong>Biography:</strong> {viewingDoctor.doctorProfile?.bio || 'None provided'}</p>
              <p style={{ margin: '0.4rem 0', fontSize: '0.85rem', color: '#6c757d' }}><strong>Created:</strong> {new Date(viewingDoctor.createdAt).toLocaleString()}</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setViewingDoctor(null)}
                style={{ padding: '0.5rem 1rem', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
