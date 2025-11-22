import React from 'react';
import Layout from '../components/Layout';

function Dashboard() {
  return (
    <Layout title="Dashboard">
      <div className="row g-3">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h5 className="card-title">Placement</h5>
              <p className="card-text text-secondary">
                Monitor client, insurer, dan policies yang sedang diproses.
              </p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h5 className="card-title">Finance</h5>
              <p className="card-text text-secondary">
                Lihat jadwal pembayaran premium & komisi, aging, dan outstanding.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default Dashboard;
