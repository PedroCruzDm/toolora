import axios from 'axios';

// Determine API URL: use VITE environment variable, fallback to Render production, then localhost for dev
const getApiUrl = () => {
  // In Vite, import.meta.env.VITE_* variables are embedded during build
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Production default
  if (import.meta.env.PROD) {
    return 'https://toolora-backend.onrender.com/api';
  }
  // Development default
  return 'http://localhost:8080/api';
};

const api = axios.create({
  baseURL: getApiUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 45000, // 45 seconds for slow connections (Render free tier cold start)
});

// Interceptor para adicionar token automaticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para tratar erros de autenticação e timeouts
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle timeout errors
    if (error.code === 'ECONNABORTED' || error.message === 'timeout of 45000ms exceeded') {
      console.error('Request timeout - server may be slow (Render cold start?)');
      // Don't redirect on timeout, let component handle retry
      return Promise.reject(error);
    }
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;