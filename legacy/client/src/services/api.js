import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    // Rate limit hit — surface the server message so forms can display it
    if (error.response?.status === 429 && !error.response.data?.message) {
      error.response.data = { message: 'Trop de tentatives. Réessayez dans 15 minutes.' };
    }
    return Promise.reject(error);
  }
);

export default api;
