import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Layout, Spin } from 'antd';
import Login from './components/Login';
import Registration from './components/Registration';
import TodoList from './components/TodoList';

const { Content } = Layout;

function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuth, setIsAuth] = useState(false);
  const navigate = useNavigate();

  // Проверка аутентификации при загрузке
  useEffect(() => {
    const checkAuth = () => {
      const accessToken = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');

      if (!accessToken || !refreshToken) {
        setAuthChecked(true);
        return;
      }

      try {
        const decoded = JSON.parse(atob(accessToken.split('.')[1]));
        const expiresAt = decoded.exp * 1000;
        setIsAuth(Date.now() < expiresAt);
      } catch (e) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      } finally {
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, []);

  const ProtectedRoute = ({ children }) => {
    if (!authChecked) {
      return <Spin size="large" />;
    }

    if (!isAuth) {
      return <Navigate to="/login" replace />;
    }

    return children;
  };

  // Функция для обновления состояния аутентификации
  const updateAuthStatus = (status) => {
    setIsAuth(status);
    if (status) {
      navigate('/');
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content style={{ padding: '20px 50px' }}>
        <Routes>
          <Route
            path="/login"
            element={<Login onLogin={() => updateAuthStatus(true)} />}
          />
          <Route
            path="/register"
            element={<Registration onRegister={() => updateAuthStatus(true)} />}
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <TodoList />
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