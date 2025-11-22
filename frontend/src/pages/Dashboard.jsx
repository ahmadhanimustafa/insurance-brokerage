// frontend/src/pages/Dashboard.js - Main dashboard page

import React, { useState, useEffect } from 'react';

function Dashboard({ theme, user }) {
  const [stats, setStats] = useState({
    totalClients: 0,
    totalPolicies: 0,
    totalPremium: 0,
    totalCommission: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch dashboard data
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      // Mock data for now - you can connect to real API
      setStats({
        totalClients: 12,
        totalPolicies: 24,
        totalPremium: 50000000,
        totalCommission: 3750000
      });
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="mb-4">
        <h1 className="h3 text-muted mb-1">
          📊 Dashboard
        </h1>
        <p className="text-muted mb-0">
          Welcome, {user?.name || 'User'}! Here's an overview of your business.
        </p>
      </div>

      {/* Stats Cards */}
      {loading ? (
        <div className="alert alert-info">Loading dashboard data...</div>
      ) : (
        <div className="row g-3 mb-4">
          {/* Total Clients */}
          <div className="col-6 col-md-3">
            <div className="card h-100">
              <div className="card-body text-center">
                <h5 className="card-title text-muted small mb-1">Total Clients</h5>
                <div className="h3 mb-1 text-primary">
                  {stats.totalClients}
                </div>
                <p className="text-muted small mb-0">👥 Registered clients</p>
              </div>
            </div>
          </div>

          {/* Total Policies */}
          <div className="col-6 col-md-3">
            <div className="card h-100">
              <div className="card-body text-center">
                <h5 className="card-title text-muted small mb-1">Total Policies</h5>
                <div className="h3 mb-1 text-success">
                  {stats.totalPolicies}
                </div>
                <p className="text-muted small mb-0">📋 Active policies</p>
              </div>
            </div>
          </div>

          {/* Total Premium */}
          <div className="col-6 col-md-3">
            <div className="card h-100">
              <div className="card-body text-center">
                <h5 className="card-title text-muted small mb-1">Total Premium</h5>
                <div className="h3 mb-1 text-warning">
                  {(stats.totalPremium / 1000000).toFixed(1)}M
                </div>
                <p className="text-muted small mb-0">💰 IDR</p>
              </div>
            </div>
          </div>

          {/* Total Commission */}
          <div className="col-6 col-md-3">
            <div className="card h-100">
              <div className="card-body text-center">
                <h5 className="card-title text-muted small mb-1">Total Commission</h5>
                <div className="h3 mb-1 text-danger">
                  {(stats.totalCommission / 1000000).toFixed(1)}M
                </div>
                <p className="text-muted small mb-0">💵 IDR</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="row">
        <div className="col-md-6 mb-3">
          <div className="card h-100">
            <div className="card-header bg-primary text-white fw-bold">
              🚀 Quick Actions
            </div>
            <div className="card-body">
              <div className="d-grid gap-2">
                <a href="/placement" className="btn btn-secondary">
                  ➕ Add New Client
                </a>
                <a href="/placement" className="btn btn-secondary">
                  📋 Create New Policy
                </a>
                <a href="/placement" className="btn btn-secondary">
                  📄 View Policies
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* System Info */}
        <div className="col-md-6 mb-3">
          <div className="card h-100">
            <div className="card-header bg-info text-dark fw-bold">
              ℹ️ System Information
            </div>
            <div className="card-body">
              <table className="table table-sm mb-0">
                <tbody>
                  <tr>
                    <td className="fw-semibold">Version:</td>
                    <td>1.0.0</td>
                  </tr>
                  <tr>
                    <td className="fw-semibold">Status:</td>
                    <td><span className="badge bg-success">🟢 Active</span></td>
                  </tr>
                  <tr>
                    <td className="fw-semibold">Theme:</td>
                    <td>
                      <span className="badge bg-secondary">
                        {(theme || 'light').toUpperCase()}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="fw-semibold">User Role:</td>
                    <td><span className="badge bg-info">Admin</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="row mt-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header bg-body-tertiary fw-semibold">
              📝 Recent Activity
            </div>
            <div className="card-body">
              <div className="alert alert-info mb-0">
                ℹ️ No recent activity yet. Start by adding clients or creating policies in the Placement module.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
