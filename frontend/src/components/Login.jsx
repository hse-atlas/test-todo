// components/Login.js
import AuthIframe from './AuthIframe';
import { Link } from 'react-router-dom';

const Login = ({ onLogin }) => {
  return (
    <div style={{
      maxWidth: 400,
      margin: '100px auto',
      padding: 20,
      background: '#fff',
      borderRadius: 8,
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{ textAlign: 'center', marginBottom: 24 }}>Login with Atlas</h2>
      <AuthIframe
        projectId="139dff97-97e8-4d00-b171-89c1eecb59db"
        mode="login"
      />
      <div style={{ textAlign: 'center', marginTop: 16 }}>
        Don't have an account? <Link to="/register">Register</Link>
      </div>

    </div>
  );
};

export default Login;