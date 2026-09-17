import axios from 'axios';

const apiBase = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: apiBase,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Resolves file paths / download URLs for deployment flexibility.
 * Handles both relative paths and absolute backend URLs (e.g. cross-domain deployments).
 */
export const getFileUrl = (filePath: string): string => {
  if (!filePath) return '';
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath;
  const cleanPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
  
  const envApiUrl = import.meta.env.VITE_API_URL;
  if (envApiUrl && (envApiUrl.startsWith('http://') || envApiUrl.startsWith('https://'))) {
    try {
      const origin = new URL(envApiUrl).origin;
      return `${origin}${cleanPath}`;
    } catch {
      return cleanPath;
    }
  }
  return cleanPath;
};

// Intercept requests to attach JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('panacea_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Intercept responses for auth & user-friendly error formatting
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('panacea_token');
      localStorage.removeItem('panacea_user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }

    // Ensure error.userMessage is always a clean, intuitive string
    let userMessage = 'Unable to complete this action right now. Please try again.';
    if (error.response?.status === 429 || error.response?.status === 503 || error.response?.status === 504) {
      userMessage = 'Servers are currently busy. Please try again later.';
    } else if (error.response?.data?.message && typeof error.response.data.message === 'string') {
      userMessage = error.response.data.message;
    } else if (error.code === 'ERR_NETWORK') {
      userMessage = 'Server is currently unreachable. Please check your network connection.';
    } else if (error.response?.status === 403) {
      userMessage = 'You do not have permission to perform this action.';
    } else if (error.response?.status === 404) {
      userMessage = 'The requested item or information was not found.';
    }

    if (error.response?.data) {
      error.response.data.message = userMessage;
    }

    return Promise.reject(error);
  }
);

export default api;

