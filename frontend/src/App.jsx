// App.jsx

import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'; // Добавили useLocation
import { Layout, Spin, notification } from 'antd';
import Login from './components/Login';
import Registration from './components/Registration';
import TodoList from './components/TodoList';

const { Content } = Layout;

// Компонент-обертка для обработки токенов из URL
function TokenHandler({ setAuthState }) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
      console.log('[TokenHandler] Found tokens in URL parameters.');
      // 1. Сохраняем токены
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      console.log('[TokenHandler] Tokens saved to localStorage.');

      // 2. Обновляем состояние аутентификации в App
      setAuthState(true);
      console.log('[TokenHandler] Auth state updated.');

      // 3. Очищаем URL от токенов и перенаправляем на главную
      // Используем replace, чтобы этот URL с токенами не попал в историю браузера
      navigate('/', { replace: true });
      console.log('[TokenHandler] Navigating to / and cleaning URL.');
      notification.success({
        message: 'Login Successful',
        description: 'Welcome!',
      });

    } else {
      // Если токенов в URL нет, ничего не делаем,
      // App продолжит обычную проверку localStorage
      console.log('[TokenHandler] No tokens found in URL.');
    }
    // Этот эффект должен выполниться только один раз при первой загрузке
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Пустой массив зависимостей

  // Ничего не рендерим, пока идет проверка/редирект
  return null;
}


function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuth, setIsAuth] = useState(false);
  const navigate = useNavigate(); // useNavigate все еще нужен для logout и REDIRECT_TO_LOGIN

  // Функция для обновления состояния из TokenHandler
  const updateAuthState = (status) => {
    setIsAuth(status);
    // Устанавливаем authChecked здесь же, чтобы не было гонки состояний
    setAuthChecked(true);
  };

  // Эффект 1: Проверка localStorage (выполняется ПОСЛЕ TokenHandler)
  useEffect(() => {
    // Эта проверка выполняется, если TokenHandler не нашел токены в URL
    // и не вызвал updateAuthState(true)
    if (authChecked) {
      console.log('[App-Effect1] Skipping localStorage check as authChecked is already true (likely handled by TokenHandler or previous check).');
      return; // Если authChecked уже true, значит проверка была (или токены из URL обработаны)
    }

    console.log('[App-Effect1] Running localStorage auth check...');
    const accessToken = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');
    console.log('[App-Effect1] Tokens found in localStorage:', { hasAccessToken: !!accessToken, hasRefreshToken: !!refreshToken });

    if (!accessToken || !refreshToken) {
      setAuthChecked(true);
      setIsAuth(false);
      console.log('[App-Effect1] No tokens found in localStorage, auth check done.');
      return;
    }

    try {
      const decoded = JSON.parse(atob(accessToken.split('.')[1]));
      const expiresAt = decoded.exp * 1000;
      const now = Date.now();
      const isAuthenticated = now < expiresAt;
      console.log('[App-Effect1] Token decoded:', { expiresAt: new Date(expiresAt), now: new Date(now), isAuthenticated });
      setIsAuth(isAuthenticated);
      if (!isAuthenticated) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        console.log('[App-Effect1] Access token expired, cleared tokens.');
      }
    } catch (e) {
      console.error("[App-Effect1] Error decoding token during localStorage check:", e);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setIsAuth(false);
    } finally {
      setAuthChecked(true);
      console.log('[App-Effect1] localStorage auth check finished.');
    }
    // Зависимость от authChecked, чтобы избежать повторного запуска, если TokenHandler уже сработал
  }, [authChecked]);

  // Эффект 2: Обработка сообщений от AuthIframe (ТОЛЬКО для редиректа после регистрации)
  useEffect(() => {
    const handleIframeMessage = (event) => {
      // if (event.origin !== '...') return; // Проверка origin

      // --- Обработка ТОЛЬКО REDIRECT_TO_LOGIN ---
      if (event.data.type === 'REDIRECT_TO_LOGIN') {
        console.log('[App-Effect2] Received REDIRECT_TO_LOGIN from iframe.');
        navigate('/login');
        console.log('[App-Effect2] Navigating to /login');
        notification.info({
          message: 'Registration Complete',
          description: 'Please log in now.',
          duration: 5
        });
      }
      // ATLAS_AUTH_COMPLETE больше не обрабатывается здесь, т.к. логин идет через URL
    };

    window.addEventListener('message', handleIframeMessage);
    return () => window.removeEventListener('message', handleIframeMessage);
  }, [navigate]); // navigate в зависимостях


  const ProtectedRoute = ({ children }) => {
    if (!authChecked) {
      // Показываем спиннер, пока идут проверки (URL и localStorage)
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <Spin size="large" />
        </div>
      );
    }
    if (!isAuth) {
      console.log('[ProtectedRoute] Not authenticated, redirecting to /login');
      return <Navigate to="/login" replace />;
    }
    return children;
  };

  const handleLogout = () => { /* ... без изменений ... */
    console.log('[App] Logging out...');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setIsAuth(false);
    navigate('/login');
    notification.info({ message: 'Logged Out', description: 'You have been logged out.' });
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content style={{ padding: '20px 50px' }}>
        {/* Добавляем TokenHandler ПЕРЕД Routes */}
        {!authChecked && <TokenHandler setAuthState={updateAuthState} />}

        <Routes>
          {/* Маршруты без изменений */}
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

// WrappedApp остается без изменений, но BrowserRouter нужен для useLocation
export default function WrappedApp() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}