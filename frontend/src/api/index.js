import axios from "axios";

// Клиент для локального API
const localApi = axios.create({
  baseURL: "/api",
});

// Клиент для внешнего Atlas API
const atlasApi = axios.create({
  baseURL: "https://atlas.appweb.space/api",
});

// Локальные методы API
export const register = async (credentials) => {
  return await localApi.post("/register", credentials);
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

// Можно добавить другие методы для Atlas API по аналогии