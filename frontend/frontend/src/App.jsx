import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import DevicesPage from './pages/DevicesPage';
import UsersPage from './pages/UsersPage';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/dashboard"
          element={(
            <PrivateRoute>
              <DashboardPage />
            </PrivateRoute>
          )}
        />
        <Route
          path="/devices"
          element={(
            <PrivateRoute>
              <DevicesPage />
            </PrivateRoute>
          )}
        />
        <Route
          path="/users"
          element={(
            <PrivateRoute role="master">
              <UsersPage />
            </PrivateRoute>
          )}
        />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
