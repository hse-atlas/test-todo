// components/Registration.js
import AuthIframe from './AuthIframe';
import { Link } from 'react-router-dom';

const Registration = ({ onRegister }) => {
  return (
    <div style={{
      maxWidth: 400,
      margin: '100px auto',
      padding: 20,
      background: '#fff',
      borderRadius: 8,
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{ textAlign: 'center', marginBottom: 24 }}>Register with Atlas</h2>
      <AuthIframe
        projectId="8eafa7c7-6685-43c4-b341-4bf95c5680d9"
        mode="register"
      />
      <div style={{ textAlign: 'center', marginTop: 16 }}>
        Already have an account? <Link to="/login">Login</Link>
      </div>

    </div>
  );
};

export default Registration;