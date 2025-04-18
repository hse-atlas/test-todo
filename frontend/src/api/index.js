import axios from "axios";

// Клиент для локального API
const localApi = axios.create({
  baseURL: "/api",
});


// Для обычной регистрации через форму
export const registerLocalUser = async (userData) => {
  const response = await localApi.post('/register/local', userData);
  return response.data;
};

// Для OAuth регистрации через Atlas
export const registerOAuthUser = async (userData) => {
  const response = await localApi.post('/register/oauth', {
    external_user_id: userData.id,
    email: userData.email,
    username: userData.username || `user_${userData.id}`,
    oauth_provider: userData.oauth_provider || 'unknown'
  });
  return response.data;
};

export const getTasks = async (token) => {
  return await localApi.get("/tasks", {
    headers: { Authorization: `Bearer ${token}` }
  });
};

export const createTask = async (task, token) => {
  return await localApi.post("/tasks", task, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

export const updateTask = async (id, task, token) => {
  return await localApi.put(`/tasks/${id}`, task, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

export const deleteTask = async (id, token) => {
  return await localApi.delete(`/tasks/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

export const getAtlasUserProfile = (token) => {
  return localApi.get("/proxy/atlas/user/me", {  // Теперь запрос идет к вашему серверу
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });
};

export const verifyToken = async (token) => {
  const response = await axios.get('/verify-token', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};