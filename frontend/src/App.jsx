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

  // Эффект 1: Проверка токенов в URL и localStorage
  useEffect(() => {
    console.log('[App] Running URL/LocalStorage Check Effect...');
    let foundTokenInUrl = false;

    // Проверка URL на токены
    const params = new URLSearchParams(location.search);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
      console.log('[App] Found tokens in URL parameters.');
      foundTokenInUrl = true;

      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      setIsAuth(true);

      // Очищаем URL от токенов
      const cleanUrl = location.pathname + location.hash;
      window.history.replaceState({}, document.title, cleanUrl);

      setAuthChecked(true);
      notification.success({ message: 'Login Successful', description: 'Welcome!' });
      return;
    }

    // Проверка localStorage
    console.log('[App] No tokens in URL, checking localStorage...');
    const storedAccessToken = localStorage.getItem('access_token');
    const storedRefreshToken = localStorage.getItem('refresh_token');

    if (storedAccessToken && storedRefreshToken) {
      try {
        const decoded = JSON.parse(atob(storedAccessToken.split('.')[1]));
        const expiresAt = decoded.exp * 1000;
        const now = Date.now();
        const isAuthenticated = now < expiresAt;

        setIsAuth(isAuthenticated);
        if (!isAuthenticated) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
      } catch (e) {
        console.error("[App] Error decoding token:", e);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setIsAuth(false);
      }
    } else {
      setIsAuth(false);
    }

    setAuthChecked(true);
  }, [location.search, location.pathname]);

  // Эффект 2: Обработка успешной авторизации
  useEffect(() => {
    if (!isAuth || isRegistering) return;

    const handleSuccessfulAuth = async () => {
      setIsRegistering(true);
      try {
        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) return;

        console.log('[App] Fetching user profile from Atlas...');
        const response = await getAtlasUserProfile(accessToken);
        const userData = response.data;

        console.log('[App] Registering user in local DB...');
        await register({
          email: userData.email,
          password: `oauth-${Math.random().toString(36).slice(2)}`,
          name: userData.name || userData.email.split('@')[0],
          atlasId: userData.id
        });

        navigate('/');
        notification.success({
          message: 'Welcome!',
          description: 'You have been successfully registered and logged in.',
        });
      } catch (error) {
        console.error('[App] Registration error:', error);
        notification.error({
          message: 'Registration Error',
          description: error.response?.data?.message || 'Failed to complete registration.',
        });
        handleLogout();
      } finally {
        setIsRegistering(false);
      }
    };

    handleSuccessfulAuth();
  }, [isAuth, navigate]);

  // Эффект 3: Обработка сообщений от iframe
  useEffect(() => {
    const handleIframeMessage = (event) => {
      if (event.origin !== 'https://atlas.appweb.space') return;

      if (event.data.type === 'REDIRECT_TO_LOGIN') {
        console.log('[App] Received REDIRECT_TO_LOGIN from iframe');
        navigate('/login');
        notification.info({
          message: 'Registration Complete',
          description: 'Please log in now.',
          duration: 5
        });
      }
    };

    window.addEventListener('message', handleIframeMessage);
    return () => window.removeEventListener('message', handleIframeMessage);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setIsAuth(false);
    navigate('/login');
  };

  const ProtectedRoute = ({ children }) => {
    if (!authChecked || isRegistering) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <Spin size="large" tip={isRegistering ? "Completing registration..." : "Checking authentication..."} />
        </div>
      );
    }
    return isAuth ? children : <Navigate to="/login" replace />;
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content style={{ padding: '20px 50px' }}>
        <Routes>
          <Route
            path="/login"
            element={isAuth ? <Navigate to="/" replace /> : <Login />}
          />
          <Route
            path="/register"
            element={isAuth ? <Navigate to="/" replace /> : <Registration />}
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <TodoList onLogout={handleLogout} />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to={isAuth ? "/" : "/login"} replace />} />
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