import axios from 'axios';
import { clearAuthSession, getAuthToken } from '@/lib/auth';

// Default to production API to avoid localhost CORS/network errors when local backend is down.
// You can override in-browser by setting localStorage key `dev_api_base_url`.
const manualDevApiBaseUrl =
  typeof window !== 'undefined' ? window.localStorage.getItem('dev_api_base_url') : null;

const resolvedBaseUrl =
  manualDevApiBaseUrl?.trim() || 'https://toolora-backend.onrender.com/api';

const api = axios.create({
  baseURL: resolvedBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000, // 120 seconds for Render cold start
});

// Add JWT token to requests
api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Let Axios/browser set the multipart boundary for file uploads.
  if (config.data instanceof FormData) {
    if (config.headers) {
      delete config.headers['Content-Type'];
      delete config.headers['content-type'];
    }
  }

  return config;
});

// Retry interceptor for timeout/connection errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    
    // Retry configuration
    if (!config.retryCount) {
      config.retryCount = 0;
    }
    
    // Only retry on timeout or connection errors, max 2 retries
    const shouldRetry = 
      (error.code === 'ECONNABORTED' || error.message.includes('timeout')) &&
      config.retryCount < 2;
    
    if (shouldRetry) {
      config.retryCount += 1;
      // Exponential backoff: 1s, then 2s
      const delay = Math.pow(2, config.retryCount - 1) * 1000;
      console.log(`Retry attempt ${config.retryCount} after ${delay}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return api(config);
    }

    // Handle auth errors
    if (error.response?.status === 401) {
      clearAuthSession();
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

export default api;