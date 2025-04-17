// App.jsx (для Todo-приложения)

import { useState, useEffect } from 'react';
// Добавляем useLocation
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Spin, notification } from 'antd';
import Login from './components/Login';
import Registration from './components/Registration';
import TodoList from './components/TodoList';
// Импортируем AuthIframe для страниц Login/Registration
import AuthIframe from './components/AuthIframe'; // Убедитесь, что путь правильный

const { Content } = Layout;


function App() {
  const [authChecked, setAuthChecked] = useState(false); // Флаг: первичная проверка завершена?
  const [isAuth, setIsAuth] = useState(false);          // Флаг: пользователь аутентифицирован?
  const navigate = useNavigate();
  const location = useLocation(); // Получаем текущий location

  // --- Эффект 1: Обработка токенов из URL и проверка localStorage ---
  useEffect(() => {
    console.log('[App] Running URL/LocalStorage Check Effect...');
    let foundTokenInUrl = false; // Флаг, что нашли токены в URL

    // --- Проверка URL на токены ---
    const params = new URLSearchParams(location.search);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
      console.log('[App] Found tokens in URL parameters.');
      foundTokenInUrl = true;

      // 1. Сохраняем токены в localStorage
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      console.log('[App] Tokens saved to localStorage from URL.');

      // 2. Устанавливаем состояние аутентификации
      setIsAuth(true);
      console.log('[App] Auth state set to true (from URL tokens).');

      // 3. Очищаем URL от токенов
      // Используем pathname + hash, чтобы сохранить якоря, если они есть
      const cleanUrl = location.pathname + location.hash;
      window.history.replaceState({}, document.title, cleanUrl);
      console.log('[App] URL cleaned.');

      // 4. Устанавливаем флаг завершения проверки
      setAuthChecked(true);
      console.log('[App] Auth check finished (handled by URL tokens).');

      // 5. Опционально: Уведомление
      notification.success({
        message: 'Login Successful',
        description: 'Welcome!',
      });

      // Важно: Выходим из useEffect, чтобы не проверять localStorage, если нашли токены в URL
      return;
    }

    // --- Проверка localStorage (если в URL токенов не было) ---
    console.log('[App] No tokens in URL, checking localStorage...');
    const storedAccessToken = localStorage.getItem('access_token');
    const storedRefreshToken = localStorage.getItem('refresh_token');
    console.log('[App] Tokens found in localStorage:', { hasAccessToken: !!storedAccessToken, hasRefreshToken: !!storedRefreshToken });

    if (storedAccessToken && storedRefreshToken) {
      try {
        // Проверка срока действия access токена
        const decoded = JSON.parse(atob(storedAccessToken.split('.')[1]));
        const expiresAt = decoded.exp * 1000;
        const now = Date.now();
        const isAuthenticated = now < expiresAt;
        console.log('[App] localStorage Token decoded:', { expiresAt: new Date(expiresAt), now: new Date(now), isAuthenticated });
        setIsAuth(isAuthenticated);
        if (!isAuthenticated) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          console.log('[App] Access token from localStorage expired, cleared tokens.');
        } else {
          console.log('[App] Auth state set to true (from localStorage).');
        }
      } catch (e) {
        console.error("[App] Error decoding token from localStorage:", e);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setIsAuth(false);
      }
    } else {
      // Токенов нет ни в URL, ни в localStorage
      console.log('[App] No valid tokens found anywhere.');
      setIsAuth(false);
    }

    // Завершаем первичную проверку в любом случае (если не вышли раньше из-за токенов в URL)
    setAuthChecked(true);
    console.log('[App] Auth check finished (localStorage or no tokens).');

    // Зависимость от location.search и location.pathname, чтобы эффект срабатывал
    // при изменении URL (например, после редиректа от Atlas)
  }, [location.search, location.pathname]);


  // --- Эффект 2: Обработка postMessage (ТОЛЬКО для редиректа после регистрации) ---
  useEffect(() => {
    const handleIframeMessage = (event) => {
      // Важно: Проверка Origin! Замените 'https://atlas.appweb.space' на реальный origin iframe
      if (event.origin !== 'https://atlas.appweb.space') {
        // console.warn('Ignoring message from unexpected origin:', event.origin);
        // return; // Раскомментировать для продакшена
      }

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
      // ATLAS_AUTH_COMPLETE здесь больше не нужен, т.к. логин идет через URL
    };

    window.addEventListener('message', handleIframeMessage);
    return () => window.removeEventListener('message', handleIframeMessage);
  }, [navigate]); // Зависимость только от navigate


  // ProtectedRoute (без изменений)
  const ProtectedRoute = ({ children }) => {
    if (!authChecked) {
      return (<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}> <Spin size="large" /> </div>);
    }
    if (!isAuth) {
      console.log('[ProtectedRoute] Not authenticated, redirecting to /login');
      return <Navigate to="/login" replace />;
    }
    return children;
  };

  // handleLogout (без изменений)
  const handleLogout = () => { /* ... */ };

  // --- JSX ---
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content style={{ padding: '20px 50px' }}>
        {/* TokenHandler больше не нужен как отдельный компонент */}
        <Routes>
          {/* Используем компоненты Login и Registration, которые рендерят AuthIframe */}
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

// Обертка с BrowserRouter остается необходимой для useLocation и useNavigate
export default function WrappedApp() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}