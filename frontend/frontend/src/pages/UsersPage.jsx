/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react';
import TopBar from '../components/TopBar';
import { usersApi } from '../api';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setUsers(await usersApi.list());
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="page">
      <TopBar />
      {error && <div className="card" style={{ color: '#b00020' }}>{error}</div>}
      <section className="card">
        <h3>User management (master)</h3>
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Active</th>
              <th>Fixed price</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{String(u.isActive)}</td>
                <td>{u.fixedPriceEurKwh}</td>
                <td className="row">
                  <button className="secondary" onClick={() => usersApi.update(u.id, { isActive: !u.isActive }).then(load)}>
                    {u.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button className="secondary" onClick={() => usersApi.update(u.id, { role: u.role === 'master' ? 'user' : 'master' }).then(load)}>
                    Toggle role
                  </button>
                  <button className="danger" onClick={() => usersApi.remove(u.id).then(load)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
