// components/Login.js
import AuthIframe from './AuthIframe';

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
        projectId="1"
        mode="login"
      />
    </div>
  );
};

export default Login;