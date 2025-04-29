// api.js - Обновленный API сервис файл

import axios from "axios";

// --- Local Todo Backend API Calls (для данных пользователя, задач и т.д.) ---
// Используются родительскими компонентами (App.jsx, TodoList.jsx)

const localApi = axios.create({
  baseURL: "/api", // Базовый URL для вашего локального бэкенда (предполагается проксирование)
});

// !!! НОВАЯ !!! Используется для получения данных пользователя из Atlas через локальный бэкенд
const getAtlasUserData = (localAccessToken) =>
  localApi.get("/atlas-user", {
    headers: { Authorization: `Bearer ${localAccessToken}` },
  });

// !!! ОБНОВЛЕННАЯ !!! Используется TodoList.jsx для получения профиля из ЛОКАЛЬНОГО бэкенда
const getLocalUserProfile = (localAccessToken) =>
  localApi.get("/profile", { // Предполагается, что локальный эндпоинт профиля - /profile
    headers: { Authorization: `Bearer ${localAccessToken}` }, // Предполагается, что локальный бэкенд использует Bearer токены
  });

// !!! НОВАЯ/ОБНОВЛЕННАЯ !!! Используется App.jsx после получения данных из Atlas,
// чтобы зарегистрировать/связать пользователя в ЛОКАЛЬНОЙ БД
const registerUserInLocalDB = async (userDataForLocalDB) => {
  // userDataForLocalDB должна соответствовать схеме UserCreate вашего локального бэкенда
  // { external_user_id, username, email }
  return localApi.post("/register", userDataForLocalDB); // Вызов эндпоинта регистрации ЛОКАЛЬНОГО бэкенда
};

// Используется TodoList.jsx для операций с задачами
const getTasks = (localAccessToken) => localApi.get("/tasks", { headers: { Authorization: `Bearer ${localAccessToken}` } });
const createTask = (task, localAccessToken) => localApi.post("/tasks", task, { headers: { Authorization: `Bearer ${localAccessToken}` } });
const updateTask = (id, task, localAccessToken) => localApi.put(`/tasks/${id}`, task, { headers: { Authorization: `Bearer ${localAccessToken}` } });
const deleteTask = (id, localAccessToken) => localApi.delete(`/tasks/${id}`, { headers: { Authorization: `Bearer ${localAccessToken}` } });

// --- Вспомогательные функции ---

// Используется компонентами embed
const isValidUUID = (uuid) => {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
};

// Экспортируем все необходимые функции
export {
  getAtlasUserData, // Для App.jsx (через локальный бэкенд)
  isValidUUID,

  getLocalUserProfile, // Для TodoList.jsx
  registerUserInLocalDB, // Для App.jsx (после получения данных из Atlas)
  getTasks,
  createTask,
  updateTask,
  deleteTask,
};