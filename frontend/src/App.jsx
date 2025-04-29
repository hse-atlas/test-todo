import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Layout, Spin } from 'antd';
import { jwtDecode } from 'jwt-decode';
import Login from './components/Login';
import Registration from './components/Registration';
import TodoList from './components/TodoList';
import AdminPage from './components/AdminPage';
import { getAtlasUserData, registerUserInLocalDB, checkUserExists } from './api/index'; // Убедитесь, что путь './api' правильный

const { Content } = Layout;

const ProtectedRoute = ({ children, role }) => {
  const token = localStorage.getItem("access_token");
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  try {
    const decoded = jwtDecode(token);
    if (role && decoded.usr_type !== role) {
      return <Navigate to="/" replace />;
    }
  } catch (e) {
    console.error("Invalid token:", e);
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  const [authChecked, setAuthChecked] = useState(false); // Флаг завершения первичной проверки
  const [isAuth, setIsAuth] = useState(false); // Состояние аутентификации
  const navigate = useNavigate(); // Хук для навигации

  // Проверка аутентификации при загрузке (включая обработку токенов из URL)
  useEffect(() => {
    const handleAuthentication = async () => {
      setAuthChecked(false);
      const params = new URLSearchParams(window.location.search);
      const urlAccessToken = params.get('access_token');
      const urlRefreshToken = params.get('refresh_token');

      if (urlAccessToken && urlRefreshToken) {
        try {
          localStorage.setItem('access_token', urlAccessToken);
          localStorage.setItem('refresh_token', urlRefreshToken);

          const atlasUserResponse = await getAtlasUserData(urlAccessToken);
          const atlasUserData = atlasUserResponse.data;

          console.log('Fetched Atlas user info:', atlasUserData);

          // Проверяем, существует ли пользователь в локальной базе данных
          const checkUserResponse = await checkUserExists(atlasUserData.id, urlAccessToken);
          if (checkUserResponse.data.exists) {
            console.log('User already exists in local DB');
          } else {
            // Если пользователь не существует, регистрируем его
            const userDataForLocalDB = {
              external_user_id: String(atlasUserData.id),
              email: atlasUserData.email,
              username: atlasUserData.login || atlasUserData.username || `user-${atlasUserData.id}`,
            };
            await registerUserInLocalDB(userDataForLocalDB);
            console.log('User registered in local DB');
          }

          window.history.replaceState({}, document.title, window.location.pathname);
          setIsAuth(true);
        } catch (error) {
          console.error('Error during OAuth processing or local registration:', error);
          alert(`Ошибка авторизации или регистрации: ${error.response?.data?.detail || error.message || error.toString()}`);
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setIsAuth(false);
          window.history.replaceState({}, document.title, window.location.pathname);
          navigate('/login', { replace: true });
        } finally {
          setAuthChecked(true);
        }
      } else {
        // Логика для проверки токенов в localStorage
        const storedAccessToken = localStorage.getItem('access_token');
        const storedRefreshToken = localStorage.getItem('refresh_token');
        if (storedAccessToken && storedRefreshToken) {
          // Проверяем валидность токена
          try {
            const decoded = JSON.parse(atob(storedAccessToken.split('.')[1]));
            const expiresAt = decoded.exp * 1000;
            if (Date.now() < expiresAt) {
              setIsAuth(true);
            } else {
              console.log('Access token expired');
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              setIsAuth(false);
            }
          } catch (e) {
            console.error('Error decoding token:', e);
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            setIsAuth(false);
          }
        } else {
          setIsAuth(false);
        }
        setAuthChecked(true);
      }
    };

    handleAuthentication(); // Выполняем проверку при монтировании компонента

  }, [navigate]); // navigate используется внутри useEffect, поэтому добавляем его в зависимости

  // Функция updateAuthStatus может быть полезна, если вы хотите обновить статус
  // из других мест, например, при явном выходе пользователя.
  // При успешном OAuth или стандартном логине через iframe,
  // useEffect сам установит isAuth и ProtectedRoute выполнит навигацию.
  const updateAuthStatus = (status) => {
    setIsAuth(status);
    if (!status) { // Если статус стал false (например, при выходе)
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      navigate('/login', { replace: true });
    }
  };


  return (
    // BrowserRouter должен быть оберткой вокруг App (в WrappedApp)
    <Layout style={{ minHeight: '100vh' }}>
      <Content style={{ padding: '20px 50px' }}>
        <Routes>
          {/* Публичные маршруты */}
          {/* Если пользователь уже аутентифицирован, редиректим его на главную */}
          <Route
            path="/login"
            element={isAuth ? <Navigate to="/" replace /> : <Login />} // Убрали onLogin проп, так как AuthIframe сам редиректит родителя
          />
          <Route
            path="/register"
            element={isAuth ? <Navigate to="/" replace /> : <Registration />} // Убрали onRegister проп
          />

          {/* Защищенный маршрут */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <TodoList onLogout={() => updateAuthStatus(false)} /> {/* Передаем onLogout для выхода */}
              </ProtectedRoute>
            }
          />

          {/* Маршрут для админов */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <AdminPage />
              </ProtectedRoute>
            }
          />

          {/* Пример: редирект с неизвестных маршрутов */}
          <Route path="*" element={isAuth ? <Navigate to="/" replace /> : <Navigate to="/login" replace />} />

        </Routes>
      </Content>
    </Layout>
    // Конец BrowserRouter
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