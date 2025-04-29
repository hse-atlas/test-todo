import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Tag,
  Space,
  Spin,
  notification,
  Flex,
  Switch,
} from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from 'jwt-decode';
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  getLocalUserProfile,
} from "../api";

export default function TodoList() {
  const [tasks, setTasks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null); // Данные пользователя
  const [userRole, setUserRole] = useState(null); // Роль пользователя
  const [form] = Form.useForm();
  const [editingTask, setEditingTask] = useState(null);
  const navigate = useNavigate(); // Для навигации

  // Функция для загрузки данных пользователя
  const fetchUserData = async () => {
    try {
      const accessToken = localStorage.getItem("access_token");

      // Декодируем токен и извлекаем роль пользователя
      if (accessToken) {
        const decodedToken = jwtDecode(accessToken);
        setUserRole(decodedToken.role); // Извлекаем роль из токена
      }

      const response = await getLocalUserProfile(accessToken);
      setUserData(response.data);
    } catch (error) {
      notification.error({
        message: "Ошибка загрузки данных пользователя",
        description:
          error.response?.data?.detail || "Не удалось загрузить данные",
      });
    }
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const accessToken = localStorage.getItem("access_token");
      const response = await getTasks(accessToken);
      setTasks(response.data);
    } catch (error) {
      notification.error({
        message: "Ошибка загрузки задач",
        description:
          error.response?.data?.detail || "Не удалось загрузить задачи",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await fetchUserData();
      await fetchTasks();
    };
    loadData();
  }, []);

  const handleAddTask = async (values) => {
    try {
      const accessToken = localStorage.getItem("access_token");
      await createTask(values, accessToken);
      notification.success({
        message: "Задача создана",
        description: "Новая задача успешно добавлена",
      });
      await fetchTasks();
      setIsModalOpen(false);
      form.resetFields();
    } catch (error) {
      notification.error({
        message: "Ошибка создания",
        description:
          error.response?.data?.detail || "Не удалось создать задачу",
      });
    }
  };

  const handleUpdateTask = async (id, values) => {
    try {
      const accessToken = localStorage.getItem("access_token");
      await updateTask(id, values, accessToken);
      notification.success({
        message: "Задача обновлена",
        description: "Задача успешно изменена",
      });
      await fetchTasks();
      setEditingTask(null);
    } catch (error) {
    }
  };
  const handleDeleteTask = async (id) => {
    try {
      const accessToken = localStorage.getItem("access_token");
      await deleteTask(id, accessToken);
      notification.success({
        message: "Задача удалена",
        description: "Задача успешно удалена из списка",
      });
      await fetchTasks();
    } catch (error) {
      notification.error({
        message: "Ошибка удаления",
        description:
          error.response?.data?.detail || "Не удалось удалить задачу",
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    window.location.href = "/login";
  };

  const columns = [
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
      width: "70%", // Занимает 70% ширины таблицы
      ellipsis: true, // Обрезать длинный текст с многоточием
    },
    {
      title: "Status",
      dataIndex: "completed",
      key: "completed",
      width: "15%", // Фиксированная ширина для статуса
      align: "center",
      render: (completed) => (
        <Tag color={completed ? "green" : "volcano"}>
          {completed ? "Completed" : "Pending"}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: "15%",
      align: "center",
      render: (_, record) => (
        <Space>
          <Button
            onClick={() =>
              handleUpdateTask(record.id, {
                completed: !record.completed,
              })
            }
          >
            Toggle
          </Button>
          <Button onClick={() => setEditingTask(record)}>
            <EditOutlined />
          </Button>
          <Button danger onClick={() => handleDeleteTask(record.id)}>
            <DeleteOutlined />
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 20 }}>
      <Flex justify="space-between" align="center">
        <h2>Приветствую {userData?.user || "Гость"}</h2>
        <Space>
          <Button type="primary" onClick={() => setIsModalOpen(true)}>
            Add Task
          </Button>
          {userRole === "admin" && ( // Условие отображения кнопки
            <Button
              type="default"
              onClick={() => navigate("/admin")} // Переход на страницу администратора
            >
              Admin Page
            </Button>
          )}
          <Button type="default" danger onClick={handleLogout}>
            Log out
          </Button>
        </Space>
      </Flex>

      <Spin spinning={loading}>
        <Table
          dataSource={tasks}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 5 }}
          scroll={{ x: true }} // Добавляем горизонтальный скролл при необходимости
          bordered
        />
      </Spin>

      <Modal
        title={editingTask ? "Edit Task" : "New Task"}
        open={isModalOpen || !!editingTask}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingTask(null);
          form.resetFields();
        }}
        footer={null}
      >
        <Form
          form={form}
          initialValues={editingTask || {}}
          onFinish={(values) => {
            if (editingTask) {
              handleUpdateTask(editingTask.id, values);
            } else {
              handleAddTask(values);
            }
          }}
        >
          <Form.Item
            label="Title"
            name="title"
            rules={[{ required: true, message: "Please input task title!" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item>
            <Flex justify="flex-end" gap={8}>
              <Button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingTask(null);
                }}
              >
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                {editingTask ? "Update" : "Create"}
              </Button>
            </Flex>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
