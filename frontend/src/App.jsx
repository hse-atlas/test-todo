import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Layout, Spin } from 'antd';
import { jwtDecode } from 'jwt-decode';
import Login from './components/Login';
import Registration from './components/Registration';
import TodoList from './components/TodoList';
import AdminPage from './components/AdminPage';
import { getAtlasUserData, registerUserInLocalDB, checkUserExists } from './api/index';

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
    return children;
  } catch (e) {
    console.error("Invalid token:", e);
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    return <Navigate to="/login" replace />;
  }
};

function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuth, setIsAuth] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const urlAccessToken = params.get('access_token');
        const urlRefreshToken = params.get('refresh_token');

        // Handle OAuth callback
        if (urlAccessToken && urlRefreshToken) {
          localStorage.setItem('access_token', urlAccessToken);
          localStorage.setItem('refresh_token', urlRefreshToken);

          const atlasUserResponse = await getAtlasUserData(urlAccessToken);
          const atlasUserData = atlasUserResponse.data;

          const checkUserResponse = await checkUserExists(atlasUserData.id, urlAccessToken);
          if (!checkUserResponse.data.exists) {
            await registerUserInLocalDB({
              external_user_id: String(atlasUserData.id),
              email: atlasUserData.email,
              username: atlasUserData.login || atlasUserData.username || `user-${atlasUserData.id}`,
            });
          }

          window.history.replaceState({}, document.title, window.location.pathname);
          setIsAuth(true);
          return;
        }

        // Check existing tokens
        const token = localStorage.getItem('access_token');
        if (token) {
          const decoded = jwtDecode(token);
          const isExpired = decoded.exp * 1000 < Date.now();

          if (!isExpired) {
            setIsAuth(true);
          } else {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            setIsAuth(false);
          }
        } else {
          setIsAuth(false);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setIsAuth(false);
      } finally {
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setIsAuth(false);
    navigate('/login');
  };

  if (!authChecked) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

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
          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="*"
            element={<Navigate to={isAuth ? "/" : "/login"} replace />}
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