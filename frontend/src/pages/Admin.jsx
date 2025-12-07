// frontend/src/pages/Admin.jsx - User Management

import React, { useState, useEffect } from 'react';
import api from '../services/api';

function Admin() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [currentUser, setCurrentUser] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    password: '',
    role_id: '',
    department_id: ''
  });

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    fetchDepartments();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      if (response.data.success) {
        setUsers(response.data.data);
      }
    } catch (err) {
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await api.get('/users/meta/roles');
      if (response.data.success) {
        setRoles(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/users/meta/departments');
      if (response.data.success) {
        setDepartments(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    }
  };

  const handleAddUser = () => {
    setModalMode('create');
    setCurrentUser(null);
    setFormData({
      email: '',
      full_name: '',
      password: '',
      role_id: '',
      department_id: ''
    });
    setError('');
    setSuccess('');
    setShowModal(true);
  };

  const handleEditUser = (user) => {
    setModalMode('edit');
    setCurrentUser(user);
    setFormData({
      email: user.email,
      full_name: user.full_name,
      password: '', // Don't pre-fill password
      role_id: user.role_id,
      department_id: user.department_id || ''
    });
    setError('');
    setSuccess('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (modalMode === 'create') {
        const response = await api.post('/users', formData);
        if (response.data.success) {
          setSuccess('User created successfully!');
          fetchUsers();
          setTimeout(() => setShowModal(false), 1500);
        }
      } else {
        const updateData = { ...formData };
        if (!updateData.password) {
          delete updateData.password; // Don't update password if empty
        }
        const response = await api.put(`/users/${currentUser.id}`, updateData);
        if (response.data.success) {
          setSuccess('User updated successfully!');
          fetchUsers();
          setTimeout(() => setShowModal(false), 1500);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Operation failed');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const response = await api.delete(`/users/${userId}`);
      if (response.data.success) {
        setSuccess('User deleted successfully!');
        fetchUsers();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Delete failed');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleResetPassword = async (userId) => {
    const tempPassword = prompt('Enter temporary password for this user:');
    if (!tempPassword) return;

    try {
      const response = await api.post(`/users/${userId}/reset-password`, {
        temporary_password: tempPassword
      });
      if (response.data.success) {
        alert(`Password reset successfully!\nTemporary password: ${tempPassword}`);
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Password reset failed');
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="loading"></div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>👥 User Management</h2>
        <button className="btn btn-primary" onClick={handleAddUser}>
          ➕ Add New User
        </button>
      </div>

      {error && <div className="alert alert-danger mb-3">{error}</div>}
      {success && <div className="alert alert-success mb-3">{success}</div>}

      <div className="card">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.full_name}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className="badge badge-primary">{user.role_name}</span>
                    </td>
                    <td>{user.department_name || '-'}</td>
                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-info me-2"
                        onClick={() => handleEditUser(user)}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className="btn btn-sm btn-warning me-2"
                        onClick={() => handleResetPassword(user.id)}
                      >
                        🔑 Reset Password
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={user.role_name === 'Admin'}
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* User Modal */}
      {showModal && (
        <div className="modal fade show d-block" style={{ zIndex: 1050 }}>
          <div className="modal-backdrop fade show"></div>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  {modalMode === 'create' ? '➕ Add New User' : '✏️ Edit User'}
                </h5>
                <button
                  className="btn-close btn-close-white"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                {error && <div className="alert alert-danger mb-3">{error}</div>}
                {success && <div className="alert alert-success mb-3">{success}</div>}

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label fw-medium">Full Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-medium">Email *</label>
                    <input
                      type="email"
                      className="form-control"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-medium">
                      Password {modalMode === 'create' ? '*' : '(leave blank to keep current)'}
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required={modalMode === 'create'}
                      placeholder={modalMode === 'edit' ? 'Leave blank to keep current password' : ''}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-medium">Role *</label>
                    <select
                      className="form-select"
                      value={formData.role_id}
                      onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                      required
                    >
                      <option value="">Select Role</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-medium">Department</label>
                    <select
                      className="form-select"
                      value={formData.department_id}
                      onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                    >
                      <option value="">Select Department (Optional)</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="d-flex justify-content-end gap-2">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowModal(false)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      {modalMode === 'create' ? 'Create User' : 'Update User'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Admin;
