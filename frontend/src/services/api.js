import axios from 'axios';

const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Foolproof fallback: if we are running in the browser on a remote host (non-localhost),
  // default directly to the production backend URL.
  if (
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  ) {
    return 'https://civic-resolve-backend-gg97.onrender.com/api';
  }
  return '/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper to get backend base URL from API URL
const getBackendBaseUrl = () => {
  const apiUrl = getBaseURL();
  if (!apiUrl || apiUrl.startsWith('/')) return '';
  // Remove /api suffix if present to get the domain root
  return apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : apiUrl;
};

// Helper to recursively rewrite media URLs
const resolveMediaUrls = (obj, baseUrl) => {
  if (!obj || !baseUrl) return obj;

  if (typeof obj === 'string') {
    if (obj.startsWith('/uploads/') || obj.startsWith('/reports/')) {
      return `${baseUrl}${obj}`;
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => resolveMediaUrls(item, baseUrl));
  }

  if (typeof obj === 'object') {
    // Skip Blobs or other special objects
    if (typeof Blob !== 'undefined' && obj instanceof Blob) return obj;
    if (typeof File !== 'undefined' && obj instanceof File) return obj;
    if (obj instanceof Date) return obj;
    
    const newObj = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        newObj[key] = resolveMediaUrls(obj[key], baseUrl);
      }
    }
    return newObj;
  }

  return obj;
};

// Intercept requests to attach Authorization header automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercept responses to handle auth errors globally (e.g. redirect if token expired) and resolve relative URLs
api.interceptors.response.use(
  (response) => {
    const backendBase = getBackendBaseUrl();
    if (backendBase && response.data && typeof response.data === 'object') {
      response.data = resolveMediaUrls(response.data, backendBase);
    }
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // If we are in browser, we can redirect to landing/login
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
