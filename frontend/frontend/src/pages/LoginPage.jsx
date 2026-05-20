import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = await authApi.login(email, password);
      localStorage.setItem('token', payload.token);
      localStorage.setItem('user', JSON.stringify(payload.user));
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <main className="page">
      <div className="card" style={{ maxWidth: 420, margin: '60px auto' }}>
        <h2>Login</h2>
        <form onSubmit={onSubmit} className="row" style={{ flexDirection: 'column' }}>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <div style={{ color: '#b00020' }}>{error}</div>}
          <button type="submit">Sign In</button>
          <button type="button" className="secondary" onClick={() => navigate('/register')}>Create account</button>
        </form>
      </div>
    </main>
  );
}
