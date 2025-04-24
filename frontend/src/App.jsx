import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Layout, Spin } from 'antd';
import Login from './components/Login';
import Registration from './components/Registration';
import TodoList from './components/TodoList';
// Импортируем нужные функции из нашего обновленного api.js
import { getAtlasUserMe, registerUserInLocalDB, getLocalUserProfile } from './api/index'; // Убедитесь, что путь './api' правильный

const { Content } = Layout;

function App() {
  const [authChecked, setAuthChecked] = useState(false); // Флаг завершения первичной проверки
  const [isAuth, setIsAuth] = useState(false); // Состояние аутентификации
  const navigate = useNavigate(); // Хук для навигации

  // Проверка аутентификации при загрузке (включая обработку токенов из URL)
  useEffect(() => {
    const handleAuthentication = async () => {
      setAuthChecked(false); // Начинаем проверку/обработку
      const params = new URLSearchParams(window.location.search);
      const urlAccessToken = params.get('access_token'); // Токен из URL (вероятно, Atlas)
      const urlRefreshToken = params.get('refresh_token'); // Рефреш-токен из URL (вероятно, Atlas)

      if (urlAccessToken && urlRefreshToken) {
        // Случай 1: Обнаружены токены в URL (после OAuth редиректа)
        console.log('Found tokens in URL (likely from OAuth redirect)');
        try {
          // 1. Сохраняем токены Atlas локально
          localStorage.setItem('access_token', urlAccessToken); // Сохраняем токен Atlas
          localStorage.setItem('refresh_token', urlRefreshToken); // Сохраняем рефреш-токен Atlas
          console.log('Atlas tokens saved locally');

          // 2. Получаем информацию о пользователе из Atlas, используя свежий access_token
          const atlasUserResponse = await getAtlasUserMe(urlAccessToken);
          const atlasUserData = atlasUserResponse.data; // Предполагается, что тут { id, email, login/username, ... }

          console.log('Fetched Atlas user info:', atlasUserData);

          // 3. Регистрируем или связываем пользователя в ЛОКАЛЬНОЙ БД
          // Эндпоинт /api/register вашего локального бэкенда ожидает { external_user_id, username, email }
          const userDataForLocalDB = {
            external_user_id: String(atlasUserData.id), // ID пользователя из Atlas как внешний ID
            email: atlasUserData.email,
            username: atlasUserData.login || atlasUserData.username || `user-${atlasUserData.id}`, // Берем логин или имя из Atlas, или генерируем
          };

          // Отправляем данные в эндпоинт локальной регистрации
          await registerUserInLocalDB(userDataForLocalDB);
          console.log('User registered/linked in local DB');

          // 4. Очищаем URL от токенов для безопасности и чистоты
          window.history.replaceState({}, document.title, window.location.pathname);

          // 5. Устанавливаем статус аутентификации как true
          setIsAuth(true);

          // Навигация на '/' произойдет автоматически через ProtectedRoute

        } catch (error) {
          console.error('Error during OAuth processing or local registration:', error);
          // Обработка ошибок на любом из этапов (получение инфо из Atlas, регистрация локально)
          // Показываем сообщение пользователю
          alert(`Ошибка авторизации или регистрации: ${error.response?.data?.detail || error.message || error.toString()}`);

          // Очищаем любые токены, которые могли быть сохранены частично
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setIsAuth(false); // Устанавливаем статус неаутентифицирован

          // Очищаем URL даже в случае ошибки
          window.history.replaceState({}, document.title, window.location.pathname);

          // Перенаправляем на страницу логина в случае ошибки
          navigate('/login', { replace: true });

        } finally {
          // В любом случае, проверка аутентификации завершена
          setAuthChecked(true);
        }

      } else {
        // Случай 2: Токенов в URL нет, проверяем localStorage (обычная загрузка или редирект не после OAuth)
        const storedAccessToken = localStorage.getItem('access_token');
        const storedRefreshToken = localStorage.getItem('refresh_token');

        if (storedAccessToken && storedRefreshToken) {
          // Проверяем валидность токена из localStorage (хотя бы по сроку годности)
          try {
            const decoded = JSON.parse(atob(storedAccessToken.split('.')[1]));
            const expiresAt = decoded.exp * 1000;
            if (Date.now() < expiresAt) {
              // Токен валиден - пытаемся получить локальный профиль,
              // чтобы убедиться, что пользователь существует в локальной БД
              // Это важно, т.к. токен Atlas может быть валиден, но пользователь
              // может быть не зарегистрирован локально, если процесс регистрации
              // после OAuth в прошлый раз был прерван.
              // Или просто полагаемся на токен Atlas как индикатор аутентификации,
              // если локальная регистрация не является строгим требованием для доступа.
              // Для данной логики, где локальная регистрация нужна,
              // лучше проверить наличие локального профиля.
              // Однако, для простоты и если локальная регистрация происходит
              // только один раз после первого OAuth входа, можно просто считать
              // пользователя аутентифицированным на основании наличия токена Atlas.
              // Выбираем более простой путь: наличие токена Atlas означает аутентификацию.
              setIsAuth(true); // Токен Atlas из localStorage валиден по сроку
            } else {
              // Токен Atlas из localStorage истек
              console.log('Access token expired in localStorage, need re-login');
              setIsAuth(false);
              // Очищаем устаревшие токены
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              // TODO: Можно добавить логику обновления токена Atlas здесь
            }
          } catch (e) {
            console.error('Error decoding or checking stored token:', e);
            // Ошибка декодирования или парсинга - токен некорректен
            setIsAuth(false);
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
          }
        } else {
          // Нет токенов ни в URL, ни в localStorage
          setIsAuth(false);
        }
        setAuthChecked(true); // Проверка localStorage завершена
      }
    };

    handleAuthentication(); // Выполняем проверку при монтировании компонента

  }, [navigate]); // navigate используется внутри useEffect, поэтому добавляем его в зависимости

  // Компонент для защиты маршрутов
  const ProtectedRoute = ({ children }) => {
    // Пока идет проверка аутентификации, показываем спиннер
    if (!authChecked) {
      return (
        <Layout style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Spin size="large" tip="Loading authentication..." />
        </Layout>
      );
    }

    // Если проверка завершена и пользователь не аутентифицирован, перенаправляем на страницу логина
    if (!isAuth) {
      return <Navigate to="/login" replace />;
    }

    // Если аутентифицирован, отображаем содержимое защищенного маршрута
    return children;
  };

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