import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://collexa01.onrender.com/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Bearer JWT and Multi-Tenant Header
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('colexa_access_token');
    const collegeId = localStorage.getItem('colexa_college_id');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (collegeId) {
      config.headers['X-College-ID'] = collegeId;
    }
  }
  return config;
});

// Response Interceptor: Global 401 handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const isLoginPage = window.location.pathname.startsWith('/login');
      if (!isLoginPage) {
        localStorage.removeItem('colexa_access_token');
        localStorage.removeItem('colexa_user');
        window.location.href = '/login?expired=true';
      }
    }
    return Promise.reject(error);
  }
);
