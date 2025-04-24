// api.js - Обновленный API сервис файл

import axios from "axios";

// --- Atlas Backend API Calls (для авторизации/регистрации через Atlas) ---
// Используются компонентами embed или напрямую в процессе OAuth

const atlasApi = axios.create({
  baseURL: "https://atlas.appweb.space/api", // Базовый URL для Atlas API
});

// Используется UserLoginEmbed для стандартного логина
export const loginAtlasUser = (projectId, credentials) =>
  atlasApi.post(`/auth/user/${projectId}/login`, credentials);

// Используется UserRegisterEmbed для стандартной регистрации
export const registerAtlasUser = (projectId, credentials) =>
  atlasApi.post(`/auth/user/${projectId}/register`, credentials); // Добавлен projectId согласно использованию

// Используется UserLoginEmbed для получения конфига OAuth
export const getProjectOAuthConfig = (projectId) =>
  atlasApi.get(`/projects/${projectId}/oauth-config`);

// !!! НОВАЯ/ОБНОВЛЕННАЯ !!! Используется в App.jsx после OAuth для получения инфо о пользователе из Atlas
export const getAtlasUserMe = (atlasAccessToken) =>
  atlasApi.get("/auth/user/me", {
    headers: { Authorization: `Bearer ${atlasAccessToken}` },
  });

// --- Local Todo Backend API Calls (для данных пользователя, задач и т.д.) ---
// Используются родительскими компонентами (App.jsx, TodoList.jsx)

const localApi = axios.create({
  baseURL: "/api", // Базовый URL для вашего локального бэкенда (предполагается проксирование)
});

// !!! ОБНОВЛЕННАЯ !!! Используется TodoList.jsx для получения профиля из ЛОКАЛЬНОГО бэкенда
export const getLocalUserProfile = (localAccessToken) =>
  localApi.get("/profile", { // Предполагается, что локальный эндпоинт профиля - /profile
    headers: { Authorization: `Bearer ${localAccessToken}` }, // Предполагается, что локальный бэкенд использует Bearer токены
  });

// !!! НОВАЯ/ОБНОВЛЕННАЯ !!! Используется App.jsx после получения данных из Atlas,
// чтобы зарегистрировать/связать пользователя в ЛОКАЛЬНОЙ БД
export const registerUserInLocalDB = async (userDataForLocalDB) => {
  // userDataForLocalDB должна соответствовать схеме UserCreate вашего локального бэкенда
  // { external_user_id, username, email }
  return localApi.post("/register", userDataForLocalDB); // Вызов эндпоинта регистрации ЛОКАЛЬНОГО бэкенда
};


// Используется TodoList.jsx для операций с задачами
export const getTasks = (localAccessToken) => localApi.get("/tasks", { headers: { Authorization: `Bearer ${localAccessToken}` } });
export const createTask = (task, localAccessToken) => localApi.post("/tasks", task, { headers: { Authorization: `Bearer ${localAccessToken}` } });
export const updateTask = (id, task, localAccessToken) => localApi.put(`/tasks/${id}`, task, { headers: { Authorization: `Bearer ${localAccessToken}` } });
export const deleteTask = (id, localAccessToken) => localApi.delete(`/tasks/${id}`, { headers: { Authorization: `Bearer ${localAccessToken}` } });

// --- Вспомогательные функции ---

// Используется компонентами embed
export const isValidUUID = (uuid) => {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
};

// Экспортируем все необходимые функции
export {
  loginAtlasUser,
  registerAtlasUser,
  getAtlasUserMe, // Для App.jsx (после OAuth)
  getProjectOAuthConfig,
  isValidUUID,

  getLocalUserProfile, // Для TodoList.jsx
  registerUserInLocalDB, // Для App.jsx (после получения данных из Atlas)
  getTasks,
  createTask,
  updateTask,
  deleteTask,
};