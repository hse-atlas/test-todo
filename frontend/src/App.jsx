import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Layout, Spin } from 'antd'; // Добавил Spin, если его еще нет
import Login from './components/Login';
import Registration from './components/Registration';
import TodoList from './components/TodoList';

const { Content } = Layout;

function App() {
  const [authChecked, setAuthChecked] = useState(false); // Флаг завершения первичной проверки
  const [isAuth, setIsAuth] = useState(false); // Состояние аутентификации
  const navigate = useNavigate(); // Хук для навигации

  // Проверка аутентификации при загрузке (включая обработку токенов из URL)
  useEffect(() => {
    const handleAuthentication = async () => { // Переименовал функцию для ясности
      const params = new URLSearchParams(window.location.search);
      const urlAccessToken = params.get('access_token');
      const urlRefreshToken = params.get('refresh_token');

      if (urlAccessToken && urlRefreshToken) {
        console.log('Found tokens in URL (likely from OAuth redirect)');
        try {
          // Шаг 1: Если нашли токены в URL, сохраняем их
          localStorage.setItem('access_token', urlAccessToken);
          localStorage.setItem('refresh_token', urlRefreshToken);
          console.log('OAuth tokens saved from URL');

          // Шаг 2: ОЧИЩАЕМ URL от токенов
          // Используем replaceState, чтобы не добавлять запись с токенами в историю браузера
          window.history.replaceState({}, document.title, window.location.pathname);

          // Шаг 3: Устанавливаем статус аутентификации как true
          setIsAuth(true);

          // Навигация произойдет автоматически, т.к. мы находимся на '/',
          // и ProtectedRoute увидит, что isAuth стало true.
          // Если нужно явно перейти на другой путь после OAuth, можно добавить navigate('/dashboard');
          // navigate('/'); // На всякий случай, если вдруг не на '/', но в данном случае ProtectedRoute справится

        } catch (error) {
          console.error('Error processing OAuth tokens from URL:', error);
          // В случае ошибки (маловероятно при сохранении в localStorage),
          // сбрасываем флаг аутентификации и очищаем токены
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setIsAuth(false);
          // Опционально: показать сообщение пользователю
        } finally {
          // В любом случае, проверка аутентификации завершена
          setAuthChecked(true);
        }
      } else {
        // Если токенов в URL нет, проверяем localStorage, как и раньше
        const storedAccessToken = localStorage.getItem('access_token');
        const storedRefreshToken = localStorage.getItem('refresh_token');

        if (storedAccessToken && storedRefreshToken) {
          try {
            // Проверяем валидность токена (хотя бы по сроку годности)
            const decoded = JSON.parse(atob(storedAccessToken.split('.')[1]));
            const expiresAt = decoded.exp * 1000;

            if (Date.now() < expiresAt) {
              setIsAuth(true); // Токен валиден
            } else {
              // Токен истек
              console.log('Access token expired, need refresh or re-login');
              setIsAuth(false);
              // Очищаем устаревшие токены
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              // TODO: Можно добавить логику обновления токена здесь
            }
          } catch (e) {
            console.error('Error decoding stored access token:', e);
            // Ошибка декодирования или парсинга - токен некорректен
            setIsAuth(false);
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
          } finally {
            setAuthChecked(true); // Проверка localStorage завершена
          }
        } else {
          // Нет токенов ни в URL, ни в localStorage
          setIsAuth(false);
          setAuthChecked(true); // Проверка завершена
        }
      }
    };

    handleAuthentication(); // Выполняем проверку при монтировании компонента

  }, []); // Пустой массив зависимостей означает, что эффект выполняется один раз при монтировании

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

  // Функция updateAuthStatus теперь может просто установить статус.
  // Перенаправление после успешного логина/регистрации через iframe
  // будет обрабатываться либо в самом iframe (как в вашем AuthIframe),
  // либо здесь, если iframe просто постит токены, а App их обрабатывает.
  // В вашем AuthIframe сейчас стоит window.parent.location.href = '/',
  // так что App компонент перезагрузится/обновится и useEffect снова отработает,
  // найдя токены в localStorage, и установит isAuth в true.
  // Поэтому onLogin/onRegister пропы и updateAuthStatus в данном случае
  // не напрямую используются для OAuth, но могут быть полезны для стандартного входа/регистрации.
  // Можно даже удалить onLogin/onRegister пропы из Login/Registration и App
  // если вся логика сохранения токенов и редиректа происходит в AuthIframe.
  // Но пока оставим updateAuthStatus, т.к. оно может быть вызвано из дочерних компонентов при необходимости.
  const updateAuthStatus = (status) => {
    setIsAuth(status);
    // Навигация после обновления статуса может быть здесь,
    // но обычно navigate('/') происходит после *сохранения* токенов.
    // В случае OAuth это происходит в useEffect выше.
    // В случае стандартного входа через iframe, AuthIframe сам редиректит родителя.
    // Так что этот navigate здесь может быть лишним или специфичным для других сценариев.
    if (status && window.location.pathname !== '/') {
      // navigate('/'); // Закомментируем, если AuthIframe сам редиректит
    }
  };


  return (
    // <BrowserRouter> - BrowserRouter должен быть оберткой вокруг App в index.js или WrappedApp
    <Layout style={{ minHeight: '100vh' }}>
      <Content style={{ padding: '20px 50px' }}>
        <Routes>
          {/* Публичные маршруты */}
          {/* Передаем updateAuthStatus, если компоненты Login/Registration все еще его ожидают
              для обработки standard (не-OAuth) логина/регистрации */}
          <Route
            path="/login"
            element={isAuth ? <Navigate to="/" replace /> : <Login onLogin={() => updateAuthStatus(true)} />}
          />
          <Route
            path="/register"
            element={isAuth ? <Navigate to="/" replace /> : <Registration onRegister={() => updateAuthStatus(true)} />}
          />

          {/* Защищенный маршрут */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <TodoList />
              </ProtectedRoute>
            }
          />

          {/* Добавьте другие маршруты по необходимости */}
          {/* Пример: редирект со всех неизвестных маршрутов */}
          {/* <Route path="*" element={isAuth ? <Navigate to="/" replace /> : <Navigate to="/login" replace />} /> */}

        </Routes>
      </Content>
    </Layout>
    // </BrowserRouter>
  );
}

// WrappedApp остается без изменений, он просто оборачивает App в BrowserRouter
export default function WrappedApp() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}