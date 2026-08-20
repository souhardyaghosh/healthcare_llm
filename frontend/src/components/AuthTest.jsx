import React, { useState, useEffect } from 'react';
import { registerUser, loginUser, getCurrentUser, testRbacEndpoint } from '../services/api';

export default function AuthTest() {
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [currentUser, setCurrentUser] = useState(null);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [rbacResult, setRbacResult] = useState(null);

  // Fetch current user whenever token exists
  useEffect(() => {
    if (token) {
      fetchMe(token);
    } else {
      setCurrentUser(null);
    }
  }, [token]);

  const fetchMe = async (authToken) => {
    const res = await getCurrentUser(authToken);
    if (res.ok && res.data.success) {
      setCurrentUser(res.data.data.user);
    } else {
      setError(res.data?.error?.message || 'Failed to fetch user context');
      handleLogout();
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    const res = await registerUser(name, email, password);
    if (res.ok && res.data.success) {
      setMessage(`Registration successful! Patient created with ID: ${res.data.data.id}`);
      setMode('login');
      setPassword('');
    } else {
      setError(res.data?.error?.message || 'Registration failed');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    const res = await loginUser(email, password);
    if (res.ok && res.data.success) {
      const newToken = res.data.data.token;
      const user = res.data.data.user;
      localStorage.setItem('token', newToken);
      localStorage.setItem('userRole', user.role);
      setToken(newToken);
      setCurrentUser(user);
      setMessage(`Login successful! Logged in as ${user.email} (Role: ${user.role})`);
      setPassword('');
    } else {
      setError(res.data?.error?.message || 'Login failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    setToken('');
    setCurrentUser(null);
    setMessage('Logged out successfully.');
    setError(null);
    setRbacResult(null);
  };


  const handleRbacCheck = async (endpoint) => {
    setRbacResult(null);
    if (!token) {
      setError('Please log in first.');
      return;
    }
    const res = await testRbacEndpoint(token, endpoint);
    setRbacResult({
      endpoint: `/api/auth/test/${endpoint}`,
      status: res.status,
      ok: res.ok,
      data: res.data
    });
  };

  return (
    <div style={{
      marginTop: '2rem',
      padding: '1.5rem',
      borderRadius: '8px',
      border: '1px solid #e0e0e0',
      backgroundColor: '#fafafa'
    }}>
      <h3>M03 Authentication & RBAC Integration Test</h3>

      {/* Message and Error Alerts */}
      {message && (
        <div id="auth-success-message" style={{ padding: '0.75rem', backgroundColor: '#e8f5e9', color: '#2e7d32', borderRadius: '4px', marginBottom: '1rem' }}>
          {message}
        </div>
      )}
      {error && (
        <div id="auth-error-message" style={{ padding: '0.75rem', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '4px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Auth State */}
      {currentUser ? (
        <div id="auth-user-card" style={{ padding: '1rem', backgroundColor: '#ffffff', border: '1px solid #ccc', borderRadius: '6px', marginBottom: '1.5rem' }}>
          <h4>Authenticated User Session</h4>
          <p><strong>User ID:</strong> <span id="user-id">{currentUser.id}</span></p>
          <p><strong>Name:</strong> <span id="user-name">{currentUser.name}</span></p>
          <p><strong>Email:</strong> <span id="user-email">{currentUser.email}</span></p>
          <p><strong>Role:</strong> <span id="user-role" style={{ fontWeight: 'bold', color: '#1976d2' }}>{currentUser.role}</span></p>
          
          <button id="btn-logout" onClick={handleLogout} style={{ padding: '0.5rem 1rem', cursor: 'pointer', backgroundColor: '#d32f2f', color: '#fff', border: 'none', borderRadius: '4px' }}>
            Log Out
          </button>

          <hr style={{ margin: '1.5rem 0' }} />

          <h4>Test RBAC Permissions</h4>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button id="btn-check-admin" onClick={() => handleRbacCheck('admin')} style={{ padding: '0.5rem', cursor: 'pointer' }}>
              Check Admin Route
            </button>
            <button id="btn-check-doctor" onClick={() => handleRbacCheck('doctor-or-admin')} style={{ padding: '0.5rem', cursor: 'pointer' }}>
              Check Doctor/Admin Route
            </button>
            <button id="btn-check-patient" onClick={() => handleRbacCheck('patient-or-admin')} style={{ padding: '0.5rem', cursor: 'pointer' }}>
              Check Patient/Admin Route
            </button>
          </div>

          {rbacResult && (
            <div id="rbac-result" style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: rbacResult.ok ? '#e8f5e9' : '#ffebee', borderRadius: '4px' }}>
              <p><strong>Endpoint:</strong> {rbacResult.endpoint}</p>
              <p><strong>HTTP Status:</strong> <span id="rbac-status">{rbacResult.status}</span> ({rbacResult.ok ? 'ALLOWED' : 'FORBIDDEN / REJECTED'})</p>
              <pre style={{ fontSize: '0.85rem' }}>{JSON.stringify(rbacResult.data, null, 2)}</pre>
            </div>
          )}
        </div>
      ) : (
        <div>
          {/* Tabs */}
          <div style={{ marginBottom: '1rem' }}>
            <button
              id="tab-login"
              onClick={() => setMode('login')}
              style={{ padding: '0.5rem 1rem', marginRight: '0.5rem', fontWeight: mode === 'login' ? 'bold' : 'normal', backgroundColor: mode === 'login' ? '#1976d2' : '#e0e0e0', color: mode === 'login' ? '#fff' : '#000', border: 'none', borderRadius: '4px' }}
            >
              Login
            </button>
            <button
              id="tab-register"
              onClick={() => setMode('register')}
              style={{ padding: '0.5rem 1rem', fontWeight: mode === 'register' ? 'bold' : 'normal', backgroundColor: mode === 'register' ? '#1976d2' : '#e0e0e0', color: mode === 'register' ? '#fff' : '#000', border: 'none', borderRadius: '4px' }}
            >
              Register Patient
            </button>
          </div>

          {mode === 'register' ? (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '400px' }}>
              <div>
                <label>Full Name:</label>
                <input
                  id="reg-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  required
                  style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
                />
              </div>
              <div>
                <label>Email Address:</label>
                <input
                  id="reg-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. jane.doe@example.com"
                  required
                  style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
                />
              </div>
              <div>
                <label>Password (min 6 chars):</label>
                <input
                  id="reg-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
                />
              </div>
              <button id="btn-submit-register" type="submit" style={{ padding: '0.6rem', backgroundColor: '#2e7d32', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                Create Patient Account
              </button>
            </form>
          ) : (
            <div>
              <div style={{ marginBottom: '1rem', padding: '0.5rem', backgroundColor: '#e9ecef', borderRadius: '4px' }}>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', fontWeight: 'bold' }}>Quick Fill Demo Credentials:</p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => { setEmail('admin@system.com'); setPassword('AdminSecret123!'); }}
                    style={{ padding: '0.3rem 0.6rem', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                  >
                    Admin (admin@system.com)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEmail('dr.smith@example.com'); setPassword('DoctorSecret123!'); }}
                    style={{ padding: '0.3rem 0.6rem', backgroundColor: '#17a2b8', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                  >
                    Doctor (dr.smith@example.com)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEmail('patient.jane@example.com'); setPassword('PatientSecret123!'); }}
                    style={{ padding: '0.3rem 0.6rem', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                  >
                    Patient (patient.jane@example.com)
                  </button>
                </div>
              </div>

              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '400px' }}>
                <div>
                  <label>Email Address:</label>
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. patient@example.com"
                    required
                    style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
                  />
                </div>
                <div>
                  <label>Password:</label>
                  <input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
                  />
                </div>
                <button id="btn-submit-login" type="submit" style={{ padding: '0.6rem', backgroundColor: '#1976d2', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  Sign In
                </button>
              </form>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
