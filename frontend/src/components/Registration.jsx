import { Button, Form, Input, notification } from 'antd';
import { useNavigate } from 'react-router-dom';
import axios from "axios";

const Registration = ({ onRegister }) => { // Добавляем деструктуризацию пропсов
  const navigate = useNavigate();

  const onFinish = async (values) => {
    try {
      await axios.post('/api/register', {
        username: values.username,
        password: values.password
      });
      
      notification.success({
        message: 'Registration Successful',
        description: 'You can now login with your credentials',
      });
      
      onRegister(); // Используем пропс напрямую
      navigate('/login');
    } catch (error) {
      notification.error({
        message: 'Registration Failed',
        description: error.response?.data?.detail || 'Something went wrong',
      });
    }
  };


  return (
    <div style={{ maxWidth: 300, margin: '100px auto' }}>
      <h2 style={{ textAlign: 'center', marginBottom: 24 }}>Register</h2>
      <Form onFinish={onFinish}>
        <Form.Item
          name="username"
          rules={[{ required: true, message: 'Please input your username!' }]}
        >
          <Input placeholder="Username" />
        </Form.Item>

        <Form.Item
          name="password"
          rules={[{ required: true, message: 'Please input your password!' }]}
        >
          <Input.Password placeholder="Password" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" block>
            Register
          </Button>
        </Form.Item>
      </Form>
      <div style={{ textAlign: 'center' }}>
        Already have an account? <a href="/login">Login now!</a>
      </div>
    </div>
  );
}

export default Registration;