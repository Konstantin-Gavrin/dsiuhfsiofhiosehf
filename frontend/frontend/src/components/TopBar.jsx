import { useNavigate } from 'react-router-dom';

export default function TopBar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  return (
    <div className="card row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <strong>Nutika Elektrivorgu Juhtimiskeskus</strong>
        <div>{user?.email} ({user?.role})</div>
      </div>
      <div className="row">
        <button className="secondary" onClick={() => navigate('/dashboard')}>Dashboard</button>
        <button className="secondary" onClick={() => navigate('/devices')}>Devices</button>
        {user?.role === 'master' && <button className="secondary" onClick={() => navigate('/users')}>Users</button>}
        <button
          className="danger"
          onClick={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            navigate('/login');
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}
