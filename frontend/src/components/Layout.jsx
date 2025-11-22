import React from 'react';
import { Link } from 'react-router-dom';

function Layout({ children, title }) {
  return (
    <div className="bg-light min-vh-100">
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <div className="container-fluid">
          <Link className="navbar-brand fw-bold" to="/dashboard">
            Icecream Insurance Broker
          </Link>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#mainNavbar"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="mainNavbar">
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              <li className="nav-item">
                <Link className="nav-link" to="/dashboard">
                  Dashboard
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/placement">
                  Placement
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/finance">
                  Finance
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      <main className="container py-4">
        {title && <h2 className="mb-3">{title}</h2>}
        <div className="card shadow-sm border-0">
          <div className="card-body bg-white text-dark">{children}</div>
        </div>
      </main>
    </div>
  );
}

export default Layout;
