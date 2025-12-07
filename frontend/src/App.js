// frontend/src/App.js - cleaned up layout & pure Bootstrap theming

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './App.css';



// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Placement from './pages/Placement';
import ProtectedRoute from './components/ProtectedRoute';
import Finance from './pages/Finance';
import Admin from './pages/Admin';
//import Proposal from './pages/Proposal';

function App() {
  const [theme, setTheme] = useState('light');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Add loading state

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        setIsAuthenticated(true);
        setUser(JSON.parse(userData));
      } catch (err) {
        console.error('Error parsing user data:', err);
        setIsAuthenticated(false);
        setUser(null);
      }
    } else {
      setIsAuthenticated(false);
      setUser(null);
    }

    // Apply saved theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    applyTheme(savedTheme);

    // Done initializing
    setLoading(false);
  }, []);

  const applyTheme = (themeName) => {
    const html = document.documentElement;
    if (themeName === 'dark') {
      html.setAttribute('data-bs-theme', 'dark');
      html.style.backgroundColor = '#212529';
      html.style.color = '#ffffff';
    } else {
      html.setAttribute('data-bs-theme', 'light');
      html.style.backgroundColor = '#ffffff';
      html.style.color = '#000000';
    }
    localStorage.setItem('theme', themeName);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  const handleLogin = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setIsAuthenticated(true);
    setUser(userData);
    // Don't need to navigate - route will auto-redirect to /
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
  };

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100 bg-body text-body">
        <div className="text-center">
          <h3>⏳ Loading...</h3>
          <p>Please wait while we initialize the application.</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className={`app-wrapper ${theme} min-vh-100 bg-body text-body`}>
        {/* Navigation */}
        {isAuthenticated && (
          <nav className={`navbar navbar-expand-lg border-bottom ${theme === 'dark' ? 'navbar-dark bg-dark' : 'navbar-light bg-light'}`}>
            <div className="container-fluid">
              <a className={`navbar-brand fw-bold ${theme === 'dark' ? 'text-light' : 'text-dark'}`} href="/">
                🏢 Insurance Brokerage
              </a>
              <button
                className="navbar-toggler"
                type="button"
                data-bs-toggle="collapse"
                data-bs-target="#navbarNav"
                aria-controls="navbarNav"
                aria-expanded="false"
                aria-label="Toggle navigation"
              >
                <span className="navbar-toggler-icon"></span>
              </button>
              <div className="collapse navbar-collapse" id="navbarNav">
                <ul className="navbar-nav ms-auto">
                  <li className="nav-item">
                    <a className={`nav-link ${theme === 'dark' ? 'text-light' : 'text-dark'}`} href="/">
                      📊 Dashboard
                    </a>
                  </li>
                  <li className="nav-item">
                    <a className={`nav-link ${theme === 'dark' ? 'text-light' : 'text-dark'}`} href="/placement">
                      📋 Placement
                    </a>
                  </li>
                  <li className="nav-item">
                    <a className={`nav-link ${theme === 'dark' ? 'text-light' : 'text-dark'}`} href="/finance">
                      💸 Finance
                    </a>
                  </li>
                  {user?.role === 'Admin' && (
                    <li className="nav-item">
                      <a className={`nav-link ${theme === 'dark' ? 'text-light' : 'text-dark'}`} href="/admin">
                        👥 Admin
                      </a>
                    </li>
                  )}
                  <li className="nav-item">
                    <button 
                      className="btn btn-sm btn-outline-secondary ms-2"
                      onClick={toggleTheme}
                      title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                    >
                      {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
                    </button>
                  </li>
                  <li className="nav-item">
                    <button 
                      className="btn btn-sm btn-danger ms-2"
                      onClick={() => {
                        handleLogout();
                        window.location.href = '/login';
                      }}
                    >
                      🚪 Logout
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </nav>
        )}

        {/* Main Content */}
        <main className={`flex-grow-1 ${!isAuthenticated ? 'min-vh-100' : ''} bg-body text-body`}>
          <div className="container py-4">
            <Routes>
              {/* Login route */}
              <Route 
                path="/login" 
                element={
                  isAuthenticated ? (
                    <Navigate to="/" replace />
                  ) : (
                    <Login onLogin={handleLogin} theme={theme} />
                  )
                } 
              />

              {/* Dashboard route */}
              <Route 
                path="/" 
                element={
                  isAuthenticated ? (
                    <Dashboard theme={theme} user={user} />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                } 
              />

              {/* Placement route */}
              <Route 
                path="/placement" 
                element={
                  isAuthenticated ? (
                    <Placement />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                } 
              />
              
               { /* Finance route */ }
              <Route
                path="/finance"
                element={
                  isAuthenticated ? (
                    <Finance/>
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />

              {/* Admin route - Only for Admin role */}
              <Route
                path="/admin"
                element={
                  isAuthenticated && user?.role === 'Admin' ? (
                    <Admin/>
                  ) : (
                    <Navigate to="/" replace />
                  )
                }
              />

              {/* Catch all - redirect to login or dashboard */}
              <Route 
                path="*" 
                element={
                  <Navigate to={isAuthenticated ? "/" : "/login"} replace />
                } 
              />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;
