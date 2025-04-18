import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Spin, notification } from 'antd';
import Login from './components/Login';
import Registration from './components/Registration';
import TodoList from './components/TodoList';
import { registerOAuthUser, login, registerLocalUser } from './api';

const { Content } = Layout;

function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuth, setIsAuth] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Проверка аутентификации при загрузке
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    setIsAuth(!!token);
    setAuthChecked(true);
  }, []);

  // Обработка OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const atlasToken = params.get('access_token');

    if (atlasToken) {
      handleOAuthCallback(atlasToken);
      window.history.replaceState({}, '', location.pathname);
    }
  }, [location]);

  const handleOAuthCallback = async (atlasToken) => {
    setIsProcessing(true);
    try {
      // 1. Регистрируем/логиним пользователя через OAuth
      const { access_token } = await registerOAuthUser(atlasToken);

      // 2. Сохраняем наш токен
      localStorage.setItem('access_token', access_token);
      setIsAuth(true);
      navigate('/');

      notification.success({
        message: 'Successfully logged in via OAuth'
      });

    } catch (error) {
      notification.error({
        message: 'OAuth Failed',
        description: error.response?.data?.message || 'Authentication error'
      });
      navigate('/login');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLocalLogin = async (credentials) => {
    setIsProcessing(true);
    try {
      const { access_token } = await login(credentials);
      localStorage.setItem('access_token', access_token);
      setIsAuth(true);
      navigate('/');
    } catch (error) {
      notification.error({
        message: 'Login Failed',
        description: error.response?.data?.message || 'Invalid credentials'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLocalRegister = async (userData) => {
    setIsProcessing(true);
    try {
      await registerLocalUser(userData);
      notification.success({
        message: 'Registration Successful',
        description: 'You can now log in using your credentials'
      });
      navigate('/login');
    } catch (error) {
      notification.error({
        message: 'Registration Failed',
        description: error.response?.data?.message || 'Registration error'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    setIsAuth(false);
    navigate('/login');
  };

  const ProtectedRoute = ({ children }) => {
    if (!authChecked || isProcessing) {
      return <Spin fullscreen tip="Loading..." />;
    }
    return isAuth ? children : <Navigate to="/login" replace />;
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content>
        <Routes>
          <Route path="/login" element={<Login onLogin={handleLocalLogin} />} />
          <Route path="/register" element={<Registration onRegister={handleLocalRegister} />} />
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