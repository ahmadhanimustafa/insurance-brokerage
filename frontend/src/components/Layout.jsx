import React from 'react';

function Layout({ children, title }) {
  return (
    <div className="layout-page">
      <div className="container py-4">
        {title && (
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h2 className="page-title mb-0">{title}</h2>
          </div>
        )}

        <div className="card shadow-sm border-0 layout-card">
          <div className="card-body">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Layout;
