import React, { useState, useEffect } from 'react';
import {
  fetchDoctors,
  fetchDoctorWorkingHours,
  updateDoctorWorkingHours,
  getCurrentUser
} from '../services/api';


const DAYS = [
  { day: 1, label: 'Monday' },
  { day: 2, label: 'Tuesday' },
  { day: 3, label: 'Wednesday' },
  { day: 4, label: 'Thursday' },
  { day: 5, label: 'Friday' },
  { day: 6, label: 'Saturday' },
  { day: 0, label: 'Sunday' }
];

const DEFAULT_SCHEDULE = DAYS.reduce((acc, d) => {
  acc[d.day] = {
    isActive: d.day >= 1 && d.day <= 5, // Mon-Fri default enabled
    startTime: '10:00',
    endTime: '17:00',
    slotDurationMinutes: 30
  };
  return acc;
}, {});

function WorkingHoursManagement() {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(() => localStorage.getItem('userRole') || '');

  const [doctorsList, setDoctorsList] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // 1. Fetch current user context
  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setLoading(false);
        return;
      }
      const res = await getCurrentUser(token);
      if (res.ok && res.data && res.data.data) {
        const u = res.data.data.user;
        setCurrentUser(u);
        setUserRole(u.role);
        localStorage.setItem('userRole', u.role);

        if (u.role === 'ADMIN') {
          loadDoctors(token);
        } else if (u.role === 'DOCTOR') {
          // Doctor self-management
          setSelectedDoctorId(u.id);
          loadWorkingHours(token, u.id);
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    }
    loadUser();
  }, [token]);

  // Load doctors list for ADMIN
  async function loadDoctors(authToken) {
    setError(null);
    const res = await fetchDoctors(authToken);
    if (res.ok && res.data && res.data.data) {
      const docs = res.data.data.doctors || [];
      setDoctorsList(docs);
      if (docs.length > 0) {
        const firstId = docs[0].id;
        setSelectedDoctorId(firstId);
        loadWorkingHours(authToken, firstId);
      } else {
        setLoading(false);
      }
    } else {
      setError(res.data?.error?.message || 'Failed to load doctors list.');
      setLoading(false);
    }
  }

  // Load working hours for selected doctor
  async function loadWorkingHours(authToken, docId) {
    if (!docId) return;
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const res = await fetchDoctorWorkingHours(authToken, docId);
    if (res.ok && res.data && res.data.data) {
      const fetchedHours = res.data.data.workingHours || [];
      const updatedSchedule = { ...DEFAULT_SCHEDULE };

      // Initialize all days to disabled first
      DAYS.forEach(d => {
        updatedSchedule[d.day] = {
          isActive: false,
          startTime: '10:00',
          endTime: '17:00',
          slotDurationMinutes: 30
        };
      });

      // Populate configured days
      fetchedHours.forEach(item => {
        updatedSchedule[item.dayOfWeek] = {
          isActive: item.isActive,
          startTime: item.startTime,
          endTime: item.endTime,
          slotDurationMinutes: item.slotDurationMinutes || 30
        };
      });

      setSchedule(updatedSchedule);
    } else {
      setError(res.data?.error?.message || 'Failed to fetch doctor working hours.');
    }
    setLoading(false);
  }

  // Handle doctor selection change (for ADMIN)
  function handleDoctorChange(e) {
    const docId = e.target.value;
    setSelectedDoctorId(docId);
    if (docId) {
      loadWorkingHours(token, docId);
    }
  }

  // Handle day property field updates
  function handleFieldChange(dayNumber, field, value) {
    setSchedule(prev => ({
      ...prev,
      [dayNumber]: {
        ...prev[dayNumber],
        [field]: value
      }
    }));
    setError(null);
    setSuccessMsg(null);
  }

  // Submit working hours configuration
  async function handleSaveSchedule(e) {
    e.preventDefault();
    if (!selectedDoctorId) {
      setError('Please select a doctor.');
      return;
    }

    // Client-side validation: filter active days
    const activeDays = DAYS.filter(d => schedule[d.day].isActive);

    if (activeDays.length === 0) {
      setError('Please enable at least one working day.');
      return;
    }

    // Check startTime < endTime for active days
    for (const d of activeDays) {
      const item = schedule[d.day];
      const [sh, sm] = item.startTime.split(':').map(Number);
      const [eh, em] = item.endTime.split(':').map(Number);
      if (sh * 60 + sm >= eh * 60 + em) {
        setError(`Invalid schedule on ${d.label}: Start time (${item.startTime}) must be earlier than end time (${item.endTime}).`);
        return;
      }
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    const payload = activeDays.map(d => ({
      dayOfWeek: d.day,
      startTime: schedule[d.day].startTime,
      endTime: schedule[d.day].endTime,
      slotDurationMinutes: parseInt(schedule[d.day].slotDurationMinutes, 10),
      isActive: true
    }));

    const res = await updateDoctorWorkingHours(token, selectedDoctorId, payload);
    setSaving(false);

    if (res.ok) {
      setSuccessMsg('Working hours updated successfully!');
      loadWorkingHours(token, selectedDoctorId);
    } else {
      setError(res.data?.error?.message || 'Failed to update working hours.');
    }
  }

  if (!token) {
    return (
      <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '2rem', textAlign: 'center', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <h2>Authentication Required</h2>
        <p>Please log in as a Doctor or Administrator to access working hours configuration.</p>
      </div>
    );
  }

  if (userRole === 'PATIENT') {
    return (
      <div id="access-restricted-notice" style={{ maxWidth: '800px', margin: '2rem auto', padding: '2.5rem', textAlign: 'center', background: '#fff5f5', border: '1px solid #feb2b2', borderRadius: '12px' }}>
        <h2 style={{ color: '#c53030', marginTop: 0 }}>Access Restricted</h2>
        <p style={{ color: '#742a2a', fontSize: '1.1rem' }}>
          Working hours configuration is restricted to Doctors and Administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="working-hours-container" style={{ maxWidth: '900px', margin: '2rem auto', padding: '2rem', background: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #edf2f7', paddingBottom: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, color: '#2d3748' }}>Working Hours & Slot Configuration</h2>
          <p style={{ margin: '0.25rem 0 0 0', color: '#718096', fontSize: '0.95rem' }}>
            Configure normal working availability and consultation slot duration.
          </p>
        </div>
        <span style={{ padding: '0.35rem 0.75rem', background: '#ebf8ff', color: '#2b6cb0', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.85rem' }}>
          Role: {userRole}
        </span>
      </div>

      {/* Messages */}
      {error && (
        <div id="wh-error-alert" style={{ background: '#fff5f5', borderLeft: '4px solid #e53e3e', color: '#c53030', padding: '1rem', borderRadius: '6px', marginBottom: '1.5rem' }}>
          <strong>Error: </strong> {error}
        </div>
      )}
      {successMsg && (
        <div id="wh-success-alert" style={{ background: '#f0fff4', borderLeft: '4px solid #38a169', color: '#276749', padding: '1rem', borderRadius: '6px', marginBottom: '1.5rem' }}>
          {successMsg}
        </div>
      )}

      {/* Doctor Selection for ADMIN */}
      {userRole === 'ADMIN' && (
        <div style={{ marginBottom: '1.5rem', background: '#f7fafc', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', color: '#4a5568' }}>
            Select Doctor:
          </label>
          <select
            id="doctor-select-dropdown"
            value={selectedDoctorId}
            onChange={handleDoctorChange}
            style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '1rem', background: '#fff' }}
          >
            {doctorsList.length === 0 ? (
              <option value="">No doctors available</option>
            ) : (
              doctorsList.map(doc => (
                <option key={doc.id} value={doc.id}>
                  {doc.name} ({doc.email}) — {doc.doctorProfile?.specialization || 'General'}
                </option>
              ))
            )}
          </select>
        </div>
      )}

      {loading ? (
        <div id="wh-loading-state" style={{ textAlign: 'center', padding: '3rem', color: '#718096' }}>
          Loading schedule data...
        </div>
      ) : (
        <form onSubmit={handleSaveSchedule}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
            {DAYS.map(d => {
              const dayItem = schedule[d.day] || { isActive: false, startTime: '10:00', endTime: '17:00', slotDurationMinutes: 30 };
              return (
                <div
                  key={d.day}
                  className={`wh-day-row day-row-${d.day}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'space-between',
                    padding: '1rem 1.25rem',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: dayItem.isActive ? '#cbd5e0' : '#edf2f7',
                    background: dayItem.isActive ? '#ffffff' : '#f7fafc',
                    opacity: dayItem.isActive ? 1 : 0.75,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* Day Toggle & Label */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '160px' }}>
                    <input
                      type="checkbox"
                      id={`day-checkbox-${d.day}`}
                      checked={dayItem.isActive}
                      onChange={e => handleFieldChange(d.day, 'isActive', e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <label htmlFor={`day-checkbox-${d.day}`} style={{ fontWeight: 'bold', color: dayItem.isActive ? '#2d3748' : '#a0aec0', cursor: 'pointer' }}>
                      {d.label}
                    </label>
                  </div>

                  {/* Time Inputs & Slot Duration */}
                  {dayItem.isActive ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.85rem', color: '#718096' }}>From:</span>
                        <input
                          type="time"
                          id={`start-time-${d.day}`}
                          value={dayItem.startTime}
                          onChange={e => handleFieldChange(d.day, 'startTime', e.target.value)}
                          style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '0.95rem' }}
                        />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.85rem', color: '#718096' }}>To:</span>
                        <input
                          type="time"
                          id={`end-time-${d.day}`}
                          value={dayItem.endTime}
                          onChange={e => handleFieldChange(d.day, 'endTime', e.target.value)}
                          style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '0.95rem' }}
                        />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.85rem', color: '#718096' }}>Slot:</span>
                        <select
                          id={`slot-duration-${d.day}`}
                          value={dayItem.slotDurationMinutes}
                          onChange={e => handleFieldChange(d.day, 'slotDurationMinutes', parseInt(e.target.value, 10))}
                          style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '0.95rem', background: '#fff' }}
                        >
                          <option value={15}>15 min</option>
                          <option value={30}>30 min</option>
                          <option value={45}>45 min</option>
                          <option value={60}>60 min</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <span style={{ color: '#a0aec0', fontStyle: 'italic', fontSize: '0.9rem' }}>
                      Not Working
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              id="save-working-hours-btn"
              disabled={saving}
              style={{
                padding: '0.75rem 2rem',
                background: '#3182ce',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '1rem',
                cursor: saving ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 6px rgba(49, 130, 206, 0.4)'
              }}
            >
              {saving ? 'Saving...' : 'Save Working Hours'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default WorkingHoursManagement;


