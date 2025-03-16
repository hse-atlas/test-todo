import { Button, Form, Input, notification } from "antd";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const Login = ({ onLogin }) => { // Добавляем деструктуризацию пропсов
  const navigate = useNavigate();

  const onFinish = async (values) => {
    try {
      const params = new URLSearchParams();
      params.append('username', values.username);
      params.append('password', values.password);

      const response = await axios.post('/api/login', params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('refresh_token', response.data.refresh_token);
      
      onLogin(); // Используем пропс напрямую
      navigate('/');

    } catch (error) {
      notification.error({
        message: 'Login Failed',
        description: error.response?.data?.detail || 'Something went wrong',
      });
    }
  };


  return (
    <div style={{ maxWidth: 300, margin: "100px auto" }}>
      <h2 style={{ textAlign: "center", marginBottom: 24 }}>Login</h2>

      <Form onFinish={onFinish}>
        <Form.Item name="username" rules={[{ required: true }]}>
          <Input placeholder="Username" />
        </Form.Item>
        <Form.Item name="password" rules={[{ required: true }]}>
          <Input.Password placeholder="Password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block>
          Login
        </Button>
      </Form>
      <div style={{ textAlign: "center", marginTop: 16 }}>
        Don't have an account? <a href="/register">Register now!</a>
      </div>
    </div>
  );
}

export default Login;