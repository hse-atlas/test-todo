// App.jsx

import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Layout, Spin, notification } from 'antd';
import Login from './components/Login';
import Registration from './components/Registration';
import TodoList from './components/TodoList';
import { register as saveUserToDb } from './api'; // Убедитесь, что импорт правильный

const { Content } = Layout;

function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuth, setIsAuth] = useState(false);
  const navigate = useNavigate();

  // Эффект 1: Проверка при загрузке (можно добавить больше логов)
  useEffect(() => {
    console.log('[App] Running initial auth check...');
    const accessToken = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');
    console.log('[App] Tokens found:', { hasAccessToken: !!accessToken, hasRefreshToken: !!refreshToken });

    if (!accessToken || !refreshToken) {
      setAuthChecked(true);
      setIsAuth(false);
      console.log('[App] No tokens found or incomplete, auth check done.');
      return;
    }

    try {
      const decoded = JSON.parse(atob(accessToken.split('.')[1]));
      const expiresAt = decoded.exp * 1000;
      const now = Date.now();
      const isAuthenticated = now < expiresAt;
      console.log('[App] Token decoded:', { expiresAt: new Date(expiresAt), now: new Date(now), isAuthenticated });
      setIsAuth(isAuthenticated);
      if (!isAuthenticated) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        console.log('[App] Access token expired, cleared tokens.');
      }
    } catch (e) {
      console.error("[App] Error decoding token during initial check:", e);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setIsAuth(false);
    } finally {
      setAuthChecked(true);
      console.log('[App] Initial auth check finished.');
    }
  }, []);

  // Эффект 2: Обработка сообщения от AuthIframe
  useEffect(() => {
    const handleAuthComplete = async (event) => {
      // Проверяем тип сообщения
      if (event.data.type === 'ATLAS_AUTH_COMPLETE') {
        console.log('[App] Received ATLAS_AUTH_COMPLETE from iframe:', event.data);
        const { tokens, user } = event.data; // user МОЖЕТ БЫТЬ null

        // 1. Сохраняем токены (Эта часть должна теперь работать)
        if (tokens?.access_token && tokens?.refresh_token) {
          localStorage.setItem('access_token', tokens.access_token);
          localStorage.setItem('refresh_token', tokens.refresh_token);
          console.log('[App] Tokens saved to localStorage.');
        } else {
          console.error('[App] ATLAS_AUTH_COMPLETE received but tokens are missing!', event.data);
          notification.error({ message: 'Authentication Error', description: 'Failed to receive tokens.' });
          return; // Прерываем, если нет токенов
        }


        // 2. Отправляем данные пользователя на бэкенд, ТОЛЬКО ЕСЛИ ОНИ ЕСТЬ
        try {
          if (user && user.id && user.email) { // <-- ВАЖНАЯ ПРОВЕРКА
            console.log('[App] User data received, sending to backend:', user);
            await saveUserToDb({
              external_user_id: user.id,
              email: user.email,
              username: user.username // username может быть пустым
            });
            console.log('[App] User data sent to backend successfully.');
          } else {
            console.log('[App] No user data in ATLAS_AUTH_COMPLETE (likely login), skipping backend save.');
            // Здесь можно при необходимости вызвать GET /api/profile, чтобы получить
            // данные пользователя, если они нужны сразу после логина.
          }

          // 3. Обновляем состояние аутентификации
          setIsAuth(true);
          console.log('[App] Auth state set to true.');

          // 4. Перенаправляем пользователя
          navigate('/');
          console.log('[App] Navigating to /');
          notification.success({
            message: 'Login Successful',
            description: 'Welcome!',
          });

        } catch (error) {
          console.error('[App] Error saving user data to backend OR during navigation:', error);
          // Очищаем токены, если что-то пошло не так после их сохранения
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setIsAuth(false);
          notification.error({
            message: 'Login/Registration Error',
            description: error.response?.data?.detail || 'Failed to process authentication. Please try again.',
          });
          // Остаемся на странице логина/регистрации
        }
      }
    };

    window.addEventListener('message', handleAuthComplete);
    return () => window.removeEventListener('message', handleAuthComplete);
  }, [navigate]); // navigate в зависимостях

  // ProtectedRoute и handleLogout без изменений

  const ProtectedRoute = ({ children }) => {
    // ... (без изменений)
    if (!authChecked) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <Spin size="large" />
        </div>
      );
    }
    if (!isAuth) {
      return <Navigate to="/login" replace />;
    }
    return children;
  };

  const handleLogout = () => {
    console.log('[App] Logging out...');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setIsAuth(false);
    navigate('/login');
    notification.info({ message: 'Logged Out', description: 'You have been logged out.' });
  };

  // JSX разметка без изменений...
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content style={{ padding: '20px 50px' }}>
        <Routes>
          {/* ... Route определения ... */}
          <Route
            path="/login"
            element={isAuth ? <Navigate to="/" /> : <Login />}
          />
          <Route
            path="/register"
            element={isAuth ? <Navigate to="/" /> : <Registration />}
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

// WrappedApp без изменений
export default function WrappedApp() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}