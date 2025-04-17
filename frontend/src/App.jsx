import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Layout, Spin, notification } from 'antd'; // Добавили notification
import Login from './components/Login';
import Registration from './components/Registration';
import TodoList from './components/TodoList';
import { register as saveUserToDb } from './api'; // Импортируем функцию API для сохранения пользователя

const { Content } = Layout;

function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuth, setIsAuth] = useState(false);
  const navigate = useNavigate(); // Получаем функцию навигации

  // Эффект 1: Проверка аутентификации при начальной загрузке (остается без изменений)
  useEffect(() => {
    const checkAuth = () => {
      const accessToken = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');

      if (!accessToken || !refreshToken) {
        setAuthChecked(true);
        setIsAuth(false); // Убедимся, что isAuth = false если нет токенов
        return;
      }

      try {
        // Простая проверка срока действия access токена (без валидации подписи)
        const decoded = JSON.parse(atob(accessToken.split('.')[1]));
        const expiresAt = decoded.exp * 1000;
        const isAuthenticated = Date.now() < expiresAt;
        setIsAuth(isAuthenticated);
        if (!isAuthenticated) {
          // Если access токен истек, стоит удалить оба токена
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          console.log('Access token expired, cleared tokens.');
        }
      } catch (e) {
        console.error("Error decoding token:", e);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setIsAuth(false);
      } finally {
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, []); // Пустой массив зависимостей - выполняется один раз при монтировании

  // Эффект 2: Обработка сообщения об успешной аутентификации от AuthIframe
  useEffect(() => {
    const handleAuthComplete = async (event) => {
      // Важно! Проверяем origin и тип сообщения
      // Примечание: event.origin для сообщения от iframe к родителю будет origin родителя,
      // поэтому проверять на atlasOrigin здесь не нужно, если iframe вызывает window.parent.postMessage
      // Если вы используете event.source.postMessage, то origin будет origin iframe'а.
      // Будем считать, что используется window.parent.postMessage.
      // if (event.origin !== window.location.origin) return; // Проверка, что сообщение пришло "от себя"

      if (event.data.type === 'ATLAS_AUTH_COMPLETE') {
        console.log('App.jsx received ATLAS_AUTH_COMPLETE:', event.data);
        const { tokens, user } = event.data;

        // 1. Сохраняем токены
        localStorage.setItem('access_token', tokens.access_token);
        localStorage.setItem('refresh_token', tokens.refresh_token);
        console.log('Tokens saved to localStorage.');

        // 2. Отправляем данные пользователя на бэкенд для сохранения/обновления в БД
        try {
          await saveUserToDb({
            external_user_id: user.id, // Убедитесь, что бэкенд ожидает эти поля
            email: user.email,
            username: user.username
          });
          console.log('User data sent to backend successfully.');

          // 3. Обновляем состояние аутентификации в приложении
          setIsAuth(true);

          // 4. Перенаправляем пользователя на главную страницу
          navigate('/');
          notification.success({ // Опционально: уведомление об успехе
            message: 'Login Successful',
            description: 'Welcome back!',
          });

        } catch (error) {
          console.error('Error saving user data to backend:', error);
          // Очищаем токены, если сохранение не удалось? Зависит от логики.
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setIsAuth(false); // Сбрасываем состояние аутентификации

          // Показываем ошибку пользователю
          notification.error({
            message: 'Login Failed',
            description: error.response?.data?.detail || 'Could not save user data. Please try again.',
          });
          // Не перенаправляем, оставляем пользователя на странице логина/регистрации
        }
      }
    };

    window.addEventListener('message', handleAuthComplete);
    // Очистка слушателя при размонтировании компонента
    return () => window.removeEventListener('message', handleAuthComplete);

  }, [navigate]); // Добавляем navigate в зависимости, т.к. он используется внутри эффекта

  // Компонент ProtectedRoute (остается без изменений)
  const ProtectedRoute = ({ children }) => {
    if (!authChecked) {
      // Показываем спиннер, пока идет начальная проверка токенов
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <Spin size="large" />
        </div>
      );
    }

    if (!isAuth) {
      // Если проверка завершена и пользователь не аутентифицирован, перенаправляем на логин
      return <Navigate to="/login" replace />;
    }

    // Если все проверки пройдены, рендерим дочерний компонент (TodoList)
    return children;
  };

  // Функция updateAuthStatus больше не нужна для логина/регистрации,
  // но может быть полезна для ручного выхода из системы (logout)
  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setIsAuth(false);
    navigate('/login'); // Используем navigate для выхода
    notification.info({ message: 'Logged Out', description: 'You have been logged out.' });
  };


  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content style={{ padding: '20px 50px' }}>
        <Routes>
          <Route
            path="/login"
            // Убираем onLogin, т.к. обработка идет через postMessage
            element={isAuth ? <Navigate to="/" /> : <Login />}
          />
          <Route
            path="/register"
            // Убираем onRegister
            element={isAuth ? <Navigate to="/" /> : <Registration />}
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                {/* Передаем функцию logout в TodoList */}
                <TodoList onLogout={handleLogout} />
              </ProtectedRoute>
            }
          />
          {/* Можно добавить маршрут по умолчанию или 404 */}
          <Route path="*" element={<Navigate to={isAuth ? "/" : "/login"} replace />} />
        </Routes>
      </Content>
    </Layout>
  );
}

// WrappedApp остается без изменений
export default function WrappedApp() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}