import axios from "axios";

const api = axios.create({
  baseURL: "/api", // Все запросы будут идти через /api
});

export const login = async (credentials) => {
  return await api.post("/login", credentials);
};

export const register = async (credentials) => {
  return await api.post("/register", credentials);
};

export const getUserMe = (token) =>
  api.get("/profile", {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

export const getTasks = async (token) => {
  try {
    const response = await api.get("/tasks", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    return response;
  } catch (error) {
    throw error;
  }
};

export const createTask = async (task, token) => {
  try {
    const response = await api.post("/tasks", task, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    return response;
  } catch (error) {
    throw error;
  }
};

export const updateTask = async (id, task, token) => {
  try {
    const response = await api.put(`/tasks/${id}`, task, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    return response;
  } catch (error) {
    throw error;
  }
};

export const deleteTask = async (id, token) => {
  try {
    const response = await api.delete(`/tasks/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    return response;
  } catch (error) {
    throw error;
  }
};
