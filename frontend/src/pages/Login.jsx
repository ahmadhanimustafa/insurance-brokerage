// frontend/src/pages/Login.jsx - FIXED to properly call onLogin callback

import React, { useState } from 'react';
import api from '../services/api';

function Login({ onLogin, theme }) {
  const [email, setEmail] = useState('admin@insurance.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Call backend login endpoint
      const response = await api.post('/auth/login', {
        email,
        password
      });

      if (response.data.success) {
        setSuccess('✅ Login successful! Redirecting...');
        
        // Extract token and user from response
        const token = response.data.data.token;
        const user = response.data.data.user;

        // IMPORTANT: Call parent's onLogin function
        // This will update App state and trigger redirect
        onLogin(token, user);

        // Optional: Also save to localStorage as backup
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));

        // Wait a bit for state to update, then redirect
        setTimeout(() => {
          window.location.href = '/';
        }, 500);
      } else {
        setError('❌ Login failed: ' + (response.data.error?.message || 'Unknown error'));
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error?.message || err.message || 'Network error';
      setError('❌ Login error: ' + errorMsg);
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: theme === 'dark' ? '#212529' : '#ffffff',
      color: theme === 'dark' ? '#ffffff' : '#000000'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
        <div className="card-body" style={{ padding: '40px' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 style={{ fontSize: '48px', marginBottom: '10px' }}>🏢</h1>
            <h2 style={{ marginBottom: '5px' }}>Insurance Brokerage</h2>
            <p style={{ opacity: 0.7, fontSize: '14px', marginBottom: 0 }}>
              Admin Portal
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
              {error}
            </div>
          )}

          {/* Success Alert */}
          {success && (
            <div className="alert alert-success" style={{ marginBottom: '20px' }}>
              {success}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit}>
            {/* Email Input */}
            <div className="mb-3">
              <label className="form-label" style={{ fontWeight: '500' }}>
                📧 Email Address
              </label>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@insurance.com"
                required
                disabled={loading}
              />
            </div>

            {/* Password Input */}
            <div className="mb-3">
              <label className="form-label" style={{ fontWeight: '500' }}>
                🔑 Password
              </label>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>

            {/* Remember Me */}
            <div className="form-check mb-3">
              <input
                className="form-check-input"
                type="checkbox"
                id="rememberMe"
                disabled={loading}
              />
              <label className="form-check-label" htmlFor="rememberMe">
                Remember me
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={loading}
              style={{ marginBottom: '15px' }}
            >
              {loading ? '⏳ Logging in...' : '🔓 Login'}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="alert alert-info" style={{ marginTop: '20px', marginBottom: 0, fontSize: '12px' }}>
            <strong>Demo Credentials:</strong>
            <br />
            📧 Email: <code>admin@insurance.com</code>
            <br />
            🔑 Password: <code>admin123</code>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;