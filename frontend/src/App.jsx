import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Spin, notification } from 'antd';
import Login from './components/Login';
import Registration from './components/Registration';
import TodoList from './components/TodoList';
import { getAtlasUserProfile, register } from './api';

const { Content } = Layout;

function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuth, setIsAuth] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Проверка токенов при загрузке
  useEffect(() => {
    const checkAuth = async () => {
      const params = new URLSearchParams(location.search);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken && refreshToken) {
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
        window.history.replaceState({}, '', location.pathname);
        setIsAuth(true);
      } else {
        const storedToken = localStorage.getItem('access_token');
        setIsAuth(!!storedToken);
      }
      setAuthChecked(true);
    };

    checkAuth();
  }, [location]);

  // Обработка успешной авторизации
  useEffect(() => {
    if (!isAuth || isRegistering) return;

    const handleAuth = async () => {
      setIsRegistering(true);
      try {
        const token = localStorage.getItem('access_token');
        const response = await getAtlasUserProfile(token);
        const user = response.data;

        await register({
          email: user.email,
          password: `oauth-${Math.random().toString(36).slice(2)}`,
          name: user.name || user.email.split('@')[0]
        });

        navigate('/');
      } catch (error) {
        console.error('Auth error:', error);
        notification.error({
          message: 'Auth Failed',
          description: error.response?.data?.message || 'Failed to authenticate'
        });
        handleLogout();
      } finally {
        setIsRegistering(false);
      }
    };

    handleAuth();
  }, [isAuth, navigate]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setIsAuth(false);
    navigate('/login');
  };

  const ProtectedRoute = ({ children }) => {
    if (!authChecked || isRegistering) {
      return <Spin fullscreen tip={isRegistering ? "Finalizing login..." : "Loading..."} />;
    }
    return isAuth ? children : <Navigate to="/login" replace />;
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Registration />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <TodoList onLogout={handleLogout} />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Content>
    </Layout>
  );
}

export default function WrappedApp() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}