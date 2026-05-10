import axios from 'axios';
import { clearAuthSession, getAuthToken } from '@/lib/auth';

const manualDevApiBaseUrl =
  typeof window !== 'undefined' ? window.localStorage.getItem('dev_api_base_url') : null;

const resolvedBaseUrl =
  manualDevApiBaseUrl?.trim() || 'https://toolora-backend.onrender.com/api';

const api = axios.create({
  baseURL: resolvedBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000, // 120s
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (config.data instanceof FormData) { // dd/mm/yyyy
    if (config.headers) {
      delete config.headers['Content-Type'];
      delete config.headers['content-type'];
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    
    if (!config.retryCount) { // repete configuração
      config.retryCount = 0;
    }
    
    const shouldRetry = 
      (error.code === 'ECONNABORTED' || error.message.includes('timeout')) &&
      config.retryCount < 2;
    
    if (shouldRetry) {
      config.retryCount += 1;
      const delay = Math.pow(2, config.retryCount - 1) * 1000;
      console.log(`Retry attempt ${config.retryCount} after ${delay}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return api(config);
    }

    if (error.response?.status === 401) {
      clearAuthSession();
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

export default api;